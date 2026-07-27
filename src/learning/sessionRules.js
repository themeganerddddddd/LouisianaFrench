import { updateCardReview } from '../utils/spacedRepetition';
import { updateWordProgress } from '../utils/storage';

const RULES = {
  lesson: {
    correct: {
      cardQuality: (isReview) => isReview ? 5 : 4,
      xp: (isReview) => isReview ? 6 : 10,
    },
    wrong: { cardQuality: 2, xp: 0 },
    updatesWords: true,
    wrongRoutesToMistakeReview: true,
  },

  'daily-review': {
    correct: { cardQuality: 5, xp: 8 },
    wrong: { cardQuality: 2, xp: 0 },
    updatesWords: true,
    wrongRoutesToMistakeReview: false,
  },

  'mistake-review': {
    correct: { cardQuality: null, xp: 10 },
    wrong: { cardQuality: null, xp: 0 },
    updatesWords: false,
    wrongRoutesToMistakeReview: false,
  },
};

function qualityValue(rule, isReview) {
  if (rule.cardQuality === null) return null;
  return typeof rule.cardQuality === 'function'
    ? rule.cardQuality(isReview)
    : rule.cardQuality;
}

function xpValue(rule, isReview) {
  return typeof rule.xp === 'function' ? rule.xp(isReview) : rule.xp;
}

export function correctAnswer(type, isReview) {
  const rules = RULES[type];
  if (!rules) throw new Error(`Unknown session type: ${type}`);
  return {
    cardQuality: qualityValue(rules.correct, isReview),
    updatesWords: rules.updatesWords,
    xp: xpValue(rules.correct, isReview),
  };
}

export function wrongAnswer(type) {
  const rules = RULES[type];
  if (!rules) throw new Error(`Unknown session type: ${type}`);
  return {
    cardQuality: qualityValue(rules.wrong),
    updatesWords: rules.updatesWords,
    xp: xpValue(rules.wrong),
  };
}

export async function applyOutcome(outcome, language, cardId, rowId) {
  if (outcome.cardQuality !== null) {
    await updateCardReview(cardId, outcome.cardQuality);
  }
  if (outcome.updatesWords && rowId) {
    await updateWordProgress(language, rowId, outcome.cardQuality > 2);
  }
}
