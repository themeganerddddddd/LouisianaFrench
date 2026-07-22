// Shared Jest setup.
//
// Mocks native dependencies so module and rendered tests can run in the Jest
// environment without touching production code. Add further isolation here
// only as new tests require it.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
