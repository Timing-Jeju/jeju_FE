import { render, waitFor } from '@testing-library/react-native';
import PlaceDetailScreen from '@/app/place-detail';
import { getPlace } from '@/services/places';
const mockParams: { placeId?: string; name?: string } = {};
jest.mock('@/services/places', () => ({ getPlace: jest.fn() }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

test('상세 정보 미제공은 무료 또는 영업 중으로 표시하지 않는다', async () => {
  mockParams.placeId = '34000000-0000-4000-8000-000000000001';
  jest.mocked(getPlace).mockResolvedValue({
    placeId: mockParams.placeId,
    name: '서버 장소',
    roadAddress: '',
    coord: null,
    category: '',
    categoryLabel: '장소',
    recommendedStayMinutes: null,
    thumbnailUrl: null,
    overview: null,
    contact: { phone: null, homepageUrl: null },
    operations: {
      operatingHoursText: null,
      closedDaysText: null,
      parkingText: null,
      admissionFeeText: null,
    },
  });
  const screen = await render(<PlaceDetailScreen />);
  await waitFor(() => expect(screen.getByText('서버 장소')).toBeTruthy());
  expect(screen.getByText('추천 체류 시간 미제공')).toBeTruthy();
  expect(screen.queryByText('무료')).toBeNull();
  expect(screen.queryByText('영업 중')).toBeNull();
  expect(screen.queryByText('함덕해수욕장')).toBeNull();
  expect(screen.getByText('전화하기')).toBeTruthy();
  expect(screen.getByText('지도보기')).toBeTruthy();
  expect(screen.getByText('홈페이지')).toBeTruthy();
  expect(screen.getAllByText('복사')).toHaveLength(2);
  expect(screen.getByText('반려동물')).toBeTruthy();
  expect(screen.getByText('부대시설')).toBeTruthy();
  expect(screen.getByText('기타 안내')).toBeTruthy();
});

test('이름만 있는 과거 링크는 재선택을 안내하고 임시 상세를 표시하지 않는다', async () => {
  delete mockParams.placeId;
  mockParams.name = '함덕해수욕장';
  jest.mocked(getPlace).mockRejectedValue(new Error('invalid canonical ID'));
  const screen = await render(<PlaceDetailScreen />);
  await waitFor(() =>
    expect(screen.getByText(/이전 항목은 검색에서 다시 선택/)).toBeTruthy(),
  );
  expect(screen.queryByText('함덕해수욕장')).toBeNull();
  expect(screen.queryByText('장소 찜하기')).toBeNull();
});
