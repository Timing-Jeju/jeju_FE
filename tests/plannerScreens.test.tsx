import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Review from '@/app/schedule-review';
import Leg from '@/app/schedule-leg';
import Live from '@/app/live-map';
import { useScheduleStore } from '@/store/useScheduleStore';
import { requestLocationPermission } from '@/services/location';
import { getDrivingRoute } from '@/services/naverApi';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ day: '1', legId: 'old' }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@mj-studio/react-native-naver-map', () => {
  const { View } = jest.requireActual('react-native');
  return {
    NaverMapView: View,
    NaverMapMarkerOverlay: View,
    NaverMapPathOverlay: View,
  };
});
jest.mock('@/services/location', () => ({
  requestLocationPermission: jest.fn(),
}));
jest.mock('@/services/naverApi', () => ({ getDrivingRoute: jest.fn() }));
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

beforeEach(() => {
  useScheduleStore.setState({
    reviews: {
      1: {
        summary: '과거 모의 결과',
        mode: 'ai',
        dirty: false,
        confirmed: true,
        legs: [],
      },
    },
  });
});

test('활성화된 검토도 서버 일정이 없으면 과거 모의 결과를 숨긴다', async () => {
  const screen = await render(<Review />);
  expect(screen.getByText('일정 검토')).toBeTruthy();
  expect(screen.getByText(/아직 생성된 일정이 없어요/)).toBeTruthy();
  expect(screen.queryByText('과거 모의 결과')).toBeNull();
});

test('공개 서버 일정 구간은 검토 화면에 표시한다', async () => {
  useScheduleStore.setState({
    reviews: {
      1: {
        summary: '서버 일정 버전 2',
        mode: 'manual',
        dirty: false,
        confirmed: false,
        serverBacked: true,
        legs: [
          {
            id: 'leg-1',
            from: '성산일출봉',
            to: '섭지코지',
            fromCoord: null,
            toCoord: null,
            status: 'cautionary',
            startTime: '09:00',
            endTime: '09:30',
            cost: 0,
            distanceText: '1.2km',
            reason: '서버 위험도 점수 20',
            steps: [],
            departStayMinutes: 60,
            slackMinutes: 10,
            buses: [],
          },
        ],
      },
    },
  });

  const screen = await render(<Review />);
  expect(screen.getByText('성산일출봉')).toBeTruthy();
  expect(screen.getByText('섭지코지')).toBeTruthy();
  expect(screen.queryByText(/일정 서비스 준비 중/)).toBeNull();
});

test('serverBacked dirty 일정의 미지원 재검사는 throw 없이 안내한다', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  useScheduleStore.setState({
    reviews: {
      1: {
        summary: '서버 일정 버전 2',
        mode: 'manual',
        dirty: true,
        confirmed: false,
        serverBacked: true,
        legs: [
          {
            id: 'old',
            from: '성산일출봉',
            to: '섭지코지',
            fromCoord: null,
            toCoord: null,
            status: 'cautionary',
            startTime: '09:00',
            endTime: '09:30',
            cost: null,
            distanceText: '거리 정보 없음',
            reason: '위험도 정보 미제공',
            steps: [],
            departStayMinutes: 60,
            slackMinutes: 10,
            buses: [],
          },
        ],
      },
    },
  });
  const screen = await render(<Review />);

  await fireEvent.press(screen.getByText('재검사 하기'));
  expect(alert).toHaveBeenCalledWith(
    '준비 중이에요',
    expect.stringContaining('재검사'),
  );
});

test('serverBacked 확정·재정렬·삭제는 unsupported 함수를 호출하지 않고 안내한다', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  useScheduleStore.setState({
    reviews: {
      1: {
        summary: '서버 일정 버전 2',
        mode: 'manual',
        dirty: false,
        confirmed: false,
        serverBacked: true,
        legs: [
          {
            id: 'old',
            from: '성산일출봉',
            to: '섭지코지',
            fromCoord: null,
            toCoord: null,
            status: 'cautionary',
            startTime: '09:00',
            endTime: '09:30',
            cost: null,
            distanceText: '거리 정보 없음',
            reason: '위험도 정보 미제공',
            steps: [],
            departStayMinutes: 60,
            slackMinutes: 10,
            buses: [],
          },
        ],
      },
    },
  });
  const screen = await render(<Review />);

  await fireEvent.press(screen.getByText('확정하기'));
  await act(async () => {
    screen.getByLabelText('일정 검토 더보기').props.onPress({
      nativeEvent: { pageY: 100 },
    });
  });
  await act(async () => {
    screen.getByText('일정 순서 변경하기').props.onPress();
  });
  await act(async () => {
    screen.getByLabelText('일정 검토 더보기').props.onPress({
      nativeEvent: { pageY: 100 },
    });
  });
  await act(async () => {
    screen.getByText('일정 삭제하기').props.onPress();
  });

  expect(alert).toHaveBeenCalledTimes(3);
  expect(alert).toHaveBeenLastCalledWith(
    '준비 중이에요',
    expect.stringContaining('일정 입력 화면'),
  );
});

test('미지원 구간 상세는 기존 빈 상태를 표시하고 경로 API를 호출하지 않는다', async () => {
  const screen = await render(<Leg />);
  expect(screen.getByText('상세 일정')).toBeTruthy();
  expect(screen.getByText('일정 정보를 찾을 수 없어요.')).toBeTruthy();
  expect(getDrivingRoute).not.toHaveBeenCalled();
});

test('실시간 화면은 기존 패널을 유지하면서 위치 수집과 가짜 시간·안전 판정을 하지 않는다', async () => {
  const screen = await render(<Live />);
  expect(screen.getByText('오늘의 일정')).toBeTruthy();
  expect(screen.getByText('실시간 안내는 준비 중이에요.')).toBeTruthy();
  expect(screen.queryByText('안전')).toBeNull();
  expect(screen.queryByText('위험')).toBeNull();
  expect(screen.queryByText(/0분 이내/)).toBeNull();
  expect(requestLocationPermission).not.toHaveBeenCalled();
});
