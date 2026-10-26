# Gate B device recipes

Scripted adb smoke checks for device verification (Gate B). Each scenario prints JSON:

```json
{ "scenario": "name", "pass": true, "detail": "..." }
```

Exit `0` on pass, `2` on fail.

## Add a scenario

1. Copy `template.sh` to `scripts/gate-b/<name>.sh`.
2. Set `MARKER` to UI text that must appear after the navigation steps.
3. Document the tap path in a comment at the top.
4. Keep recipes read-only for the git tree (adb only).

## Example

`example-home-return.sh` looks for Home / plan chrome after returning from a lesson. It may fail if the emulator is not on the expected screen — that is expected until you drive navigation.
