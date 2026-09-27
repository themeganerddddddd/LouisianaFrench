const withConfigChanges = require('../withConfigChanges');

const TEMPLATE_CONFIG_CHANGES =
  'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode';

function manifestFixture(activities) {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      application: [{ $: { 'android:name': '.MainApplication' }, activity: activities }]
    }
  };
}

function mainActivity(configChanges = TEMPLATE_CONFIG_CHANGES) {
  return { $: { 'android:name': '.MainActivity', 'android:configChanges': configChanges } };
}

async function applyPlugin(androidManifest) {
  const config = withConfigChanges({ name: 'fixture', slug: 'fixture' });
  const result = await config.mods.android.manifest({
    ...config,
    modResults: androidManifest,
    modRequest: { platform: 'android', modName: 'manifest', introspect: true }
  });
  return result.modResults.manifest.application[0].activity;
}

describe('withConfigChanges', () => {
  it('keeps MainActivity alive when a foldable changes its smallest width', async () => {
    const [activity] = await applyPlugin(manifestFixture([mainActivity()]));

    expect(activity.$['android:configChanges']).toBe(
      `${TEMPLATE_CONFIG_CHANGES}|smallestScreenSize`
    );
  });

  it('does not duplicate smallestScreenSize or touch other activities', async () => {
    const other = { $: { 'android:name': '.OtherActivity', 'android:configChanges': 'orientation' } };
    const [activity, untouched] = await applyPlugin(manifestFixture([
      mainActivity(`${TEMPLATE_CONFIG_CHANGES}|smallestScreenSize`),
      other
    ]));

    expect(activity.$['android:configChanges']).toBe(
      `${TEMPLATE_CONFIG_CHANGES}|smallestScreenSize`
    );
    expect(untouched.$['android:configChanges']).toBe('orientation');
  });

  it('fails clearly when the manifest has no MainActivity', async () => {
    await expect(applyPlugin(manifestFixture([]))).rejects.toThrow(/MainActivity/);
  });
});
