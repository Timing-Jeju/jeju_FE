import { act, renderHook } from '@testing-library/react-native';
import { useMapPlaceSelection } from '@/hooks/useMapPlaceSelection';
import { getCurrentLocation } from '@/services/location';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import type { Place } from '@/services/places';
jest.mock('@/services/location', () => ({ getCurrentLocation: jest.fn() }));
const first: Place = {
  placeId: '34000000-0000-4000-8000-000000000001',
  name: '같은 이름',
  roadAddress: '',
  coord: { latitude: 33.4, longitude: 126.5 },
  category: '',
  categoryLabel: '장소',
  recommendedStayMinutes: null,
  thumbnailUrl: null,
};
const second: Place = {
  ...first,
  placeId: '34000000-0000-4000-8000-000000000002',
  coord: null,
};
beforeEach(() => useFavoriteStore.setState({ favorites: [] }));

test('다른 장소 선택 후 도착한 위치 응답은 좌표 없는 현재 장소에 거리를 표시하지 않는다', async () => {
  let finish!: (value: { latitude: number; longitude: number }) => void;
  jest.mocked(getCurrentLocation).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = await renderHook(() => useMapPlaceSelection());
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.selectPlace(first);
  });
  await act(async () => {
    await result.current.selectPlace(second);
  });
  await act(async () => {
    finish({ latitude: 33, longitude: 126 });
    await pending;
  });
  expect(result.current.selectedPlace?.placeId).toBe(second.placeId);
  expect(result.current.distance).toBeNull();
});

test('지도 하트는 같은 이름이 아닌 선택 ID의 찜 상태를 반영한다', async () => {
  const { result } = await renderHook(() => useMapPlaceSelection());
  await act(async () => {
    useFavoriteStore.getState().addFavorite({
      ...first,
      address: '',
      category: '장소',
      visitType: '선택방문',
      memo: '',
      stayMinutes: 60,
      direction: '',
    });
    await result.current.selectPlace({ ...first, coord: null });
  });
  expect(result.current.liked).toBe(true);
  await act(async () => {
    await result.current.selectPlace(second);
  });
  expect(result.current.liked).toBe(false);
});
