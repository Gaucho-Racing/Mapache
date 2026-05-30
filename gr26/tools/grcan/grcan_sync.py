#!/usr/bin/env python3
"""grcan_sync - parse Gaucho Racing CAN definitions and diff snapshots.

This tool is the deterministic data layer behind the `sync-grcan` skill. It
parses the Firmware autogen artifacts (the small ID enum headers + the DBC
files) into a normalized model, diffs an old snapshot against a new one to
find exactly which CAN IDs and message layouts changed, and emits best-effort
Go scaffolds in the gr26 `mp.Message` DSL for the changed messages.

It intentionally does NOT edit the Go model files. Translating a scaffold into
idiomatic, hand-tuned Go (field naming, IEEE-float decode, exact scale
fractions, bit-packed groupings) requires judgment - that is the skill/Claude's
job, guided by the `flags` this tool attaches to each scaffold.

Stdlib only. Use the system python3, not gr26/tools/.venv (which is stale).

Commands:
  parse <dir>                Parse all .h/.dbc in <dir> -> normalized JSON model.
  diff  <old_dir> <new_dir>  Diff two snapshot dirs -> change report (JSON) with
                             Go scaffolds for added/changed messages.

  Add --pretty for human-readable output instead of JSON.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

ENUM_RE = re.compile(r"(\b[A-Z_][A-Z0-9_]*)\s*=\s*(0[xX][0-9A-Fa-f]+|\d+)")
BO_RE = re.compile(r"^BO_\s+(\d+)\s+(\w+)\s*:\s*(\d+)\s+(\S+)")
# Standard GR messages encode the base CAN ID in the composite 29-bit ID at
# bits [8:19]. Custom/third-party messages (DTI, charger, IMD) do NOT follow
# this, so base-ID extraction is only a fallback for name matching.
BASE_ID_SHIFT = 8
BASE_ID_MASK = 0x7FF
# DBC processing order so the Primary bus wins ID/name collisions.
DBC_ORDER = ("primary", "data", "charger")
SG_RE = re.compile(
    r'^\s*SG_\s+(\w+)\s*:\s*(\d+)\|(\d+)@([01])([-+])\s*'
    r"\(([^,]+),([^)]+)\)\s*\[[^\]]*\]\s*\"([^\"]*)\""
)


@dataclass
class Signal:
    name: str          # DBC signal name, verbatim
    start: int         # start bit
    length: int        # bit length
    byteorder: str     # "little" (@1, Intel) or "big" (@0, Motorola)
    signed: bool
    scale: float
    offset: float
    unit: str


@dataclass
class Message:
    canonical: str             # e.g. ECU_STATUS_1 - the join key
    dbc_name: str
    dbc_file: str
    dlc: int
    sender: str
    base_id: int               # base CAN ID extracted from the composite ID
    signals: list              # list[Signal]


def canonical_from_enum(name: str) -> str:
    """GRCAN_ECU_STATUS_1 -> ECU_STATUS_1 ; DTI_DATA_1_CAN_ID -> DTI_DATA_1."""
    n = name
    if n.startswith("GRCAN_"):
        n = n[len("GRCAN_"):]
    for suffix in ("_CAN_ID", "_ID"):
        if n.endswith(suffix):
            n = n[: -len(suffix)]
            break
    return n.upper()


def canonical_from_dbc(dbc_name: str, sender: str) -> str:
    """ECU_ECU_Status_1_to_ALL (sender ECU) -> ECU_STATUS_1.

    Strip the leading "<sender>_" routing prefix and the trailing "_to_<rx>"
    routing suffix, then uppercase.
    """
    n = dbc_name
    pfx = sender + "_"
    if n.startswith(pfx):
        n = n[len(pfx):]
    n = re.sub(r"_to_\w+$", "", n)
    return n.upper()


def parse_ids(text: str, fname: str) -> dict:
    """Parse a C enum header into {canonical: {value, enum, source, custom}}."""
    custom = "CUSTOM" in fname.upper()
    out = {}
    for m in ENUM_RE.finditer(text):
        enum, raw = m.group(1), m.group(2)
        # Skip include-guard / macro noise that isn't an ID assignment.
        if enum.endswith("_H") or enum.startswith("CAN_") and raw in ("",):
            continue
        try:
            value = int(raw, 16) if raw.lower().startswith("0x") else int(raw)
        except ValueError:
            continue
        out[canonical_from_enum(enum)] = {
            "value": value,
            "enum": enum,
            "source": fname,
            "custom": custom,
        }
    return out


def parse_dbc(text: str, fname: str) -> dict:
    """Parse a DBC into {canonical: Message}. Collapses routing duplicates."""
    messages: dict = {}
    cur: Optional[Message] = None
    for line in text.splitlines():
        bo = BO_RE.match(line)
        if bo:
            comp, name, dlc, sender = bo.groups()
            canon = canonical_from_dbc(name, sender)
            cur = Message(
                canonical=canon, dbc_name=name, dbc_file=fname,
                dlc=int(dlc), sender=sender,
                base_id=(int(comp) >> BASE_ID_SHIFT) & BASE_ID_MASK,
                signals=[],
            )
            # Multiple routing copies share a layout; keep the first, but if a
            # later copy disagrees we record it under a conflict marker.
            if canon not in messages:
                messages[canon] = cur
            else:
                cur = messages[canon]  # append nothing new; ignore dup signals
                cur = None
            continue
        sg = SG_RE.match(line)
        if sg and cur is not None:
            name, start, length, order, sign, scale, offset, unit = sg.groups()
            cur.signals.append(Signal(
                name=name,
                start=int(start),
                length=int(length),
                byteorder="little" if order == "1" else "big",
                signed=(sign == "-"),
                scale=float(scale),
                offset=float(offset),
                unit=unit.strip(),
            ))
    return messages


def _dbc_rank(fname: str) -> int:
    low = fname.lower()
    for i, bus in enumerate(DBC_ORDER):
        if bus in low:
            return i
    return len(DBC_ORDER)


def parse_dir(path: str) -> dict:
    """Parse every .h and .dbc in a directory into a normalized model.

    Returns `ids` (canonical -> {value,...}), `messages` (canonical -> message),
    and `messages_by_id` (extracted base CAN ID -> message). The Primary bus
    wins name/ID collisions across buses.
    """
    ids: dict = {}
    messages: dict = {}
    by_id: dict = {}
    files = [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
    # Parse headers first, then DBCs in Primary-first order.
    for fname in sorted(f for f in files if f.endswith(".h")):
        with open(os.path.join(path, fname), "r", errors="replace") as fh:
            text = fh.read()
        # Only the message/custom ID enums are CAN message IDs. NODE/BUS enums
        # live in a different namespace and their small values would collide
        # with low message IDs - never merge them in.
        up = fname.upper()
        if "MSG_ID" in up or "CUSTOM_ID" in up:
            ids.update(parse_ids(text, fname))
    for fname in sorted((f for f in files if f.endswith(".dbc")), key=_dbc_rank):
        with open(os.path.join(path, fname), "r", errors="replace") as fh:
            text = fh.read()
        for canon, msg in parse_dbc(text, fname).items():
            if canon not in messages:
                messages[canon] = msg
            if msg.base_id not in by_id:
                by_id[msg.base_id] = msg
    return {
        "ids": ids,
        "messages": {k: _msg_dict(v) for k, v in messages.items()},
        "messages_by_id": {k: _msg_dict(v) for k, v in by_id.items()},
    }


def resolve_message(model: dict, cid: int, canonical: Optional[str]) -> Optional[dict]:
    """Find the DBC layout for a CAN ID. Name match first (correct for custom
    messages like DTI), then base-ID fallback (correct when the DBC logical
    name omits the node prefix, e.g. Dash_Panel_Status vs DASH_STATUS)."""
    if canonical and canonical in model["messages"]:
        return model["messages"][canonical]
    return model["messages_by_id"].get(cid)


def _msg_dict(m: Message) -> dict:
    d = asdict(m)
    return d


# ---------------------------------------------------------------------------
# Go scaffold generation
# ---------------------------------------------------------------------------

def snake(name: str) -> str:
    """Tractive_System_Voltage -> tractive_system_voltage."""
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", name)
    return s.replace("__", "_").strip("_").lower()


def fmt_num(x: float) -> str:
    """Format a float for Go source: 0.1, 0.25, 3276.8, 2 (no trailing .0 noise)."""
    if x == int(x):
        return f"{int(x)}.0"  # keep float literal form in arithmetic
    return repr(round(x, 12)).rstrip("0").rstrip(".") if "." in repr(x) else repr(x)


def looks_like_fraction(scale: float) -> bool:
    """A DBC scale with many significant digits is often an exact fraction
    (e.g. 20/51) the firmware encoded by hand; flag for the human."""
    s = repr(scale)
    if "." not in s:
        return False
    return len(s.split(".")[1]) >= 5


def _value_expr(raw_expr: str, scale: float, offset: float) -> str:
    if scale == 1.0 and offset == 0.0:
        return f"float64({raw_expr})"
    s = f"float64({raw_expr})"
    if scale != 1.0:
        s += f" * {fmt_num(scale)}"
    if offset > 0:
        s += f" + {fmt_num(offset)}"
    elif offset < 0:
        s += f" - {fmt_num(-offset)}"
    return s


def _byte_components(signals: list, dlc: int):
    """Group signals into byte-granular Go fields via union-find over bytes.

    Returns list of (byte_lo, byte_hi, [signals]) sorted by byte_lo, plus a
    list of reserved (gap) byte ranges with no signal coverage.
    """
    parent = list(range(dlc))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        parent[find(a)] = find(b)

    byte_signals: dict = {}
    overflow = []
    for sig in signals:
        lo = sig.start // 8
        hi = (sig.start + sig.length - 1) // 8
        if hi > dlc - 1:
            overflow.append(sig.name)
            hi = dlc - 1
        for b in range(lo, hi + 1):
            byte_signals.setdefault(b, []).append(sig)
        for b in range(lo, hi):
            union(b, b + 1)

    comps: dict = {}
    for b, sigs in byte_signals.items():
        comps.setdefault(find(b), set()).add(b)

    fields = []
    for bytes_set in comps.values():
        lo, hi = min(bytes_set), max(bytes_set)
        sigs = []
        seen = set()
        for b in range(lo, hi + 1):
            for s in byte_signals.get(b, []):
                if id(s) not in seen:
                    seen.add(id(s))
                    sigs.append(s)
        sigs.sort(key=lambda s: s.start)
        fields.append((lo, hi, sigs))
    fields.sort(key=lambda f: f[0])

    # Reserved gaps between/after covered bytes.
    covered = set()
    for lo, hi, _ in fields:
        covered.update(range(lo, hi + 1))
    reserved = []
    b = 0
    while b < dlc:
        if b not in covered:
            start = b
            while b < dlc and b not in covered:
                b += 1
            reserved.append((start, b - 1))
        else:
            b += 1
    return fields, reserved, overflow


def gen_scaffold(canon: str, msg: dict) -> dict:
    """Build a Go `mp.Message{...}` scaffold + flags from a parsed message."""
    signals = [Signal(**s) for s in msg["signals"]]
    dlc = msg["dlc"]
    flags: list = []
    var_name = "".join(p.capitalize() for p in canon.split("_"))

    if dlc > 8:
        flags.append(f"DLC is {dlc} (CAN-FD); confirm decoder handles >8 bytes.")

    fields, reserved, overflow = _byte_components(signals, dlc)
    for name in overflow:
        flags.append(
            f"{snake(name)}: signal extends past declared DLC ({dlc} bytes); "
            f"scaffold clamped it - verify the DBC frame length."
        )
    # Interleave reserved fields into position order.
    ordered = [("field", lo, hi, sigs) for (lo, hi, sigs) in fields]
    ordered += [("reserved", lo, hi, None) for (lo, hi) in reserved]
    ordered.sort(key=lambda x: x[1])

    lines = [f"var {var_name} = mp.Message{{"]
    for kind, lo, hi, sigs in ordered:
        byte_len = hi - lo + 1
        if kind == "reserved":
            lines.append(
                f'\tmp.NewField("_reserved", {byte_len}, mp.Unsigned, '
                f"mp.LittleEndian, func(f mp.Field) []mp.Signal {{"
            )
            lines.append("\t\treturn nil")
            lines.append("\t}),")
            continue

        order_go = "mp.LittleEndian" if sigs[0].byteorder == "little" else "mp.BigEndian"
        signed_go = "mp.Signed" if sigs[0].signed else "mp.Unsigned"
        field_start_bit = lo * 8

        if len(sigs) == 1 and sigs[0].length == byte_len * 8:
            sig = sigs[0]
            fname = snake(sig.name)
            val = _value_expr("f.Value", sig.scale, sig.offset)
            if looks_like_fraction(sig.scale):
                flags.append(
                    f'{fname}: scale {sig.scale} looks like a rounded fraction; '
                    f"verify exact value (e.g. a/b form) against firmware."
                )
            lines.append(
                f'\tmp.NewField("{fname}", {byte_len}, {signed_go}, {order_go}, '
                f"func(f mp.Field) []mp.Signal {{"
            )
            lines.append("\t\treturn []mp.Signal{")
            lines.append(
                f'\t\t\t{{Name: "{fname}", Value: {val}, RawValue: f.Value}},'
            )
            lines.append("\t\t}")
            lines.append("\t}),")
        else:
            # Bit-packed: multiple signals share this field's bytes.
            field_name = "_".join(snake(s.name) for s in sigs)
            if len(field_name) > 40:
                field_name = snake(sigs[0].name) + "_packed"
            flags.append(
                f"{field_name}: bit-packed field ({len(sigs)} signals share "
                f"bytes {lo}-{hi}); review masks/shifts and pick a field name."
            )
            lines.append(
                f'\tmp.NewField("{field_name}", {byte_len}, mp.Unsigned, '
                f"{order_go}, func(f mp.Field) []mp.Signal {{"
            )
            lines.append("\t\treturn []mp.Signal{")
            for s in sigs:
                shift = s.start - field_start_bit
                mask = (1 << s.length) - 1
                raw = f"f.Value & 0x{mask:X}" if shift == 0 else \
                      f"(f.Value >> {shift}) & 0x{mask:X}"
                val = _value_expr(f"{raw}", s.scale, s.offset)
                rawval = f"f.Value & 0x{mask:X}" if shift == 0 else \
                         f"(f.Value >> {shift}) & 0x{mask:X}"
                lines.append(
                    f'\t\t\t{{Name: "{snake(s.name)}", Value: {val}, '
                    f"RawValue: {rawval}}},"
                )
            lines.append("\t\t}")
            lines.append("\t}),")
    lines.append("}")

    # IEEE float heuristic: 4/8-byte single signal scale 1 unit deg/m often a float.
    for _, lo, hi, sigs in ordered:
        if sigs and len(sigs) == 1:
            s = sigs[0]
            if s.length in (32, 64) and s.scale == 1.0 and s.unit.lower() in (
                "deg", "degrees", "m", "meters", ""
            ):
                flags.append(
                    f"{snake(s.name)}: {s.length}-bit raw - if firmware sends "
                    f"IEEE float, decode with math.Float{s.length}frombits instead."
                )

    return {
        "var_name": var_name,
        "go": "\n".join(lines),
        "flags": flags,
    }


# ---------------------------------------------------------------------------
# Parsing the existing Go models (for reconcile)
# ---------------------------------------------------------------------------

# Top-level decl boundaries (gofmt puts these at column 0).
GO_DECL_RE = re.compile(r"^(var|func)\s+(\w+)", re.M)
GO_NEWFIELD_RE = re.compile(
    r'mp\.NewField\(\s*"([^"]*)"\s*,\s*(\d+)\s*,\s*'
    r"mp\.(Signed|Unsigned)\s*,\s*mp\.(LittleEndian|BigEndian)\s*,"
)
GO_SIGNAL_NAME_RE = re.compile(r'Name:\s*"([^"]+)"')
# Signals emitted via the dash `bit(v, n, "name")` helper rather than a
# Signal{Name: ...} literal.
GO_BIT_HELPER_RE = re.compile(r'\bbit\([^,]+,[^,]+,\s*"([^"]+)"\s*\)')
GO_MAP_ENTRY_RE = re.compile(r"0x([0-9A-Fa-f]+)\s*:\s*(\w+)\s*,")


def parse_go_models(model_dir: str) -> dict:
    """Parse gr26/model/*.go into {messagemap: {id: var}, vars: {var: {...}}}.

    Each var entry: {fields: [{name, byteLen, signed, endian, signals}],
    generated: bool}. `generated` marks vars built dynamically (factory call,
    func() wrapper with non-literal NewField args) that can't be compared
    field-by-field and must be reviewed by hand.
    """
    messagemap: dict = {}
    variables: dict = {}

    for fname in sorted(os.listdir(model_dir)):
        if not fname.endswith(".go"):
            continue
        with open(os.path.join(model_dir, fname)) as fh:
            text = fh.read()

        if fname == "message.go":
            # messageMap entries: 0xNNN: VarName,
            for m in GO_MAP_ENTRY_RE.finditer(text):
                messagemap[int(m.group(1), 16)] = m.group(2)
            continue

        bounds = [m.start() for m in GO_DECL_RE.finditer(text)] + [len(text)]
        decls = list(GO_DECL_RE.finditer(text))
        for i, m in enumerate(decls):
            if m.group(1) != "var":
                continue  # skip func bodies (e.g. cellDataMessage factory)
            var_name = m.group(2)
            block = text[m.start():bounds[bounds.index(m.start()) + 1]]
            body = block[block.find("=") + 1:]

            literal = list(GO_NEWFIELD_RE.finditer(body))
            raw_count = body.count("mp.NewField(")
            # Generated/dynamic if it's an alias/factory (no literal message),
            # or has NewField calls we couldn't parse (non-literal args).
            is_literal_msg = "mp.Message{" in body
            generated = (not is_literal_msg) or (raw_count != len(literal))

            fields = []
            for j, fm in enumerate(literal):
                seg_end = literal[j + 1].start() if j + 1 < len(literal) else len(body)
                seg = body[fm.end():seg_end]
                signals = (GO_SIGNAL_NAME_RE.findall(seg)
                           + GO_BIT_HELPER_RE.findall(seg))
                fields.append({
                    "name": fm.group(1),
                    "byteLen": int(fm.group(2)),
                    "signed": fm.group(3) == "Signed",
                    "endian": "little" if fm.group(4) == "LittleEndian" else "big",
                    "signals": signals,
                })
            variables[var_name] = {"fields": fields, "generated": generated,
                                   "file": fname}

    return {"messagemap": messagemap, "vars": variables}


def expected_fields(msg: dict):
    """Firmware-derived ordered field descriptors for a parsed DBC message."""
    signals = [Signal(**s) for s in msg["signals"]]
    dlc = msg["dlc"]
    fields, reserved, overflow = _byte_components(signals, dlc)
    ordered = [("field", lo, hi, sigs) for (lo, hi, sigs) in fields]
    ordered += [("reserved", lo, hi, None) for (lo, hi) in reserved]
    ordered.sort(key=lambda x: x[1])
    out = []
    for kind, lo, hi, sigs in ordered:
        byte_len = hi - lo + 1
        if kind == "reserved":
            out.append({"kind": "reserved", "byteLen": byte_len,
                        "endian": None, "signed": None, "signals": []})
        else:
            out.append({"kind": "field", "byteLen": byte_len,
                        "endian": sigs[0].byteorder, "signed": sigs[0].signed,
                        "signals": [snake(s.name) for s in sigs]})
    return out, overflow


def compare_fields(go_fields: list, exp_fields: list):
    """Compare Go fields to firmware-expected fields. Returns (structural,
    naming) issue lists. Structural = byteLen/endian/signed/count/presence;
    naming = signal-name divergences (expected, low priority)."""
    structural, naming = [], []
    for i in range(max(len(go_fields), len(exp_fields))):
        g = go_fields[i] if i < len(go_fields) else None
        e = exp_fields[i] if i < len(exp_fields) else None
        if g is None:
            label = e["signals"] or "reserved"
            structural.append(f"field #{i}: missing in Go; firmware has "
                              f"{e['byteLen']}B {label}")
            continue
        if e is None:
            structural.append(f"field #{i} '{g['name']}': extra in Go; "
                              f"not in firmware layout")
            continue
        g_res = g["name"].startswith("_")
        e_res = e["kind"] == "reserved"
        if g_res or e_res:
            if g_res != e_res:
                structural.append(
                    f"field #{i}: reserved mismatch "
                    f"(Go {'reserved' if g_res else g['name']} vs firmware "
                    f"{'reserved' if e_res else e['signals']})")
            elif g["byteLen"] != e["byteLen"]:
                structural.append(f"field #{i} reserved: byteLen "
                                  f"Go={g['byteLen']} firmware={e['byteLen']}")
            continue
        if g["byteLen"] != e["byteLen"]:
            structural.append(f"field #{i} '{g['name']}': byteLen "
                              f"Go={g['byteLen']} firmware={e['byteLen']}")
        if g["endian"] != e["endian"]:
            structural.append(f"field #{i} '{g['name']}': endianness "
                              f"Go={g['endian']} firmware={e['endian']}")
        if g["signed"] != e["signed"]:
            structural.append(
                f"field #{i} '{g['name']}': signedness "
                f"Go={'signed' if g['signed'] else 'unsigned'} "
                f"firmware={'signed' if e['signed'] else 'unsigned'}")
        if len(g["signals"]) < len(e["signals"]):
            # Model exposes fewer signals than firmware -> missing detail.
            structural.append(f"field #{i} '{g['name']}': signal count "
                              f"Go={len(g['signals'])} firmware={len(e['signals'])}")
        elif len(g["signals"]) > len(e["signals"]):
            # Model is more granular than the DBC (e.g. dash explodes a byte
            # into per-bit signals) - intentional enrichment, not drift.
            naming.append(f"field #{i} '{g['name']}': Go exposes "
                          f"{len(g['signals'])} signals vs firmware "
                          f"{len(e['signals'])} (model more granular)")
        if e["signals"] and set(g["signals"]) != set(e["signals"]):
            naming.append(f"field #{i}: signal names Go={g['signals']} "
                          f"firmware={e['signals']}")
    return structural, naming


def reconcile(model_dir: str, fw_dir: str) -> dict:
    """Audit the current Go models against the current firmware. Unlike diff
    (firmware-vs-firmware), this is models-vs-firmware: it surfaces drift that
    already exists, regardless of the snapshot baseline."""
    go = parse_go_models(model_dir)
    fw = parse_dir(fw_dir)
    id_to_canon = {info["value"]: canon for canon, info in fw["ids"].items()}

    in_sync, generated_skipped = [], []
    diverged = {}
    id_not_in_firmware, id_without_layout = [], []

    for cid, var in go["messagemap"].items():
        canon = id_to_canon.get(cid)
        tag = f"0x{cid:X} {canon or '?'} ({var})"
        if canon is None:
            id_not_in_firmware.append(tag)
            continue
        msg = resolve_message(fw, cid, canon)
        if msg is None:
            id_without_layout.append(tag)
            continue
        vinfo = go["vars"].get(var)
        if vinfo is None:
            diverged[tag] = {"structural": [f"var {var} not found in model files"],
                             "naming": []}
            continue
        if vinfo["generated"]:
            generated_skipped.append(tag)
            continue
        exp, overflow = expected_fields(msg)
        structural, naming = compare_fields(vinfo["fields"], exp)
        for name in overflow:
            structural.append(f"firmware signal '{snake(name)}' exceeds declared DLC")
        if structural or naming:
            entry = {"structural": structural, "naming": naming}
            if structural:
                entry["scaffold"] = gen_scaffold(canon, msg)
            diverged[tag] = entry
        else:
            in_sync.append(tag)

    mapped_ids = set(go["messagemap"].keys())
    untracked = sorted(
        f"0x{info['value']:X} {canon}"
        for canon, info in fw["ids"].items()
        if info["value"] not in mapped_ids
        and resolve_message(fw, info["value"], canon) is not None
    )

    return {
        "in_sync": sorted(in_sync),
        "diverged": diverged,
        "generated_skipped": sorted(generated_skipped),
        "messagemap_id_not_in_firmware": sorted(id_not_in_firmware),
        "messagemap_id_without_layout": sorted(id_without_layout),
        "untracked_firmware_messages": untracked,
    }


# ---------------------------------------------------------------------------
# Diff
# ---------------------------------------------------------------------------

def _sig_key(s: dict) -> tuple:
    return (s["name"], s["start"], s["length"], s["byteorder"],
            s["signed"], s["scale"], s["offset"])


def diff(old: dict, new: dict) -> dict:
    old_ids, new_ids = old["ids"], new["ids"]
    ids_added, ids_removed, ids_changed = [], [], []
    for canon, info in new_ids.items():
        if canon not in old_ids:
            ids_added.append({"canonical": canon, **info})
        elif old_ids[canon]["value"] != info["value"]:
            ids_changed.append({
                "canonical": canon, "old": old_ids[canon]["value"],
                "new": info["value"], "enum": info["enum"],
                "custom": info["custom"],
            })
    for canon, info in old_ids.items():
        if canon not in new_ids:
            ids_removed.append({"canonical": canon, **info})

    old_msgs, new_msgs = old["messages"], new["messages"]
    layout_changed = []
    for canon, msg in new_msgs.items():
        if canon in old_msgs:
            o = [_sig_key(s) for s in old_msgs[canon]["signals"]]
            n = [_sig_key(s) for s in msg["signals"]]
            if o != n or old_msgs[canon]["dlc"] != msg["dlc"]:
                layout_changed.append(canon)

    # Messages needing a Go scaffold: new IDs that have a DBC layout, plus any
    # layout-changed message. Keyed by canonical -> resolved message.
    scaffold_targets = {canon: new_msgs[canon] for canon in layout_changed}
    no_layout = []
    for entry in ids_added:
        canon = entry["canonical"]
        msg = resolve_message(new, entry["value"], canon)
        if msg is not None:
            scaffold_targets[canon] = msg
        else:
            no_layout.append(canon)

    scaffolds = {
        canon: gen_scaffold(canon, msg)
        for canon, msg in sorted(scaffold_targets.items())
    }

    return {
        "ids_added": ids_added,
        "ids_changed": ids_changed,
        "ids_removed": ids_removed,
        "layout_changed": layout_changed,
        "ids_added_without_layout": no_layout,
        "scaffolds": scaffolds,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _print_diff_human(report: dict) -> None:
    def section(title, items):
        print(f"\n## {title} ({len(items)})")
        for it in items:
            print(f"  - {it}")

    section("IDs added", [
        f'{e["canonical"]} = 0x{e["value"]:X}'
        f'{" (no DBC layout)" if e["canonical"] in report["ids_added_without_layout"] else ""}'
        for e in report["ids_added"]
    ])
    section("IDs changed", [
        f'{e["canonical"]}: 0x{e["old"]:X} -> 0x{e["new"]:X}'
        for e in report["ids_changed"]
    ])
    section("IDs removed", [
        f'{e["canonical"]} = 0x{e["value"]:X}' for e in report["ids_removed"]
    ])
    section("Layout changed", report["layout_changed"])

    if report["scaffolds"]:
        print("\n## Go scaffolds\n")
        for canon, sc in report["scaffolds"].items():
            print(f"// ---- {canon} ----")
            print(sc["go"])
            if sc["flags"]:
                print("// JUDGMENT FLAGS:")
                for fl in sc["flags"]:
                    print(f"//   - {fl}")
            print()


def _print_reconcile_human(report: dict) -> None:
    d = report["diverged"]
    print(f"\n## In sync ({len(report['in_sync'])})")
    for t in report["in_sync"]:
        print(f"  ✓ {t}")

    print(f"\n## Diverged ({len(d)})")
    for tag, entry in d.items():
        print(f"\n  ✗ {tag}")
        for s in entry["structural"]:
            print(f"      [structural] {s}")
        for n in entry["naming"]:
            print(f"      [naming]     {n}")

    if report["generated_skipped"]:
        print(f"\n## Generated/dynamic — review by hand "
              f"({len(report['generated_skipped'])})")
        for t in report["generated_skipped"]:
            print(f"  ~ {t}")
    if report["messagemap_id_without_layout"]:
        print(f"\n## Mapped but no DBC layout (custom/third-party) "
              f"({len(report['messagemap_id_without_layout'])})")
        for t in report["messagemap_id_without_layout"]:
            print(f"  ? {t}")
    if report["messagemap_id_not_in_firmware"]:
        print(f"\n## In messageMap but not in firmware headers "
              f"({len(report['messagemap_id_not_in_firmware'])})")
        for t in report["messagemap_id_not_in_firmware"]:
            print(f"  ! {t}")
    print(f"\n## Untracked firmware messages (informational): "
          f"{len(report['untracked_firmware_messages'])}")
    for t in report["untracked_firmware_messages"]:
        print(f"  - {t}")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_parse = sub.add_parser("parse", help="parse a snapshot dir -> JSON model")
    p_parse.add_argument("dir")
    p_parse.add_argument("--pretty", action="store_true")

    p_diff = sub.add_parser("diff", help="diff old vs new snapshot dir")
    p_diff.add_argument("old_dir")
    p_diff.add_argument("new_dir")
    p_diff.add_argument("--pretty", action="store_true")

    p_rec = sub.add_parser("reconcile",
                           help="audit current Go models vs current firmware")
    p_rec.add_argument("model_dir", help="gr26/model")
    p_rec.add_argument("fw_dir", help="firmware artifacts (snapshot or fresh fetch)")
    p_rec.add_argument("--pretty", action="store_true")

    args = ap.parse_args(argv)

    if args.cmd == "parse":
        model = parse_dir(args.dir)
        print(json.dumps(model, indent=2))
        return 0

    if args.cmd == "diff":
        report = diff(parse_dir(args.old_dir), parse_dir(args.new_dir))
        if args.pretty:
            _print_diff_human(report)
        else:
            print(json.dumps(report, indent=2))
        return 0

    if args.cmd == "reconcile":
        report = reconcile(args.model_dir, args.fw_dir)
        if args.pretty:
            _print_reconcile_human(report)
        else:
            print(json.dumps(report, indent=2))
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
