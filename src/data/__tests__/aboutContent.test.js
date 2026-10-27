import { ABOUT_TEXT } from '../aboutContent';

function sectionNames(heading) {
  return (
    ABOUT_TEXT.acknowledgements.sections.find((entry) => entry.heading === heading)
      ?.names ?? []
  );
}

function paragraphs(group, heading) {
  return ABOUT_TEXT[group].sections.find((entry) => entry.heading === heading)?.paragraphs ?? [];
}

describe('ABOUT_TEXT privacy and FAQ', () => {
  it('tells a signed-in learner that Saved Learner Progress survives uninstall', () => {
    const progress = paragraphs('privacy', 'Saved Learner Progress').join(' ');
    expect(progress).toMatch(/Saved Learner Progress/);
    expect(progress).toMatch(/Restore/);
    expect(progress).toMatch(/guest/i);
    expect(progress).not.toMatch(/We do not create an account/);
    expect(progress).not.toMatch(/Uninstalling the app removes that stored progress/);
    expect(paragraphs('privacy', 'Voice practice').join(' ')).toMatch(/Recordings stay on the device/);
  });

  it('stops saying there is no account and that progress never leaves the device', () => {
    const account = paragraphs('faq', 'Do I need an account?').join(' ');
    const otherPhone = paragraphs('faq', 'Will progress show up on another phone?').join(' ');
    const kids = paragraphs('faq', 'Can kids use this?').join(' ');
    expect(account).toMatch(/Saved Learner Progress/);
    expect(account).toMatch(/guest/i);
    expect(otherPhone).toMatch(/Restore/);
    expect(kids).toMatch(/guest/i);
    expect(`${account} ${otherPhone} ${kids}`).not.toMatch(/Nope\. No password/);
    expect(`${account} ${otherPhone} ${kids}`).not.toMatch(/new device starts fresh/);
    expect(`${account} ${otherPhone} ${kids}`).not.toMatch(/There is no account/);
  });
});

describe('ABOUT_TEXT acknowledgements', () => {
  it('lists Core team, Louisiana French, and Kouri-Vini in the provided order', () => {
    expect(sectionNames('Core team')).toEqual([
      'Westley Sturham',
      'Marguerite Justus - CODOFIL',
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
      'Marguerite Justus - CODOFIL',
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
