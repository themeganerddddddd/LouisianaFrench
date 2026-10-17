const { getConfig } = require(
  require.resolve('@expo/config', {
    paths: [require.resolve('expo/package.json')]
  })
);

function androidBuildProperties(exp) {
  const plugin = (exp.plugins || []).find((entry) =>
    Array.isArray(entry)
      ? entry[0] === 'expo-build-properties'
      : entry === 'expo-build-properties'
  );

  if (!Array.isArray(plugin)) {
    return null;
  }

  return plugin[1]?.android ?? null;
}

describe('Android release build config', () => {
  it('enables R8 minify and keeps resource shrinking off', () => {
    const { exp } = getConfig(process.cwd(), {
      skipSDKVersionRequirement: true
    });
    const android = androidBuildProperties(exp);

    expect(android).toEqual(
      expect.objectContaining({
        enableMinifyInReleaseBuilds: true
      })
    );
    expect(android.enableShrinkResourcesInReleaseBuilds).not.toBe(true);
  });
});
