// Shared Jest setup.
//
// Mocks native dependencies so module and rendered tests can run in the Jest
// environment without touching production code. Add further isolation here
// only as new tests require it.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

// Models expo-audio on iOS and Android: remove() only unregisters the player
// and does not stop it; pause() and release() stop it; release() does not
// unregister it; any call after release() throws.
function mockAudioPlayer() {
  const player = { playing: false, registered: true, released: false };
  const call = (fn) =>
    jest.fn(() => {
      if (player.released) throw new Error('Audio player was already released');
      fn();
    });
  player.play = call(() => { player.playing = true; });
  player.pause = call(() => { player.playing = false; });
  player.remove = call(() => { player.registered = false; });
  player.release = jest.fn(() => {
    player.playing = false;
    player.released = true;
  });
  return player;
}

jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => {}),
  createAudioPlayer: jest.fn(() => mockAudioPlayer()),
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(async () => {}),
    record: jest.fn(),
    stop: jest.fn(async () => {}),
    uri: null,
    isRecording: false
  })),
  useAudioRecorderState: jest.fn(() => ({
    isRecording: false,
    durationMillis: 0
  }))
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: ({ children, ...props }) =>
      React.createElement(View, props, children),
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: (component) => component,
    Directions: {}
  };
});
