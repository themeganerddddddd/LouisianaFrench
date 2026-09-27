/**
 * @jest-environment node
 */
const path = require('path');
const { getConfig } = require('expo/config');
const { compileModsAsync, withPlugins } = require('expo/config-plugins');

const projectRoot = path.dirname(require.resolve('../app.json'));

async function resolveAndroidGradleProperties() {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const config = await compileModsAsync(withPlugins(exp, exp.plugins), {
    projectRoot,
    platforms: ['android'],
    introspect: true,
    assertMissingModProviders: false
  });

  return Object.fromEntries(
    config._internal.modResults.android.gradleProperties
      .filter((entry) => entry.type === 'property')
      .map((entry) => [entry.key, entry.value])
  );
}

describe('Android release build config', () => {
  it('enables R8 minify and keeps resource shrinking off', async () => {
    const gradleProperties = await resolveAndroidGradleProperties();

    expect(gradleProperties['android.enableMinifyInReleaseBuilds']).toBe('true');
    // Bundled Audio and images are looked up by name at runtime.
    expect(gradleProperties['android.enableShrinkResourcesInReleaseBuilds']).toBe('false');
  });
});
