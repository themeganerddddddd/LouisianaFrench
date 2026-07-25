import { clock } from '../clock';

export function buildCardReviewState({
  repetitions = 1,
  interval = 1,
  easeFactor = 2.5,
  nextReviewAt = clock.futureDue().toISOString(),
  lapses = 0
} = {}) {
  return {
    repetitions,
    interval,
    easeFactor,
    nextReviewAt,
    lapses
  };
}
