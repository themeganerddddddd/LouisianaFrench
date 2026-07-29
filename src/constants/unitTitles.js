export const UNIT_TITLES = {
  cajun: {
    u01: 'Greetings & Check-ins',
    u02: 'Names & Introductions',
    u03: 'To Be & To Have',
    u04: 'Wanting & Being Able',
    u05: 'Doing & Everyday Actions'
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