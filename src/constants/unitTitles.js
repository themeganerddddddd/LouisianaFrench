export const UNIT_TITLES = {
  cajun: {
    u01: 'Greetings & Check-ins',
    u02: 'Names & Introductions',
    u03: 'To Be & To Have',
    u04: 'Wanting & Being Able',
    u05: 'Doing & Everyday Actions'
  },
  kreole: {
    u01: 'Pronouns & Greetings',
    u02: 'Check-ins & Well-being',
    u03: 'Names & Introductions',
    u04: 'Common Verbs',
    u05: 'Everyday Nouns'
  }
};

export function getUnitTitle(language, unitCode) {
  return UNIT_TITLES?.[language]?.[unitCode] || `Unit ${String(unitCode || '').replace('u', '')}`;
}