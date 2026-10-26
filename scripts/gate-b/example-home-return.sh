#!/usr/bin/env bash
# Example Gate B: after leaving a lesson/activity, Home chrome is visible.
# Drive the app to Home first (manual or prior adb taps), then run this check.
set -euo pipefail

SCENARIO="home-return"
MARKER="${MARKER:-Today}"
DUMP="${TMPDIR:-/tmp}/gate-b-${SCENARIO}.xml"

adb wait-for-device
adb shell uiautomator dump /sdcard/gate-b-dump.xml >/dev/null
adb pull /sdcard/gate-b-dump.xml "$DUMP" >/dev/null

if grep -Eq "Today|Home|plan" "$DUMP"; then
  printf '{"scenario":"%s","pass":true,"detail":"home chrome markers present"}\n' "$SCENARIO"
  exit 0
fi

printf '{"scenario":"%s","pass":false,"detail":"home chrome markers missing"}\n' "$SCENARIO"
exit 2
