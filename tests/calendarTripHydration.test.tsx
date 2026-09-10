import { render, waitFor } from '@testing-library/react-native';

import Calendar from '@/app/(tabs)/calendar';
import { useTripStore } from '@/store/useTripStore';

const mockHydrateLatestTrip = jest.fn();

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (callback: () => void) => {
      React.useEffect(callback, [callback]);
    },
  };
});
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/hooks/useTripPersistence', () => ({
  useTripPersistence: () => ({ hydrateLatestTrip: mockHydrateLatestTrip }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockHydrateLatestTrip.mockResolvedValue(null);
  useTripStore.setState(useTripStore.getInitialState(), true);
});

test('서버 root가 복원됐지만 상세 입력이 없으면 재조회 없이 조건 안내를 유지한다', async () => {
  useTripStore.setState({ saved: true, draftSaved: false });

  const screen = await render(<Calendar />);

  await waitFor(() => expect(mockHydrateLatestTrip).not.toHaveBeenCalled());
  expect(screen.getByText('여행 기본 조건 설정 후 이용 가능해요')).toBeTruthy();
});

test('root가 없을 때 hydration 실패해도 조건 안내를 유지하고 오류를 삼킨다', async () => {
  mockHydrateLatestTrip.mockRejectedValueOnce(new Error('offline'));

  const screen = await render(<Calendar />);

  await waitFor(() => expect(mockHydrateLatestTrip).toHaveBeenCalledTimes(1));
  expect(screen.getByText('여행 기본 조건 설정 후 이용 가능해요')).toBeTruthy();
});
