import { act, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import Screen from '@/app/schedule-loading';

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
const mockPoll = jest.fn();
const mockJournal = { runId: 'run', dayNo: 1 };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/services/generationFlow', () => ({
  useGenerationStore: (selector: (state: unknown) => unknown) =>
    selector({ journal: mockJournal }),
  pollGeneration: (...args: unknown[]) => mockPoll(...args),
  discardFinishedGeneration: jest.fn(),
  resumeGenerationApplication: jest.fn(),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

test('Retry-After를 따르고 백그라운드에서 중단한 뒤 같은 작업 조회를 재개한다', async () => {
  jest.useFakeTimers();
  Object.defineProperty(AppState, 'currentState', {
    value: 'active',
    configurable: true,
  });
  let change!: (state: string) => void;
  const remove = jest.fn();
  const listener = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, callback) => {
      change = callback as (state: string) => void;
      return { remove };
    });
  mockPoll.mockResolvedValue({
    run: { status: 'queued' },
    retryAfterSeconds: 7,
  });
  const screen = await render(<Screen />);
  expect(mockPoll).toHaveBeenCalledTimes(1);
  expect(screen.getByText('일정 생성 대기 중')).toBeTruthy();
  await act(() => {
    jest.advanceTimersByTime(6000);
  });
  expect(mockPoll).toHaveBeenCalledTimes(1);
  await act(() => {
    change('background');
    jest.advanceTimersByTime(20000);
  });
  expect(mockPoll).toHaveBeenCalledTimes(1);
  await act(() => {
    change('active');
  });
  expect(mockPoll).toHaveBeenCalledTimes(2);
  expect(mockReplace).not.toHaveBeenCalled();
  await screen.unmount();
  expect(remove).toHaveBeenCalled();
  listener.mockRestore();
  jest.useRealTimers();
});
