import AsyncStorage from '@react-native-async-storage/async-storage';

import { createIdempotencyKey } from './api/idempotency';

export const DEVICE_ID_STORAGE_KEY = '@timing-jeju/push-device-id/v1';

const CANONICAL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let deviceIdPromise: Promise<string> | null = null;

/** 광고/하드웨어 ID가 아닌 앱 설치별 UUID를 생성 후 영구 재사용한다. */
export function getStableDeviceId(): Promise<string> {
  if (deviceIdPromise) return deviceIdPromise;
  deviceIdPromise = (async () => {
    const stored = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored && CANONICAL_UUID.test(stored)) return stored;
    const generated = createIdempotencyKey().toLowerCase();
    if (!CANONICAL_UUID.test(generated)) {
      throw new Error('기기 식별자를 만들 수 없습니다.');
    }
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  })().catch((error) => {
    deviceIdPromise = null;
    throw error;
  });
  return deviceIdPromise;
}

/** @internal Jest에서 앱 재시작을 재현한다. */
export const resetDeviceIdCacheForTests = () => {
  deviceIdPromise = null;
};
