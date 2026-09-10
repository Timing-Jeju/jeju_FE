import { act, renderHook } from '@testing-library/react-native';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const initial = {
  nextDestinationDepartureEnabled: false,
  safetyBufferMinutes: 10,
  updatedAt: '2026-09-10T00:00:00Z',
};
const userBPreference = { ...initial, safetyBufferMinutes: 30 };
const mockFetch = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/services/api/push', () => ({
  fetchNotificationPreference: (...args: unknown[]) => mockFetch(...args),
  updateNotificationPreference: (...args: unknown[]) => mockUpdate(...args),
}));

test('이전 사용자 update 완료는 새 사용자 preference UI를 덮지 않는다', async () => {
  let finishUserAUpdate!: (value: typeof initial) => void;
  mockFetch
    .mockResolvedValueOnce(initial)
    .mockResolvedValueOnce(userBPreference);
  mockUpdate.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishUserAUpdate = resolve;
      }),
  );
  const { result, rerender } = await renderHook(
    ({ userId }: { userId: string }) => useNotificationPreferences(userId),
    { initialProps: { userId: 'user-a' } },
  );
  await act(async () => undefined);

  let oldUpdate!: Promise<unknown>;
  await act(async () => {
    oldUpdate = result.current.update({ safetyBufferMinutes: 20 });
  });
  await rerender({ userId: 'user-b' });
  await act(async () => undefined);
  expect(result.current.state).toEqual({
    status: 'ready',
    preference: userBPreference,
  });

  await act(async () => {
    finishUserAUpdate(initial);
    await oldUpdate;
  });

  expect(result.current.state).toEqual({
    status: 'ready',
    preference: userBPreference,
  });
});
