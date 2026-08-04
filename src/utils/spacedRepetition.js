import { getNow } from './clock';
import { getReviewState, saveReviewState } from './storage';

function defaultCardState() {
  return {
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReviewAt: new Date(0).toISOString(),
    lapses: 0
  };
}

export async function updateCardReview(cardId, quality) {
  const state = await getReviewState();
  const card = state[cardId] || defaultCardState();

  if (quality < 3) {
    card.repetitions = 0;
    card.interval = 1;
    card.lapses += 1;
  } else {
    card.repetitions += 1;
    if (card.repetitions === 1) card.interval = 1;
    else if (card.repetitions === 2) card.interval = 3;
    else card.interval = Math.round(card.interval * card.easeFactor);
    if (quality >= 4) card.lapses = 0;
  }

  card.easeFactor = Math.max(
    1.3,
    card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const next = getNow();
  next.setDate(next.getDate() + card.interval);
  card.nextReviewAt = next.toISOString();

  state[cardId] = card;
  await saveReviewState(state);
  return card;
}

export async function getDueReviewItems(items) {
  const reviewState = await getReviewState();
  const now = getNow();

  return items.filter((item) => {
    const card = reviewState[item.cardId];
    if (!card) return false;
    return new Date(card.nextReviewAt) <= now;
  });
}

export async function getWeakItems(items) {
  const reviewState = await getReviewState();

  return items
    .map((item) => ({
      ...item,
      reviewMeta: reviewState[item.cardId]
    }))
    .filter((item) => item.reviewMeta && item.reviewMeta.lapses > 0)
    .sort((a, b) => (b.reviewMeta.lapses || 0) - (a.reviewMeta.lapses || 0));
}
