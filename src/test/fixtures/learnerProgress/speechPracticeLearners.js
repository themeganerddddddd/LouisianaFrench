function frozen(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) frozen(child);
  });
  return Object.freeze(value);
}

function audioWord(rowId, target) {
  return { rowId, target, english: `${target} (English)`, audioKey: `${rowId}_audio` };
}

function lesson(language, id, words) {
  return { id, language, words };
}

// w14 exists in both Languages so progress isolation depends on the Language prefix.
export const speechLessons = frozen({
  cajun: [
    lesson('cajun', 'cajun_u01_l01', [
      audioWord('w01', 'Bonjour'),
      audioWord('w02', 'Merci'),
      audioWord('w03', 'Ça va'),
      { rowId: 'w00', target: 'Mais', english: 'But' }
    ]),
    lesson('cajun', 'cajun_u01_l02', [
      audioWord('w04', 'Oui'),
      audioWord('w05', 'Non'),
      { rowId: 'w06', target: 'Asteur', english: 'Now' }
    ]),
    lesson('cajun', 'cajun_u02_l01', [audioWord('w07', 'Paré'), audioWord('w08', 'Bien')]),
    lesson('cajun', 'cajun_u03_l01', [
      audioWord('w09', 'Être'),
      audioWord('w10', 'Avoir'),
      audioWord('w11', 'Je suis'),
      audioWord('w12', 'Tu es'),
      audioWord('w13', 'Il est')
    ]),
    lesson('cajun', 'cajun_u03_l02', [audioWord('w14', 'Nous'), audioWord('w15', 'Vous')])
  ],
  kreole: [
    lesson('kreole', 'kreole_u01_l01', [audioWord('w14', 'Nouzòt'), audioWord('k01', 'Mo')])
  ]
});

const done = (completedAt) => ({ completed: true, completedAt });
const learning = { seen: 1, correct: 0, wrong: 1, status: 'learning' };
const strong = { seen: 2, correct: 2, wrong: 0, status: 'strong' };
const mastered = { seen: 4, correct: 4, wrong: 0, status: 'mastered' };

const unitThreeLessons = {
  'cajun:cajun_u01_l01': done('2026-10-01T15:00:00.000Z'),
  'cajun:cajun_u01_l02': done('2026-10-05T15:00:00.000Z'),
  'cajun:cajun_u02_l01': done('2026-10-10T15:00:00.000Z'),
  'cajun:cajun_u03_l01': done('2026-10-20T15:00:00.000Z')
};

const unitThreeWords = {
  'cajun:w01': mastered,
  'cajun:w02': strong,
  'cajun:w03': learning,
  'cajun:w04': mastered,
  'cajun:w05': learning,
  'cajun:w07': strong,
  'cajun:w08': mastered,
  'cajun:w09': learning,
  'cajun:w10': learning,
  'cajun:w11': learning,
  'cajun:w12': learning,
  'cajun:w13': learning
};

export const speechLearners = frozen({
  newLearner: { lessonProgress: {}, wordProgress: {} },
  unitThreeLearner: { lessonProgress: unitThreeLessons, wordProgress: unitThreeWords },
  unitThreeLearnerShuffledKeys: {
    lessonProgress: {
      'cajun:cajun_u01_l02': unitThreeLessons['cajun:cajun_u01_l02'],
      'cajun:cajun_u03_l01': unitThreeLessons['cajun:cajun_u03_l01'],
      'cajun:cajun_u01_l01': unitThreeLessons['cajun:cajun_u01_l01'],
      'cajun:cajun_u02_l01': unitThreeLessons['cajun:cajun_u02_l01']
    },
    wordProgress: unitThreeWords
  },
  allMastered: {
    lessonProgress: unitThreeLessons,
    wordProgress: Object.fromEntries(Object.keys(unitThreeWords).map((key) => [key, mastered]))
  },
  threeAudioWordsStudied: {
    lessonProgress: { 'cajun:cajun_u01_l02': done('2026-10-05T15:00:00.000Z') },
    wordProgress: { 'cajun:w06': learning, 'cajun:w07': learning }
  },
  twoWordsReached: {
    lessonProgress: { 'cajun:cajun_u02_l01': done('2026-10-10T15:00:00.000Z') },
    wordProgress: {}
  },
  shortEarlierBucket: {
    lessonProgress: { 'cajun:cajun_u03_l01': done('2026-10-20T15:00:00.000Z') },
    wordProgress: { 'cajun:w02': strong }
  },
  kouriViniOnly: {
    lessonProgress: { 'kreole:kreole_u01_l01': done('2026-10-25T15:00:00.000Z') },
    wordProgress: { 'kreole:w14': learning, 'kreole:k01': learning }
  }
});
