import { ABOUT_TEXT } from '../aboutContent';

function louisianaFrenchNames() {
  const section = ABOUT_TEXT.acknowledgements.sections.find(
    (entry) => entry.heading === 'Louisiana French'
  );
  return section?.names ?? [];
}

describe('ABOUT_TEXT acknowledgements', () => {
  it('lists the Louisiana French contributors with CODOFIL on Megan Constantin', () => {
    const names = louisianaFrenchNames();

    expect(names).toEqual(
      expect.arrayContaining([
        'Sherman Cravins',
        'Gail DuBois Broussard',
        'Wildon Fontent',
        'Lester Gauthier',
        'Megan Constantin, CODOFIL'
      ])
    );
    expect(names).not.toContain('Megan Constantin');
  });

  it('leaves Core team and Kouri-Vini name lists unchanged by this content update', () => {
    const core = ABOUT_TEXT.acknowledgements.sections.find(
      (entry) => entry.heading === 'Core team'
    );
    const kouriVini = ABOUT_TEXT.acknowledgements.sections.find(
      (entry) => entry.heading === 'Kouri-Vini'
    );

    expect(core?.names).toEqual([
      'Westley Sturham',
      'Marguerite “Maggie” Justus, CODOFIL',
      'Taalib Pierre-Auguste',
      'Logan Delafosse'
    ]);
    expect(kouriVini?.names).toEqual([
      'Taalib Pierre-Auguste',
      'Alexandre “Hibou” Leblanc',
      'Kaël “Chaoui” Leblanc',
      'Lauren Richard',
      'Daniele Simpson',
      'Aliza Ariza',
      'Jermaine Butler'
    ]);
  });
});
