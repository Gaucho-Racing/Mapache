"""Tests for the MQL parser (query_lang.py) — current method-chain grammar.

Covers the tokenizer's tricky cases (intervals vs numbers, negatives, escaped
strings), every method (where/by/every/reject/fill), membership and negation,
the `-> name` label, reject precedence + ranges, error column positions, and the
renamed-method migration error.
"""

import pytest

from query.service.query_lang import (
    Predicate,
    QueryParseError,
    RejectBool,
    RejectCmp,
    RejectRange,
    _tokenize,
    parse,
)


def _err(s: str) -> QueryParseError:
    with pytest.raises(QueryParseError) as ei:
        parse(s)
    return ei.value


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------


def test_tokenize_interval_vs_number():
    # `100ms`/`3s` must lex as single interval tokens, not number + ident.
    kinds = [(t.kind, t.value) for t in _tokenize("100ms 3 3.5 3s")]
    assert kinds == [
        ("interval", "100ms"),
        ("number", "3"),
        ("number", "3.5"),
        ("interval", "3s"),
    ]


def test_tokenize_negative_number():
    toks = _tokenize("value > -3.5")
    assert [(t.kind, t.value) for t in toks] == [
        ("ident", "value"),
        ("op", ">"),
        ("number", "-3.5"),
    ]


def test_tokenize_escaped_string_strips_quotes_keeps_escape():
    # The tokenizer strips the surrounding quotes but preserves the inner
    # backslash escape verbatim (the grammar defines no unescaping).
    (tok,) = _tokenize(r'"ecu\"x"')
    assert tok.kind == "string"
    assert tok.value == r"ecu\"x"


def test_tokenize_two_char_ops_before_single():
    assert [t.value for t in _tokenize(">= <= != > < =")] == [
        ">=",
        "<=",
        "!=",
        ">",
        "<",
        "=",
    ]


def test_tokenize_unexpected_character_position():
    e = _err("count(signal) @")
    assert "unexpected character" in str(e)
    assert e.position == 14


# ---------------------------------------------------------------------------
# Aggregator head
# ---------------------------------------------------------------------------


def test_minimal_count_signal():
    q = parse("count(signal)")
    assert q.fn == "count"
    assert q.field == "signal"
    assert q.filters == ()
    assert q.group_by == ()
    assert q.label is None


def test_numeric_fn_requires_numeric_field():
    e = _err("avg(signal)")
    assert "numeric field" in str(e)


def test_count_rejects_numeric_field():
    e = _err("count(value)")
    assert "operates on rows" in str(e)


def test_unknown_function():
    e = _err("median(value)")
    assert "unknown function" in str(e)
    assert e.position == 0


def test_unknown_field():
    e = _err("avg(speed)")
    assert "unknown field" in str(e)


# ---------------------------------------------------------------------------
# .where — equality, membership, negation
# ---------------------------------------------------------------------------


def test_where_equality():
    q = parse('avg(value).where(name = "ecu_acc_pedal")')
    assert q.filters == (Predicate(column="name", op="=", value="ecu_acc_pedal"),)


def test_where_not_equal():
    q = parse('avg(value).where(name != "ecu_acc_pedal")')
    assert q.filters == (Predicate(column="name", op="!=", value="ecu_acc_pedal"),)


def test_where_in_desugars_to_eq_list():
    q = parse('avg(value).where(name in ("a", "b"))')
    assert q.filters == (
        Predicate(column="name", op="=", value="a"),
        Predicate(column="name", op="=", value="b"),
    )


def test_where_not_in_desugars_to_ne_list():
    q = parse('avg(value).where(name not in ("a", "b"))')
    assert q.filters == (
        Predicate(column="name", op="!=", value="a"),
        Predicate(column="name", op="!=", value="b"),
    )


def test_where_wildcard_value_preserved_for_executor():
    # The parser keeps `*` verbatim; the executor translates it to LIKE.
    q = parse('count(signal).where(name = "ecu*")')
    assert q.filters == (Predicate(column="name", op="=", value="ecu*"),)


def test_where_unfilterable_column():
    e = _err('avg(value).where(vehicle_id = "x")')
    assert "can't filter on" in str(e)


def test_where_not_without_in():
    e = _err('avg(value).where(name not "a")')
    assert "expected 'in' after 'not'" in str(e)


def test_where_requires_quoted_string():
    e = _err("avg(value).where(name = 5)")
    assert "quoted string" in str(e)


def test_where_bad_operator():
    e = _err('avg(value).where(name > "a")')
    assert "expected '=', '!=', 'in', or 'not in'" in str(e)


# ---------------------------------------------------------------------------
# .by
# ---------------------------------------------------------------------------


def test_by_single_column():
    q = parse("count(signal).by(name)")
    assert q.group_by == ("name",)


def test_by_ungroupable_column():
    e = _err("count(signal).by(value)")
    assert "can't group by" in str(e)


