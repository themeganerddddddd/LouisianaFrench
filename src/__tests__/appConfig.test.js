/**
 * @jest-environment node
 */
const path = require('path');
const { getConfig } = require('@expo/config');

describe('Expo app config', () => {
  const projectRoot = path.dirname(require.resolve('../../app.json'));
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  it('builds Android with the Google Play listing package name', () => {
    expect(exp.android.package).toBe('com.louisianalanguages.app');
  });
});
