import { ABOUT_TEXT } from '../aboutContent';

function sectionNames(heading) {
  return (
    ABOUT_TEXT.acknowledgements.sections.find((entry) => entry.heading === heading)
      ?.names ?? []
  );
}

describe('ABOUT_TEXT acknowledgements', () => {
  it('lists Core team, Louisiana French, and Kouri-Vini in the provided order', () => {
    expect(sectionNames('Core team')).toEqual([
      'Westley Sturham',
      'Marguerite Justus, CODOFIL',
      'Taalib Pierre-Auguste',
      'Logan Delafosse'
    ]);
    expect(sectionNames('Louisiana French')).toEqual([
      'Clélie Ancelet',
      'Daniel Blanchard',
      'Marlene Breaux Toups',
      'Valerie Broussard Boston',
      'Megan Constantin, CODOFIL',
      'Sam Craft',
      'Sherman Cravins',
      'Logan Delafosse',
      'Gail DuBois Broussard',
      'Wil Fontenot',
      'Zachary Fusilier',
      'Lester Gauthier',
      'Maggie Justus',
      'Ryan Langley',
      'Burnell Lemoine',
      'Blake Miller'
    ]);
    expect(sectionNames('Kouri-Vini')).toEqual([
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
