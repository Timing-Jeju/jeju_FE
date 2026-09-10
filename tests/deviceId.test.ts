import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEVICE_ID_STORAGE_KEY,
  getStableDeviceId,
  resetDeviceIdCacheForTests,
} from '@/services/deviceId';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

beforeEach(() => resetDeviceIdCacheForTests());

test('동시에 요청해도 canonical UUID를 한 번만 생성·저장한다', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);

  const [first, second] = await Promise.all([
    getStableDeviceId(),
    getStableDeviceId(),
  ]);

  expect(first).toBe(second);
  expect(first).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    DEVICE_ID_STORAGE_KEY,
    first,
  );
});

test('앱 재시작 뒤 저장된 ID를 재사용하고 손상 값은 교체한다', async () => {
  const stored = '11300000-0000-4000-8000-000000000101';
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(stored);
  expect(await getStableDeviceId()).toBe(stored);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();

  resetDeviceIdCacheForTests();
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('hardware-id');
  const replacement = await getStableDeviceId();
  expect(replacement).not.toBe('hardware-id');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    DEVICE_ID_STORAGE_KEY,
    replacement,
  );
});
