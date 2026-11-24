import { describe, expect, it } from '@jest/globals';

import { accentFor, type Language } from '../languageAccent';

describe('accentFor', () => {
  it.each<[Language, string]>([
    ['cajun', '#2771CB'],
    ['kreole', '#08834C']
  ])('returns the %s accent', (language, hex) => {
    expect(accentFor(language)).toBe(hex);
  });

  it('rejects a language that has no accent', () => {
    expect(() => accentFor('spanish' as Language)).toThrow(/spanish/);
  });
});
