function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  });

  return Object.freeze(value);
}

export const compactCatalogLessons = deepFreeze({
  cajun: [
    {
      id: 'fixture_cajun_u02_l01',
      unit: 'u02',
      lessonNumberInUnit: 1,
      lessonTitle: 'Everyday phrases',
      type: 'core',
      words: [
        {
          rowId: 'fixture_cajun_w03',
          english: "It's ready",
          target: "C'est paré"
        }
      ],
      activities: [
        {
          cardId: 'fixture:cajun:ready:build',
          rowId: 'fixture_cajun_w03',
          type: 'sentence_build',
          prompt: "Build: 'It's ready'",
          words: ["C'est", 'paré'],
          answerTokens: ["C'est", 'paré'],
          answer: "C'est paré",
          answerDisplay: "C'est paré",
          english: "It's ready",
          target: "C'est paré"
        }
      ]
    },
    {
      id: 'fixture_cajun_u01_review',
      unit: 'u01',
      lessonNumberInUnit: 2,
      lessonTitle: 'Greetings review',
      type: 'review',
      words: [
        {
          rowId: 'fixture_cajun_w01',
          english: 'Hello',
          target: 'Bonjour',
          audioKey: 'fixture_cajun_bonjour_audio'
        }
      ],
      activities: [
        {
          cardId: 'fixture:cajun:greetings:match',
          type: 'match_pairs',
          prompt: 'Match the words',
          pairs: [
            {
              left: 'Hello',
              right: 'Bonjour',
              audioKey: 'fixture_cajun_bonjour_audio'
            },
            { left: 'How’s it going?', right: 'Ça va?' }
          ],
          answer: 'All matched',
          answerDisplay: 'All matched'
        }
      ]
    },
    {
      id: 'fixture_cajun_u01_l01',
      unit: 'u01',
      lessonNumberInUnit: 1,
      lessonTitle: 'First greetings',
      type: 'core',
      words: [
        {
          rowId: 'fixture_cajun_w02',
          english: 'How’s it going?',
          target: 'Ça va?'
        },
        {
          rowId: 'fixture_cajun_w01',
          english: 'Hello',
          target: 'Bonjour',
          audioKey: 'fixture_cajun_bonjour_audio'
        }
      ],
      activities: [
        {
          cardId: 'fixture:cajun:greeting:intro',
          rowId: 'fixture_cajun_w01',
          audioKey: 'fixture_cajun_bonjour_audio',
          type: 'intro_card',
          prompt: 'Listen and learn',
          answer: 'Bonjour',
          answerDisplay: 'Bonjour',
          english: 'Hello',
          target: 'Bonjour'
        },
        {
          cardId: 'fixture:cajun:greeting:listen',
          rowId: 'fixture_cajun_w01',
          audioKey: 'fixture_cajun_bonjour_audio',
          type: 'listening_target_choice',
          prompt: 'Listen and choose the word',
          options: ['Bonjour', 'Ça va?'],
          answer: 'Bonjour',
          answerDisplay: 'Bonjour',
          english: 'Hello',
          target: 'Bonjour'
        },
        {
          cardId: 'fixture:cajun:greeting:choice',
          rowId: 'fixture_cajun_w02',
          type: 'multiple_choice',
          prompt: "Choose the match for 'How’s it going?'",
          options: ['Bonjour', 'Ça va?'],
          answer: 'Ça va?',
          answerDisplay: 'Ça va?',
          english: 'How’s it going?',
          target: 'Ça va?'
        },
        {
          cardId: 'fixture:cajun:greeting:typing',
          rowId: 'fixture_cajun_w02',
          type: 'typing',
          prompt: "Type: 'How’s it going?'",
          answer: 'Ça va?',
          answerDisplay: 'Ça va?',
          english: 'How’s it going?',
          target: 'Ça va?'
        }
      ]
    }
  ],
  kreole: [
    {
      id: 'fixture_kreole_u02_l01',
      unit: 'u02',
      lessonNumberInUnit: 1,
      lessonTitle: 'Checking in',
      type: 'core',
      words: [
        {
          rowId: 'fixture_kreole_w03',
          english: 'I am well',
          target: 'Mo byin'
        }
      ],
      activities: [
        {
          cardId: 'fixture:kreole:well:typing',
          rowId: 'fixture_kreole_w03',
          type: 'typing',
          prompt: "Type: 'I am well'",
          answer: 'Mo byin',
          answerDisplay: 'Mo byin',
          english: 'I am well',
          target: 'Mo byin'
        }
      ]
    },
    {
      id: 'fixture_kreole_u01_review',
      unit: 'u01',
      lessonNumberInUnit: 2,
      lessonTitle: 'Pronouns review',
      type: 'review',
      words: [
        {
          rowId: 'fixture_kreole_w01',
          english: 'we',
          target: 'nouzòt',
          audioKey: 'fixture_kreole_nouzot_audio'
        }
      ],
      activities: [
        {
          cardId: 'fixture:kreole:pronouns:choice',
          rowId: 'fixture_kreole_w01',
          audioKey: 'fixture_kreole_nouzot_audio',
          type: 'multiple_choice',
          prompt: "Choose the match for 'we'",
          options: ['nouzòt', 'vouzòt'],
          answer: 'nouzòt',
          answerDisplay: 'nouzòt',
          english: 'we',
          target: 'nouzòt'
        }
      ]
    },
    {
      id: 'fixture_kreole_u01_l01',
      unit: 'u01',
      lessonNumberInUnit: 1,
      lessonTitle: 'First pronouns',
      type: 'core',
      words: [
        {
          rowId: 'fixture_kreole_w02',
          english: "y'all",
          target: 'vouzòt'
        },
        {
          rowId: 'fixture_kreole_w01',
          english: 'we',
          target: 'nouzòt',
          audioKey: 'fixture_kreole_nouzot_audio'
        }
      ],
      activities: [
        {
          cardId: 'fixture:kreole:pronouns:intro',
          rowId: 'fixture_kreole_w01',
          audioKey: 'fixture_kreole_nouzot_audio',
          type: 'intro_card',
          prompt: 'Listen and learn',
          answer: 'nouzòt',
          answerDisplay: 'nouzòt',
          english: 'we',
          target: 'nouzòt'
        }
      ]
    }
  ]
});

export const compactCatalogSource = Object.freeze({
  getLessonsByLanguage(language) {
    return compactCatalogLessons[language];
  }
});