# ---------------------------------------------------------------------------
# .every
# ---------------------------------------------------------------------------


def test_every_valid_interval():
    q = parse("count(signal).every(100ms)")
    assert q.rollup == "100ms"


def test_every_invalid_interval():
    # `3s` lexes as an interval but isn't an allowed rollup — proves the
    # interval token survived (not a number/lex error).
    e = _err("count(signal).every(3s)")
    assert "invalid interval" in str(e)


def test_every_specified_twice():
    e = _err("count(signal).every(1s).every(10s)")
    assert "more than once" in str(e)


# ---------------------------------------------------------------------------
# .fill
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("mode", ["gap", "last", "linear"])
def test_fill_modes(mode):
    q = parse(f"avg(value).fill({mode})")
    assert q.fill == mode


def test_fill_invalid_mode():
    e = _err("avg(value).fill(bogus)")
    assert "invalid fill mode" in str(e)


# ---------------------------------------------------------------------------
# .reject — comparisons, ranges, and/or precedence
# ---------------------------------------------------------------------------


def test_reject_simple_cmp():
    q = parse("avg(value).reject(value > 100)")
    assert q.reject == RejectCmp(metric="value", op=">", threshold=100.0)


def test_reject_sigma_cmp():
    q = parse("last(value).reject(sigma > 3)")
    assert q.reject == RejectCmp(metric="sigma", op=">", threshold=3.0)


def test_reject_between_is_inside():
    q = parse("avg(value).reject(value between (0, 100))")
    assert q.reject == RejectRange(
        metric="value", lo=0.0, hi=100.0, inside=True
    )


def test_reject_outside_is_not_inside():
    q = parse("avg(value).reject(raw_value outside (0, 100))")
    assert q.reject == RejectRange(
        metric="raw_value", lo=0.0, hi=100.0, inside=False
    )


def test_reject_and_binds_tighter_than_or():
    # a or b and c  ==>  a OR (b AND c)
    q = parse(
        "avg(value).reject(value > 1 or value < -1 and raw_value > 5)"
    )
    assert q.reject == RejectBool(
        op="or",
        left=RejectCmp(metric="value", op=">", threshold=1.0),
        right=RejectBool(
            op="and",
            left=RejectCmp(metric="value", op="<", threshold=-1.0),
            right=RejectCmp(metric="raw_value", op=">", threshold=5.0),
        ),
    )


def test_reject_parens_override_precedence():
    # (a or b) and c
    q = parse(
        "avg(value).reject((value > 1 or value < -1) and raw_value > 5)"
    )
    assert q.reject == RejectBool(
        op="and",
        left=RejectBool(
            op="or",
            left=RejectCmp(metric="value", op=">", threshold=1.0),
            right=RejectCmp(metric="value", op="<", threshold=-1.0),
        ),
        right=RejectCmp(metric="raw_value", op=">", threshold=5.0),
    )


def test_reject_sigma_range_rejected():
    e = _err("avg(value).reject(sigma between (0, 3))")
    assert "sigma" in str(e).lower()


def test_reject_unknown_metric():
    e = _err("avg(value).reject(speed > 3)")
    assert "can't reject on" in str(e)


def test_reject_specified_twice():
    e = _err("avg(value).reject(value > 1).reject(value < 0)")
    assert "more than once" in str(e)


# ---------------------------------------------------------------------------
# `-> name` label
# ---------------------------------------------------------------------------


def test_label_assignment():
    q = parse('count(signal).where(name = "ecu*") -> ecu')
    assert q.label == "ecu"
    assert q.filters == (Predicate(column="name", op="=", value="ecu*"),)


def test_label_with_by_rejected():
    e = _err("count(signal).by(name) -> x")
    assert "can't be combined with '.by'" in str(e)


def test_label_missing_name():
    e = _err("count(signal) ->")
    assert "expected a variable name after '->'" in str(e)


def test_trailing_garbage_after_label():
    e = _err("count(signal) -> x y")
    assert "unexpected" in str(e)


# ---------------------------------------------------------------------------
# Method dispatch errors
# ---------------------------------------------------------------------------


def test_renamed_method_migration_error():
    e = _err("count(signal).rollup(1s)")
    assert "was renamed to '.every'" in str(e)
    # Points at the method token, just past the leading `.`.
    assert e.position == len("count(signal).")


def test_unknown_method():
    e = _err("count(signal).foo(1)")
    assert "unknown method" in str(e)


def test_method_not_chained_with_dot():
    e = _err("count(signal) by(name)")
    assert "chained with '.'" in str(e)


def test_empty_query():
    e = _err("   ")
    assert "empty" in str(e)
    assert e.position == 0


def test_method_order_does_not_matter():
    a = parse('avg(value).where(name = "x").every(1s)')
    b = parse('avg(value).every(1s).where(name = "x")')
    assert a.filters == b.filters
    assert a.rollup == b.rollup
