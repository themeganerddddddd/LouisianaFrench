import { getUnitTitle } from '../unitTitles';

describe('getUnitTitle', () => {
  it('returns the configured title for a known Louisiana French unit', () => {
  expect(getUnitTitle('cajun', 'u01')).toBe('Greetings & Politeness');
  });

  it('falls back to a generated title for an unknown unit code', () => {
    expect(getUnitTitle('cajun', 'u99')).toBe('Unit 99');
  });
});
