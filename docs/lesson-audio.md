# Lesson Audio

Word Audio and feedback tones during a Lesson (or Daily Review) use `expo-audio` players created in `ActivityRenderer`'s `useAudio` hook.

## Stopping on advance (#335)

Players are released when:

1. The learner taps **Continue** / **Next Question** (before the session records the outcome or runs the transition animation).
2. The same Activity plays a new clip (replay / another option).
3. The Activity unmounts.
4. The Lesson session calls `stopLessonAudio()` as a safety net when advancing the Activity index.

Without (1), Word Audio kept playing through `recordActivityOutcome` and the ~160ms fade. On Android that leftover native player can block the next Activity's play so the next clip is silent.

`src/utils/audioPlayer.js` tracks the active Word and feedback players so `stopLessonAudio()` can tear them down even after a React remount race.
