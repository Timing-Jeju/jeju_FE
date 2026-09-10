import { act, render, waitFor } from '@testing-library/react-native';

import Calendar from '@/app/(tabs)/calendar';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';

const mockMoveItem = jest.fn();
const mockHydrateSchedule = jest.fn();

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (callback: () => void) =>
      React.useEffect(callback, [callback]),
  };
});
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/hooks/useTripPersistence', () => ({
  useTripPersistence: () => ({ hydrateLatestTrip: jest.fn() }),
}));
jest.mock('@/hooks/useSchedulePersistence', () => ({
  useSchedulePersistence: () => ({
    hydrateSchedule: mockHydrateSchedule,
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
    moveItem: mockMoveItem,
    reorderDay: jest.fn(),
  }),
}));
jest.mock('@/components/ui/MenuIcon', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MenuIcon: ({ accessibilityLabel, onPress }: Record<string, unknown>) =>
      React.createElement(Text, { accessibilityLabel, onPress }, '⋮'),
  };
});
jest.mock('@/components/ui/PopoverMenu', () => {
  const React = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  return {
    PopoverMenu: ({ visible, items, onSelect }: Record<string, any>) =>
      visible
        ? React.createElement(
            View,
            null,
            items.map((item: { key: string; label: string }) =>
              React.createElement(
                Text,
                { key: item.key, onPress: () => onSelect(item.key) },
                item.label,
              ),
            ),
          )
        : null,
  };
});
jest.mock('@/components/ui/OptionSheet', () => {
  const React = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  return {
    OptionSheet: ({ visible, options, onSelect }: Record<string, any>) =>
      visible
        ? React.createElement(
            View,
            null,
            options.map((item: { key: string; label: string }) =>
              React.createElement(
                Text,
                { key: item.key, onPress: () => onSelect(item.key) },
                item.label,
              ),
            ),
          )
        : null,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockHydrateSchedule.mockResolvedValue(null);
  mockMoveItem.mockResolvedValue(null);
  useTripStore.setState({
    draftSaved: true,
    saved: true,
    tripId: '50000000-0000-4000-8000-000000000001',
    startDate: '2026-09-10',
    endDate: '2026-09-11',
  });
  useScheduleStore.setState({
    activeVersionId: '60000000-0000-4000-8000-000000000001',
    versionNo: 2,
    places: {
      1: [
        {
          itemId: '61000000-0000-4000-8000-000000000001',
          placeId: '34000000-0000-4000-8000-000000000001',
          name: '성산일출봉',
          category: '관광지',
          address: '제주',
          visitType: null,
          stayMinutes: 60,
          coord: null,
          progressStatus: 'planned',
        },
      ],
      2: [],
    },
  });
});

test('일정 화면은 versionNo를 표시하고 메뉴에서 다른 날짜 move를 호출한다', async () => {
  const screen = await render(<Calendar />);
  expect(screen.getByText('1일차 일정 항목 · v2')).toBeTruthy();

  await act(async () => {
    screen.getByLabelText('일정 항목 더보기').props.onPress({
      nativeEvent: { pageY: 100 },
    });
  });
  await act(async () => {
    screen.getByText('다른 날짜로 이동하기').props.onPress();
  });
  await act(async () => {
    screen.getByText('2일차').props.onPress();
  });

  await waitFor(() =>
    expect(mockMoveItem).toHaveBeenCalledWith(
      '61000000-0000-4000-8000-000000000001',
      2,
      1,
    ),
  );
});

test('항목이 없어도 보류된 일정 저장 복구 진입점을 표시한다', async () => {
  useScheduleStore.setState({
    places: { 1: [], 2: [] },
    pendingMutationRecovery: true,
  });

  const screen = await render(<Calendar />);

  expect(screen.getByText('이전 일정 저장 복구하기')).toBeTruthy();
});
