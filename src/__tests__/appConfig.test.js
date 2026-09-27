/**
 * @jest-environment node
 */
const path = require('path');
const { getConfig } = require('expo/config');
const { compileModsAsync, withGradleProperties, withPlugins } = require('expo/config-plugins');

const projectRoot = path.dirname(require.resolve('../../app.json'));

describe('Android release build config', () => {
  async function resolveAndroidGradleProperties() {
    const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
    let gradleProperties;
    // Mods registered earlier run later, so this captures the file after every app plugin.
    const withCapturedGradleProperties = withGradleProperties(exp, (config) => {
      gradleProperties = config.modResults;
      return config;
    });
    await compileModsAsync(withPlugins(withCapturedGradleProperties, exp.plugins), {
      projectRoot,
      platforms: ['android'],
      introspect: true,
      assertMissingModProviders: false
    });

    return Object.fromEntries(
      gradleProperties
        .filter((entry) => entry.type === 'property')
        .map((entry) => [entry.key, entry.value])
    );
  }

  it('enables R8 minify and keeps resource shrinking off', async () => {
    const gradleProperties = await resolveAndroidGradleProperties();

    expect(gradleProperties['android.enableMinifyInReleaseBuilds']).toBe('true');
    // Bundled Audio and images are looked up by name at runtime.
    expect(gradleProperties['android.enableShrinkResourcesInReleaseBuilds']).toBe('false');
  });
});
