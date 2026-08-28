import { UNIT_PREFACES } from '../unitPrefaces';

describe('UNIT_PREFACES', () => {
  describe('cajun', () => {
    it('has no Unit 3 note', () => {
      expect(UNIT_PREFACES.cajun.u03).toBeUndefined();
    });
  });

  describe('cajun u06', () => {
    const cajunU06 = UNIT_PREFACES.cajun.u06;

    it('moves the same-English they explanation into the pre-lesson note', () => {
      expect(cajunU06.title).toBe('Different ways to say “they”');
      expect(cajunU06.summary).toContain('same English “they” phrases');
      expect(cajunU06.terms).toEqual(['they are', 'they have', 'they want']);
    });
  });

  describe('kreole', () => {
    it('language key exists as an object', () => {
      expect(typeof UNIT_PREFACES.kreole).toBe('object');
    });

    it('has no entries', () => {
      expect(Object.keys(UNIT_PREFACES.kreole)).toHaveLength(0);
    });

    it('returns undefined for u03', () => {
      expect(UNIT_PREFACES.kreole.u03).toBeUndefined();
    });
  });
});
