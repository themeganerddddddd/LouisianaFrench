import { jest } from '@jest/globals';
import {
  applyOutcome,
  correctAnswer,
  routesToMistakeReview,
  wrongAnswer
} from '../sessionRules';
import { updateCardReview } from '../../utils/spacedRepetition';
import { updateWordProgress } from '../../utils/storage';

jest.mock('../../utils/spacedRepetition', () => ({
  updateCardReview: jest.fn(async () => {})
}));
jest.mock('../../utils/storage', () => ({
  updateWordProgress: jest.fn(async () => {})
}));

describe('sessionRules', () => {
  describe('correctAnswer', () => {
    it('lesson: quality 5 for review, 4 for new', () => {
      expect(correctAnswer('lesson', true).cardQuality).toBe(5);
      expect(correctAnswer('lesson', false).cardQuality).toBe(4);
    });

    it('lesson: 10 XP for new, 6 for review', () => {
      expect(correctAnswer('lesson', false).xp).toBe(10);
      expect(correctAnswer('lesson', true).xp).toBe(6);
    });

    it('lesson: updates words', () => {
      expect(correctAnswer('lesson', false).updatesWords).toBe(true);
    });

    it('daily-review: quality 5, 8 XP, updates words', () => {
      const r = correctAnswer('daily-review');
      expect(r.cardQuality).toBe(5);
      expect(r.xp).toBe(8);
      expect(r.updatesWords).toBe(true);
    });

    it('mistake-review: no card quality, 10 XP, no word updates', () => {
      const r = correctAnswer('mistake-review');
      expect(r.cardQuality).toBeNull();
      expect(r.xp).toBe(10);
      expect(r.updatesWords).toBe(false);
    });
  });

  describe('wrongAnswer', () => {
    it('lesson: quality 2, 0 XP, updates words', () => {
      const r = wrongAnswer('lesson');
      expect(r.cardQuality).toBe(2);
      expect(r.xp).toBe(0);
      expect(r.updatesWords).toBe(true);
    });

    it('daily-review: quality 2, 0 XP, updates words', () => {
      const r = wrongAnswer('daily-review');
      expect(r.cardQuality).toBe(2);
      expect(r.xp).toBe(0);
      expect(r.updatesWords).toBe(true);
    });

    it('mistake-review: no card quality, 0 XP, no word updates', () => {
      const r = wrongAnswer('mistake-review');
      expect(r.cardQuality).toBeNull();
      expect(r.xp).toBe(0);
      expect(r.updatesWords).toBe(false);
    });
  });

  describe('routesToMistakeReview', () => {
    it('true for lesson', () => {
      expect(routesToMistakeReview('lesson')).toBe(true);
    });

    it('false for daily-review', () => {
      expect(routesToMistakeReview('daily-review')).toBe(false);
    });

    it('false for mistake-review', () => {
      expect(routesToMistakeReview('mistake-review')).toBe(false);
    });
  });

  describe('applyOutcome', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls updateCardReview when cardQuality is set', async () => {
      await applyOutcome(
        { cardQuality: 5, updatesWords: true },
        'cajun',
        'card-1',
        'w-1'
      );
      expect(updateCardReview).toHaveBeenCalledWith('card-1', 5);
    });

    it('skips updateCardReview when cardQuality is null', async () => {
      await applyOutcome(
        { cardQuality: null, updatesWords: false },
        'cajun',
        'card-1',
        null
      );
      expect(updateCardReview).not.toHaveBeenCalled();
    });

    it('calls updateWordProgress with correct=true when quality > 2', async () => {
      await applyOutcome(
        { cardQuality: 4, updatesWords: true },
        'cajun',
        'card-1',
        'w-1'
      );
      expect(updateWordProgress).toHaveBeenCalledWith('cajun', 'w-1', true);
    });

    it('calls updateWordProgress with correct=false when quality = 2', async () => {
      await applyOutcome(
        { cardQuality: 2, updatesWords: true },
        'cajun',
        'card-1',
        'w-1'
      );
      expect(updateWordProgress).toHaveBeenCalledWith('cajun', 'w-1', false);
    });

    it('skips updateWordProgress when updatesWords is false', async () => {
      await applyOutcome(
        { cardQuality: 5, updatesWords: false },
        'cajun',
        'card-1',
        'w-1'
      );
      expect(updateWordProgress).not.toHaveBeenCalled();
    });

    it('skips updateWordProgress when rowId is missing', async () => {
      await applyOutcome(
        { cardQuality: 4, updatesWords: true },
        'cajun',
        'card-1',
        null
      );
      expect(updateWordProgress).not.toHaveBeenCalled();
    });
  });
});
