# Issue #435 — Practice Speech picks recently studied words

Android emulator `lf-api35`, Expo Go 58.0.5, Metro from this branch over `adb reverse tcp:8095`.

## How the learner state was made

All through the app UI; no storage was edited by hand.

1. Fresh install, chose Louisiana French.
2. Tapped T-Boy on Home 10 times to open the catalog navigator, jumped to Unit 3 Part 1 activity 14, answered it and the match activity, and finished the lesson.
3. Moved the emulator clock forward one day (`adb shell date`) so the next Home is day 2 with the Review / Lesson / Speech plan.
4. Same route for Unit 3 Part 2 (activity 15), so today's Lesson step is done.

## Files

- `01-daily-plan-practice-speech.png` — Today's plan: Lesson done, next step Practice Speech.
- `02-practice-speech-unit3-word.png` — after tapping Practice Speech: first word is "Quoi c’est ça?" (Unit 3 Part 2), not "Bonjour!".
- `03-tap-practice-speech.mp4` — the tap and the Practice Speech screen loading.
