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
          target: 'Bonjour',
          extraDetails: 'This phrase has no Unit note action.'
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
    },
    {
      id: 'fixture_cajun_u03_l01',
      unit: 'u03',
      lessonNumberInUnit: 1,
      lessonTitle: 'To Be & To Have',
      type: 'core',
      words: [
        {
          rowId: 'fixture_cajun_w04',
          english: 'to be',
          target: 'être'
        }
      ],
      activities: [
        {
          cardId: 'fixture:cajun:to-be:intro',
          rowId: 'fixture_cajun_w04',
          type: 'intro_card',
          prompt: 'Listen and learn',
          answer: 'être',
          answerDisplay: 'être',
          english: 'to be',
          target: 'être',
          extraDetails: 'This phrase has a Unit note.'
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

export const compactCatalogPrefaces = deepFreeze({
  cajun: {
    u03: {
      id: 'cajun:u03',
      title: 'Ways to say "they"',
      summary: 'The form you hear may depend on the region or the speaker.',
      terms: ['ils', 'eux-autres', 'eusse', 'ça'],
      reassurance: 'The app will accept multiple forms in your answers.',
      detailsTitle: 'Why are there different forms?',
      sections: [
        {
          heading: 'Language changes by place',
          paragraphs: [
            "You'll hear eusse more frequently in southeast Louisiana, including Terrebonne and Lafourche, than in the rest of the state."
          ]
        },
        {
          heading: 'People may switch forms',
          paragraphs: [
            'The same person may use different words interchangeably. Marie might mostly use ils, but sometimes say ça, particularly when speaking generally.'
          ],
          quote: {
            text: '"Ça parle français à Mamou."',
            attribution: '"They speak French in Mamou."'
          }
        },
        {
          heading: 'A form shared across French',
          paragraphs: [
            'Ils is common both in Louisiana and throughout the French-speaking world. Even with ils, Louisiana speakers may conjugate some verbs differently.'
          ]
        },
        {
          heading: 'Answer naturally',
          paragraphs: [
            'This app will do its best to accept ils, eux-autres, eusse, and ça when more than one form works.'
          ]
        }
      ]
    }
  },
  kreole: {
    u01: {
      id: 'kreole:u01',
      title: 'Pronouns & Greetings',
      summary: 'The pronouns you hear may vary by region.',
      terms: ['mo', 'to', 'li', 'nouzòt', 'vouzòt', 'yé'],
      reassurance: 'The app accepts multiple forms where they vary.',
      detailsTitle: 'Why do pronouns vary?',
      sections: [
        {
          heading: 'Regional variation',
          paragraphs: [
            'Some areas use vouzòt more frequently than others for the plural "you".'
          ]
        }
      ]
    }
  }
});

export const compactCatalogSource = Object.freeze({
  getLessonsByLanguage(language) {
    return compactCatalogLessons[language];
  },
  getUnitPreface(language, unitCode) {
    return compactCatalogPrefaces?.[language]?.[unitCode];
  }
});
