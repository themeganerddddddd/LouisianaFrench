import {
  speechLearners,
  speechLessons
} from '../../test/fixtures/learnerProgress/speechPracticeLearners';
import { pickSpeechWords } from '../pickSpeechWords';

const UNREACHED_CAJUN_ROW_IDS = ['w14', 'w15'];

function pick(learner, { language = 'cajun', limit = 5 } = {}) {
  const words = pickSpeechWords({ lessons: speechLessons[language], ...learner, limit });
  return words.map((word) => word.rowId);
}

function combined(...learners) {
  return {
    lessonProgress: Object.assign({}, ...learners.map((l) => l.lessonProgress)),
    wordProgress: Object.assign({}, ...learners.map((l) => l.wordProgress))
  };
}

describe('pickSpeechWords', () => {
  it.each([
    ['a new learner gets the first Lesson audio words', speechLearners.newLearner, ['w01', 'w02', 'w03']],
    [
      'a Unit 3 learner gets 3 newest-Lesson words, then the 2 weakest earlier words, not the 2 leftovers',
      speechLearners.unitThreeLearner,
      ['w09', 'w10', 'w11', 'w05', 'w03']
    ],
    [
      'Lesson progress key order does not change the pick',
      speechLearners.unitThreeLearnerShuffledKeys,
      ['w09', 'w10', 'w11', 'w05', 'w03']
    ],
    [
      'all mastered words fall back to the nearest earlier Lessons',
      speechLearners.allMastered,
      ['w09', 'w10', 'w11', 'w07', 'w08']
    ],
    [
      'only 3 studied audio words are returned without padding',
      speechLearners.threeAudioWordsStudied,
      ['w04', 'w05', 'w07']
    ],
    ['only 2 reached words are returned', speechLearners.twoWordsReached, ['w07', 'w08']],
    [
      'a short earlier bucket is filled from the newest Lesson leftovers',
      speechLearners.shortEarlierBucket,
      ['w09', 'w10', 'w11', 'w02', 'w12']
    ]
  ])('%s', (_name, learner, expected) => {
    const picked = pick(learner);

    expect(picked).toEqual(expected);
    UNREACHED_CAJUN_ROW_IDS.forEach((rowId) => expect(picked).not.toContain(rowId));
  });

  it('keeps Cajun and Kouri-Vini progress apart', () => {
    const learner = combined(speechLearners.shortEarlierBucket, speechLearners.kouriViniOnly);

    expect(pick(learner)).toEqual(['w09', 'w10', 'w11', 'w02', 'w12']);
    expect(pick(speechLearners.unitThreeLearner, { language: 'kreole' })).toEqual(['w14', 'k01']);
  });

  it('fails early when a Lesson has no Language', () => {
    const lessons = [{ id: 'lesson_without_language', words: [] }];

    expect(() => pickSpeechWords({ lessons, lessonProgress: {}, wordProgress: {}, limit: 5 }))
      .toThrow('lesson_without_language');
  });
});
