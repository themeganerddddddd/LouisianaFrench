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

jest.mock('expo-av', () => {
  const unloadAsync = jest.fn(async () => {});
  const playAsync = jest.fn(async () => {});

  return {
    Audio: {
      setAudioModeAsync: jest.fn(async () => {}),
      Sound: {
        createAsync: jest.fn(async () => ({
          sound: { playAsync, unloadAsync }
        }))
      }
    }
  };
});

jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => {}),
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
