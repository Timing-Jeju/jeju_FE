import { createIdempotencyKey } from '@/services/api';

/**
 * 이 기기를 가리키는 canonical UUID — 푸시 기기 등록(PUT /me/push-devices/{deviceId})에 쓴다.
 *
 * TODO: 지금은 앱을 다시 켜면 값이 바뀐다. 서버에 기기 행이 쌓이지 않으려면
 * 저장소(AsyncStorage / SecureStore)가 붙는 대로 최초 1회만 만들어 보관해야 한다.
 * (로그인 상태도 아직 저장하지 않으므로 현재 동작과는 어긋나지 않는다.)
 */
let deviceId: string | null = null;

export const getDeviceId = () => {
  if (!deviceId) deviceId = createIdempotencyKey();
  return deviceId;
};
