import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

function valueOrUnknown(value) {
  if (value === null || value === undefined) {
    return 'unknown';
  }
  const text = String(value).trim();
  return text ? text : 'unknown';
}

function mapDeviceType(deviceType) {
  if (deviceType === Device.DeviceType.PHONE) return 'phone';
  if (deviceType === Device.DeviceType.TABLET) return 'tablet';
  return 'unknown';
}

export function collectDeviceInfo({ language, screenName } = {}) {
  const appVersion = valueOrUnknown(Constants.expoConfig?.version);

  let deviceType;
  if (Platform.OS === 'web') {
    deviceType = 'web';
  } else {
    deviceType = mapDeviceType(Device.deviceType);
  }

  return {
    appVersion,
    platform: valueOrUnknown(Platform.OS),
    osName: valueOrUnknown(Device.osName),
    osVersion: valueOrUnknown(Device.osVersion),
    osBuildId: valueOrUnknown(Device.osBuildId),
    brand: valueOrUnknown(Device.brand || Device.manufacturer),
    model: valueOrUnknown(Device.modelName),
    deviceType,
    language: valueOrUnknown(language),
    screenName: valueOrUnknown(screenName),
    submittedAt: new Date().toISOString()
  };
}
