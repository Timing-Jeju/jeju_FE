import { getApps } from '@react-native-firebase/app';
import {
  getInitialNotification,
  getToken,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

import {
  deletePushDevice,
  isCanonicalUuid,
  registerPushDevice,
} from '@/services/api';
import {
  getFcmToken,
  getInitialPushRoute,
  getPushRoute,
  isPushConfigured,
  registerPushToken,
  requestNotificationPermission,
  unregisterPushToken,
} from '@/services/pushNotification';

jest.mock('@react-native-firebase/app', () => ({ getApps: jest.fn() }));
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(),
  getInitialNotification: jest.fn(),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' } },
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setAutoServerRegistrationEnabledAsync: jest.fn(() => Promise.resolve()),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api/idempotency'),
  registerPushDevice: jest.fn(),
  deletePushDevice: jest.fn(),
}));

const mockedGetApps = jest.mocked(getApps);
const mockedGetToken = jest.mocked(getToken);
const mockedGetInitial = jest.mocked(getInitialNotification);
const mockedPermissions = jest.mocked(Notifications.getPermissionsAsync);
const mockedRequestPermissions = jest.mocked(
  Notifications.requestPermissionsAsync,
);
const mockedRegister = jest.mocked(registerPushDevice);
const mockedDelete = jest.mocked(deletePushDevice);

const permission = (granted: boolean, canAskAgain: boolean) =>
  ({ granted, canAskAgain, status: granted ? 'granted' : 'denied' }) as never;

const configured = () => mockedGetApps.mockReturnValue([{} as never]);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockedGetApps.mockReturnValue([]);
  mockedPermissions.mockResolvedValue(permission(true, true));
});

describe('getPushRoute', () => {
  it('/ 로 시작하는 route 문자열만 앱 내부 경로로 인정한다', () => {
    expect(getPushRoute({ route: '/place-detail' })).toBe('/place-detail');
    expect(getPushRoute({ route: 'place-detail' })).toBeNull();
    expect(getPushRoute({ route: 3 })).toBeNull();
    expect(getPushRoute({})).toBeNull();
    expect(getPushRoute(undefined)).toBeNull();
  });
});

describe('isPushConfigured', () => {
  it('Firebase 앱이 초기화돼 있을 때만 true 다', () => {
    expect(isPushConfigured()).toBe(false);
    configured();
    expect(isPushConfigured()).toBe(true);
  });

  it('네이티브 모듈이 없어 예외가 나도 false 로 조용히 넘어간다', () => {
    mockedGetApps.mockImplementation(() => {
      throw new Error('No native module');
    });
    expect(isPushConfigured()).toBe(false);
  });
});

describe('requestNotificationPermission', () => {
  it('이미 허용됐으면 다시 묻지 않는다', async () => {
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockedRequestPermissions).not.toHaveBeenCalled();
  });

  it('다시 물을 수 없는 상태면 false 다', async () => {
    mockedPermissions.mockResolvedValue(permission(false, false));
    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(mockedRequestPermissions).not.toHaveBeenCalled();
  });

  it('아직 안 물어봤으면 요청 결과를 따른다', async () => {
    mockedPermissions.mockResolvedValue(permission(false, true));
    mockedRequestPermissions.mockResolvedValue(permission(true, true));
    await expect(requestNotificationPermission()).resolves.toBe(true);
  });
});

describe('getFcmToken', () => {
  it('설정이 없으면 토큰을 요청하지 않는다', async () => {
    await expect(getFcmToken()).resolves.toBeNull();
    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  it('설정이 있으면 토큰을 돌려주고 실패하면 null 이다', async () => {
    configured();
    mockedGetToken.mockResolvedValue('fcm-token');
    await expect(getFcmToken()).resolves.toBe('fcm-token');

    mockedGetToken.mockRejectedValue(new Error('no token'));
    await expect(getFcmToken()).resolves.toBeNull();
  });
});

describe('registerPushToken / unregisterPushToken', () => {
  it('기기 ID(UUID)와 앱 정보 · 권한 상태를 함께 등록한다', async () => {
    mockedRegister.mockResolvedValue({} as never);

    await registerPushToken('fcm-token');

    const [deviceId, body] = mockedRegister.mock.calls[0];
    expect(isCanonicalUuid(deviceId)).toBe(true);
    expect(body).toEqual({
      platform: 'IOS',
      registrationToken: 'fcm-token',
      permissionStatus: 'GRANTED',
      appVersion: '1.2.3',
      locale: 'ko-KR',
      timeZone: 'Asia/Seoul',
    });
  });

  it('같은 기기는 같은 ID 로 등록하고, 해제도 같은 ID 로 한다', async () => {
    mockedRegister.mockResolvedValue({} as never);
    mockedDelete.mockResolvedValue();

    await registerPushToken('a');
    await registerPushToken('b');
    await unregisterPushToken();

    const ids = mockedRegister.mock.calls.map(([deviceId]) => deviceId);
    expect(ids[0]).toBe(ids[1]);
    expect(mockedDelete).toHaveBeenCalledWith(ids[0]);
  });

  it('권한 상태를 서버 값(NOT_DETERMINED / DENIED)으로 옮긴다', async () => {
    mockedRegister.mockResolvedValue({} as never);

    mockedPermissions.mockResolvedValue(permission(false, true));
    await registerPushToken('t');
    mockedPermissions.mockResolvedValue(permission(false, false));
    await registerPushToken('t');

    expect(
      mockedRegister.mock.calls.map(([, body]) => body.permissionStatus),
    ).toEqual(['NOT_DETERMINED', 'DENIED']);
  });

  it('서버 등록 · 해제가 실패해도 예외를 밖으로 던지지 않는다', async () => {
    mockedRegister.mockRejectedValue(new Error('500'));
    mockedDelete.mockRejectedValue(new Error('404'));

    await expect(registerPushToken('t')).resolves.toBeUndefined();
    await expect(unregisterPushToken()).resolves.toBeUndefined();
  });
});

describe('getInitialPushRoute', () => {
  it('설정이 없으면 null, 있으면 알림의 route 를 돌려준다', async () => {
    await expect(getInitialPushRoute()).resolves.toBeNull();
    expect(mockedGetInitial).not.toHaveBeenCalled();

    configured();
    mockedGetInitial.mockResolvedValue({
      data: { route: '/live-map' },
    } as never);
    await expect(getInitialPushRoute()).resolves.toBe('/live-map');

    mockedGetInitial.mockResolvedValue(null);
    await expect(getInitialPushRoute()).resolves.toBeNull();
  });
});
