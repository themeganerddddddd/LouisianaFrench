import { collectDeviceInfo } from '../deviceInfo';

const DeviceType = { UNKNOWN: 0, PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 };

const mockDevice = {
  brand: null,
  manufacturer: null,
  modelName: null,
  osName: null,
  osVersion: null,
  osBuildId: null,
  deviceType: null,
  DeviceType
};

const mockConstants = {
  expoConfig: null
};

let mockPlatformOS;

jest.mock('react-native', () => ({
  Platform: {
    get OS() { return mockPlatformOS; }
  }
}));

jest.mock('expo-device', () => ({
  get brand() { return mockDevice.brand; },
  get manufacturer() { return mockDevice.manufacturer; },
  get modelName() { return mockDevice.modelName; },
  get osName() { return mockDevice.osName; },
  get osVersion() { return mockDevice.osVersion; },
  get osBuildId() { return mockDevice.osBuildId; },
  get deviceType() { return mockDevice.deviceType; },
  get DeviceType() { return mockDevice.DeviceType; }
}));

jest.mock('expo-constants', () => ({
  get expoConfig() { return mockConstants.expoConfig; }
}));

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-07-26T20:15:00.000Z') });
  mockPlatformOS = 'ios';
  mockDevice.brand = 'Apple';
  mockDevice.manufacturer = 'Apple';
  mockDevice.modelName = 'iPhone 15';
  mockDevice.osName = 'iOS';
  mockDevice.osVersion = '17.4';
  mockDevice.osBuildId = '21E219';
  mockDevice.deviceType = DeviceType.PHONE;
  mockConstants.expoConfig = { version: '1.0.2' };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('collectDeviceInfo', () => {
  it('gathers a complete device report on iOS', () => {
    const info = collectDeviceInfo({ language: 'kreole', screenName: 'Dictionary' });

    expect(info).toEqual({
      appVersion: '1.0.2',
      platform: 'ios',
      osName: 'iOS',
      osVersion: '17.4',
      osBuildId: '21E219',
      brand: 'Apple',
      model: 'iPhone 15',
      deviceType: 'phone',
      language: 'kreole',
      screenName: 'Dictionary',
      submittedAt: '2026-07-26T20:15:00.000Z'
    });
  });

  it('gathers a complete device report on Android', () => {
    mockPlatformOS = 'android';
    mockDevice.brand = 'Samsung';
    mockDevice.manufacturer = 'Samsung';
    mockDevice.modelName = 'Galaxy S23';
    mockDevice.osName = 'Android';
    mockDevice.osVersion = '14';
    mockDevice.osBuildId = 'UP1A.231005.007';
    mockDevice.deviceType = DeviceType.PHONE;

    const info = collectDeviceInfo({ language: 'cajun', screenName: 'Home' });

    expect(info).toEqual({
      appVersion: '1.0.2',
      platform: 'android',
      osName: 'Android',
      osVersion: '14',
      osBuildId: 'UP1A.231005.007',
      brand: 'Samsung',
      model: 'Galaxy S23',
      deviceType: 'phone',
      language: 'cajun',
      screenName: 'Home',
      submittedAt: '2026-07-26T20:15:00.000Z'
    });
  });

  it('uses unknown for missing values', () => {
    mockDevice.brand = null;
    mockDevice.manufacturer = null;
    mockDevice.modelName = null;
    mockDevice.osName = null;
    mockDevice.osVersion = null;
    mockDevice.osBuildId = null;
    mockDevice.deviceType = DeviceType.UNKNOWN;
    mockConstants.expoConfig = null;

    const info = collectDeviceInfo({});

    expect(info).toEqual({
      appVersion: 'unknown',
      platform: 'ios',
      osName: 'unknown',
      osVersion: 'unknown',
      osBuildId: 'unknown',
      brand: 'unknown',
      model: 'unknown',
      deviceType: 'unknown',
      language: 'unknown',
      screenName: 'unknown',
      submittedAt: '2026-07-26T20:15:00.000Z'
    });
  });

  it('maps web platform to web device type', () => {
    mockPlatformOS = 'web';
    mockDevice.brand = null;
    mockDevice.manufacturer = null;
    mockDevice.modelName = null;
    mockDevice.osName = null;
    mockDevice.osVersion = null;
    mockDevice.osBuildId = null;
    mockDevice.deviceType = DeviceType.UNKNOWN;
    mockConstants.expoConfig = null;

    const info = collectDeviceInfo({});

    expect(info).toEqual({
      appVersion: 'unknown',
      platform: 'web',
      osName: 'unknown',
      osVersion: 'unknown',
      osBuildId: 'unknown',
      brand: 'unknown',
      model: 'unknown',
      deviceType: 'web',
      language: 'unknown',
      screenName: 'unknown',
      submittedAt: '2026-07-26T20:15:00.000Z'
    });
  });

  it('maps tablet device type', () => {
    mockDevice.modelName = 'iPad Pro';
    mockDevice.deviceType = DeviceType.TABLET;

    const info = collectDeviceInfo({});
    expect(info.deviceType).toBe('tablet');
  });

  it.each([DeviceType.DESKTOP, DeviceType.TV])(
    'uses unknown for unsupported native device type %s',
    (deviceType) => {
      mockDevice.deviceType = deviceType;

      const info = collectDeviceInfo({});
      expect(info.deviceType).toBe('unknown');
    }
  );
});
