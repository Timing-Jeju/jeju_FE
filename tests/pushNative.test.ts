import { pushNativeAdapter } from '@/services/pushNative';

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  PermissionStatus: {
    DENIED: 'denied',
    GRANTED: 'granted',
    UNDETERMINED: 'undetermined',
  },
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) =>
    mockRequestPermissionsAsync(...args),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));
jest.mock('@react-native-firebase/app', () => ({ getApps: jest.fn(() => []) }));
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(),
  onTokenRefresh: jest.fn(),
}));

test('재질문 가능한 Android denied도 DENIED lifecycle로 매핑한다', async () => {
  mockGetPermissionsAsync.mockResolvedValue({
    status: 'denied',
    granted: false,
    canAskAgain: true,
  });

  await expect(pushNativeAdapter.getPermissionStatus()).resolves.toBe('DENIED');

  mockRequestPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  });
  await expect(pushNativeAdapter.requestPermission()).resolves.toBe('GRANTED');
  expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
});
