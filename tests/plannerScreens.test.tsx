import { render } from '@testing-library/react-native';
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

test('미지원 검토는 기존 헤더·빈 상태를 표시하고 과거 모의 결과를 숨긴다', async () => {
  const screen = await render(<Review />);
  expect(screen.getByText('일정 검토')).toBeTruthy();
  expect(screen.getByText(/생성·평가·적용은 아직 지원하지/)).toBeTruthy();
  expect(screen.queryByText('과거 모의 결과')).toBeNull();
});

test('미지원 구간 상세는 기존 빈 상태를 표시하고 경로 API를 호출하지 않는다', async () => {
  const screen = await render(<Leg />);
  expect(screen.getByText('상세 일정')).toBeTruthy();
  expect(screen.getByText('구간 상세는 준비 중이에요.')).toBeTruthy();
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
