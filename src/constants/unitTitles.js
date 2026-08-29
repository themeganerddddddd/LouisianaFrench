export const UNIT_TITLES = {
  cajun: {
    u01: 'Greetings & Politeness',
    u02: 'Names & Introductions',
    u03: 'To Be & Adjectives',
    u04: 'To Have & Expressions',
    u05: 'ER verbs & Preferences',
    u06: 'Pronoun “They” & To Be Able To',
    u07: 'To Do/Make & Expressions'
  },
  kreole: {
    u01: "Greetings & Check-ins",
    u02: "Pronouns & Feelings",
    u03: "Common Verbs",
    u04: "Descriptions & Qualities",
    u05: "School & Everyday Life",
    u06: "Questions & Time",
    u07: "Actions & Tenses",
    u08: "Possession & Requests",
    u09: "Objects, Names & Senses"
  }
};

export function getUnitTitle(language, unitCode) {
  return UNIT_TITLES?.[language]?.[unitCode] || `Unit ${String(unitCode || '').replace('u', '')}`;
}