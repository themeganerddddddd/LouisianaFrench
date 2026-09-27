const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

// Unfolding crosses the sw600dp bucket; without this, Android recreates MainActivity and,
// because MainActivity calls super.onCreate(null), the in-memory Lesson state is lost.
const SMALLEST_SCREEN_SIZE = 'smallestScreenSize';

module.exports = function withConfigChanges(config) {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    const changes = (activity.$['android:configChanges'] ?? '').split('|').filter(Boolean);

    if (!changes.includes(SMALLEST_SCREEN_SIZE)) {
      activity.$['android:configChanges'] = [...changes, SMALLEST_SCREEN_SIZE].join('|');
    }

    return config;
  });
};
