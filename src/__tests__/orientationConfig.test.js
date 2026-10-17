const { getConfig } = require(
  require.resolve('@expo/config', {
    paths: [require.resolve('expo/package.json')]
  })
);

describe('orientation config', () => {
  it('allows Android rotation while keeping iPhone portrait-only and iPad open', () => {
    const { exp } = getConfig(process.cwd(), {
      skipSDKVersionRequirement: true
    });
    const infoPlist = exp.ios?.infoPlist ?? {};

    expect(exp.orientation).toBe('default');
    expect(infoPlist.UISupportedInterfaceOrientations).toEqual([
      'UIInterfaceOrientationPortrait'
    ]);
    expect(infoPlist['UISupportedInterfaceOrientations~ipad']).toEqual([
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight'
    ]);
  });
});
