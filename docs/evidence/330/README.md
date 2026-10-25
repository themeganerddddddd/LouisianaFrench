# Evidence for #330 — Daily Review Next Question stuck after Correct

Captured on **Android emulator** (`sdk_gphone16k_x86_64`, Expo Go **58.0.5**) against this branch. Reporter used **iPhone 15 / iOS**; this run documents the same Typing → Correct → Next Question path on Android. No iOS simulator was available in this environment.

Grabs are resized to 50% width and height (aspect ratio kept).

## Device gap vs reporter

| | Reporter | This evidence |
| --- | --- | --- |
| Device | Apple iPhone 15 | Android emulator |
| OS | iOS 27.0.1 | Android (emulator image) |
| App | 1.0.2 | Expo Go SDK 58 against this branch |
| Language | Kouri-Vini (`kreole`) | Kouri-Vini |

The hang mechanism (`FeedbackFooter` / `submitOnce` one-shot with no re-enable when `recordActivityOutcome` rejects) is platform-agnostic; unit and Daily Review screen tests inject a storage rejection to prove the dead control and the re-enable fix.

## What was clicked

1. Open Daily Review on Kouri-Vini with a Typing card **Type: 'How is it going?'** at **1 / 2** (`01-typing-prompt.png`).
2. Type the accepted answer `Komen ca va?` (`01-typed.png`).
3. Tap **Check** → **Correct!** with **Next Question** visible (`02-correct-before-next.png`).
4. Tap **Next Question** → progress advances to **2 / 2** and XP updates (`03-after-next-advanced.png`).

## Hang characterization (tests, not a separate device inject)

Before the fix, a rejected advance left **Next Question** disabled on **1 / 2**. Covered by:

- `ActivityRenderer` submission: re-enables Next Question when `onCorrect` rejects
- `DailyReviewScreen`: re-enables after a failed Typing advance, then advances on retry
