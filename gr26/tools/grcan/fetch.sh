#!/usr/bin/env bash
# fetch.sh - download the GR CAN autogen artifacts from the Firmware repo.
#
# Usage:
#   fetch.sh <dest_dir> [ref]
#
# Pulls the small ID enum headers and the DBC files (the inputs grcan_sync.py
# parses) from Gaucho-Racing/Firmware into <dest_dir>. Defaults to the `main`
# branch. Requires an authenticated `gh` CLI.
#
# Used by the sync-grcan skill: fetch latest into a temp dir, diff against the
# committed snapshot, then (on success) overwrite the snapshot with the temp dir.
set -euo pipefail

DEST="${1:?usage: fetch.sh <dest_dir> [ref]}"
REF="${2:-main}"
REPO="Gaucho-Racing/Firmware"
BASE="Autogen/CAN"

# Artifacts: message-ID enums (join keys + values) and DBCs (signal layouts).
# NODE_ID/BUS_ID enums are intentionally NOT fetched - the models don't use
# them, and their small values collide with low message IDs.
FILES=(
  "Inc/GRCAN_MSG_ID.h"
  "Inc/GRCAN_CUSTOM_ID.h"
  "Doc/GRCAN_Primary.dbc"
  "Doc/GRCAN_Data.dbc"
  "Doc/GRCAN_Charger.dbc"
)

mkdir -p "$DEST"
for f in "${FILES[@]}"; do
  out="$DEST/$(basename "$f")"
  gh api "repos/$REPO/contents/$BASE/$f?ref=$REF" -q .content | base64 -d > "$out"
  printf 'fetched %-22s (%s bytes)\n' "$(basename "$f")" "$(wc -c < "$out" | tr -d ' ')"
done
