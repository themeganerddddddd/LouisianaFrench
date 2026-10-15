const { getConfig } = require(
  require.resolve('@expo/config', {
    paths: [require.resolve('expo/package.json')]
  })
);

function secureStorePlugin(exp) {
  return (exp.plugins || []).find((entry) =>
    Array.isArray(entry)
      ? entry[0] === 'expo-secure-store'
      : entry === 'expo-secure-store'
  );
}

describe('SecureStore config', () => {
  it('configures Android backup and the app scheme', () => {
    const { exp } = getConfig(process.cwd(), {
      skipSDKVersionRequirement: true
    });
    const plugin = secureStorePlugin(exp);

    expect(Array.isArray(plugin)).toBe(true);
    expect(plugin[1].configureAndroidBackup).toBe(true);
    expect(exp.scheme).toBe('com.westleysturhan.louisianafrench');
  });
});
