import AsyncStorage from '@react-native-async-storage/async-storage';
import { userEvent } from '@testing-library/react-native';
import { afterEach, beforeEach, jest } from '@jest/globals';

export function setupAppTests() {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
}

export function setupUser() {
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}
