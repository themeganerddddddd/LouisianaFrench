import { UNIT_PREFACES } from '../unitPrefaces';

describe('UNIT_PREFACES', () => {
  describe('cajun', () => {
    const cajunU03 = UNIT_PREFACES.cajun.u03;

    it('has the expected title', () => {
      expect(cajunU03.title).toBe('Ways to say "they"');
    });

    it('has the expected summary', () => {
      expect(cajunU03.summary).toBe(
        'The form you hear may depend on the region or the speaker.'
      );
    });

    it('has 4 terms', () => {
      expect(cajunU03.terms).toHaveLength(4);
    });

    it('has the expected reassurance', () => {
      expect(cajunU03.reassurance).toBe(
        'The app will accept multiple forms in your answers.'
      );
    });

    it('has the expected detailsTitle', () => {
      expect(cajunU03.detailsTitle).toBe('Why are there different forms?');
    });

    it('has 4 sections', () => {
      expect(cajunU03.sections).toHaveLength(4);
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
