import { ApiError } from '@/services/api/problem';
import {
  createNotificationPreferenceController,
  type NotificationPreferenceApi,
} from '@/services/notificationPreferences';

jest.mock('@/services/api/push', () => ({
  fetchNotificationPreference: jest.fn(),
  updateNotificationPreference: jest.fn(),
}));

const initial = {
  nextDestinationDepartureEnabled: false,
  safetyBufferMinutes: 10,
  updatedAt: '2026-09-10T00:00:00Z',
};

test('사용자 전환 시 이전 계정 preference cache를 노출하지 않는다', async () => {
  const api: jest.Mocked<NotificationPreferenceApi> = {
    fetch: jest.fn(async () => initial),
    update: jest.fn(async (_patch) => initial),
  };
  const controller = createNotificationPreferenceController(api);

  await controller.load('user-a');
  expect(controller.snapshot('user-a')).toEqual({
    status: 'ready',
    preference: initial,
  });
  expect(controller.snapshot('user-b')).toEqual({ status: 'idle' });
});

test('stale conflict는 성공으로 꾸미지 않고 서버 값을 다시 조회한다', async () => {
  const latest = { ...initial, safetyBufferMinutes: 30 };
  const api: jest.Mocked<NotificationPreferenceApi> = {
    fetch: jest
      .fn()
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(latest),
    update: jest.fn(async (_patch) => {
      throw new ApiError({ status: 409, code: 'CONFLICT' });
    }),
  };
  const controller = createNotificationPreferenceController(api);
  await controller.load('user-a');

  await expect(
    controller.update('user-a', { safetyBufferMinutes: 20 }),
  ).resolves.toEqual({ status: 'conflict', preference: latest });
  expect(controller.snapshot('user-a')).toEqual({
    status: 'conflict',
    preference: latest,
  });
  expect(api.fetch).toHaveBeenCalledTimes(2);
});

test('동시 변경을 직렬화해 늦은 응답이 새 값을 덮지 않는다', async () => {
  const api: jest.Mocked<NotificationPreferenceApi> = {
    fetch: jest.fn(async () => initial),
    update: jest.fn(async (patch) => ({ ...initial, ...patch })),
  };
  const controller = createNotificationPreferenceController(api);
  await controller.load('user-a');

  await Promise.all([
    controller.update('user-a', { safetyBufferMinutes: 20 }),
    controller.update('user-a', { safetyBufferMinutes: 30 }),
  ]);

  expect(api.update.mock.calls).toEqual([
    [{ safetyBufferMinutes: 20 }],
    [{ safetyBufferMinutes: 30 }],
  ]);
  expect(controller.snapshot('user-a')).toMatchObject({
    preference: { safetyBufferMinutes: 30 },
  });
});
