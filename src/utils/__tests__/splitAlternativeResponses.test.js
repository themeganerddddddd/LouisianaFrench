import { splitAlternativeResponses } from '../splitAlternativeResponses';

describe('splitAlternativeResponses', () => {
  it('splits several quoted Louisiana French phrases into one item each', () => {
    const input =
      '“Eux-autres a un tas d’argent.” “Ils ont un tas d’argent.” “Ça a un tas d’argent.” “Eux-autres a beaucoup d’argent.” “Ils ont beaucoup d’argent.” “Ça a beaucoup d’argent.”';

    expect(splitAlternativeResponses(input)).toEqual([
      'Eux-autres a un tas d’argent.',
      'Ils ont un tas d’argent.',
      'Ça a un tas d’argent.',
      'Eux-autres a beaucoup d’argent.',
      'Ils ont beaucoup d’argent.',
      'Ça a beaucoup d’argent.'
    ]);
  });

  it('splits an unquoted comma-separated Kouri-Vini list', () => {
    expect(
      splitAlternativeResponses('poukwa, pouki, kwafé')
    ).toEqual(['poukwa', 'pouki', 'kwafé']);
  });

  it('keeps a single unquoted phrase as one item', () => {
    expect(
      splitAlternativeResponses('De rien!')
    ).toEqual(['De rien!']);
  });

  it('keeps a quoted phrase with an internal comma as one item', () => {
    expect(
      splitAlternativeResponses('"Bonjour, M. Boudreaux!"')
    ).toEqual(['Bonjour, M. Boudreaux!']);
  });

  it('splits several straight-quoted phrases', () => {
    expect(
      splitAlternativeResponses('"Alpha" "Beta" "Gamma"')
    ).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('returns an empty list for blank input', () => {
    expect(splitAlternativeResponses('')).toEqual([]);
    expect(splitAlternativeResponses('   ')).toEqual([]);
    expect(splitAlternativeResponses(null)).toEqual([]);
    expect(splitAlternativeResponses(undefined)).toEqual([]);
  });
});
