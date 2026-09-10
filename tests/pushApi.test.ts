import { request, requestData } from '@/services/api/http';
import { ApiError } from '@/services/api/problem';
import {
  deletePushDevice,
  fetchNotificationPreference,
  registerPushDevice,
  updateNotificationPreference,
} from '@/services/api/push';

jest.mock('@/services/api/http', () => ({
  request: jest.fn(),
  requestData: jest.fn(),
}));

const deviceId = '11300000-0000-4000-8000-000000000101';
const registration = {
  platform: 'ANDROID' as const,
  registrationToken: 'safe-fixture-token',
  permissionStatus: 'GRANTED' as const,
  appVersion: '1.0.1',
  locale: 'ko-KR',
  timeZone: 'Asia/Seoul',
};

test('기기 PUT replay와 DELETE는 고정 공개 경로를 사용한다', async () => {
  jest.mocked(requestData).mockResolvedValue({ active: true });
  jest.mocked(request).mockResolvedValue({
    data: undefined,
    status: 204,
    etag: null,
    location: null,
    idempotencyReplayed: null,
    traceId: null,
  });

  await registerPushDevice(deviceId, registration);
  await registerPushDevice(deviceId, registration);
  await deletePushDevice(deviceId);

  expect(jest.mocked(requestData).mock.calls).toEqual([
    [
      {
        method: 'PUT',
        path: `/me/push-devices/${deviceId}`,
        auth: 'required',
        body: registration,
      },
    ],
    [
      {
        method: 'PUT',
        path: `/me/push-devices/${deviceId}`,
        auth: 'required',
        body: registration,
      },
    ],
  ]);
  expect(request).toHaveBeenCalledWith({
    method: 'DELETE',
    path: `/me/push-devices/${deviceId}`,
    auth: 'required',
  });
});

test('기기 ID, token, preference 범위를 외부 요청 전에 검증한다', async () => {
  await expect(
    registerPushDevice('hardware-id', registration),
  ).rejects.toBeInstanceOf(ApiError);
  await expect(
    registerPushDevice(deviceId, {
      ...registration,
      registrationToken: 'token\nleak',
    }),
  ).rejects.toBeInstanceOf(ApiError);
  await expect(
    updateNotificationPreference({ safetyBufferMinutes: 121 }),
  ).rejects.toBeInstanceOf(ApiError);
  expect(requestData).not.toHaveBeenCalled();
});

test('preference GET/PATCH는 generated 계약 필드만 사용한다', async () => {
  jest.mocked(requestData).mockResolvedValue({
    nextDestinationDepartureEnabled: true,
    safetyBufferMinutes: 20,
    updatedAt: null,
  });
  await fetchNotificationPreference();
  await updateNotificationPreference({
    nextDestinationDepartureEnabled: true,
    safetyBufferMinutes: 20,
  });
  expect(jest.mocked(requestData).mock.calls).toEqual([
    [
      {
        method: 'GET',
        path: '/me/notification-preferences',
        auth: 'required',
      },
    ],
    [
      {
        method: 'PATCH',
        path: '/me/notification-preferences',
        auth: 'required',
        body: {
          nextDestinationDepartureEnabled: true,
          safetyBufferMinutes: 20,
        },
      },
    ],
  ]);
});
