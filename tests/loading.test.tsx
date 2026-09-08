import { act, render } from '@testing-library/react-native';
import ScheduleLoadingScreen from '@/app/schedule-loading';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

test('실제 run이 없으면 시간이 지나도 추천 완료 화면으로 이동하지 않는다', async () => {
  jest.useFakeTimers();
  const screen = await render(<ScheduleLoadingScreen />);
  await act(() => jest.advanceTimersByTime(10000));
  expect(screen.getByText('일정 서비스 준비 중')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  jest.useRealTimers();
});
