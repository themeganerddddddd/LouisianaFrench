#!/usr/bin/env bash
# Gate B template — replace MARKER and document the tap path above the dump.
set -euo pipefail

SCENARIO="${SCENARIO:-template}"
MARKER="${MARKER:-Louisiana}"
DUMP="${TMPDIR:-/tmp}/gate-b-${SCENARIO}.xml"

adb wait-for-device
adb shell uiautomator dump /sdcard/gate-b-dump.xml >/dev/null
adb pull /sdcard/gate-b-dump.xml "$DUMP" >/dev/null

if grep -q "$MARKER" "$DUMP"; then
  printf '{"scenario":"%s","pass":true,"detail":"found marker %s"}\n' "$SCENARIO" "$MARKER"
  exit 0
fi

printf '{"scenario":"%s","pass":false,"detail":"marker not found: %s"}\n' "$SCENARIO" "$MARKER"
exit 2
