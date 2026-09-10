import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useUserStore } from '@/store/useUserStore';
import {
  createSavedPlace,
  deleteSavedPlace,
  updateSavedPlace,
} from '@/services/api/savedPlaces';

jest.mock('@/services/api/savedPlaces', () => ({
  createSavedPlace: jest.fn(),
  deleteSavedPlace: jest.fn(),
  fetchAllSavedPlaces: jest.fn(),
  updateSavedPlace: jest.fn(),
}));

const firstId = '34000000-0000-4000-8000-000000000001';
const secondId = '34000000-0000-4000-8000-000000000002';
const place = (placeId: string) => ({
  placeId,
  name: '같은 이름',
  category: '관광지',
  address: '제주',
  visitType: '선택방문' as const,
  memo: '',
  stayMinutes: 75,
  direction: '',
  coord: null,
});

beforeEach(() => {
  useFavoriteStore.setState(useFavoriteStore.getInitialState(), true);
  useScheduleStore.setState({ places: {}, reviews: {} });
  useUserStore.setState({
    authReady: true,
    isLoggedIn: true,
    userId: 'canonical-test-owner',
    userName: null,
  });
});

test('같은 이름의 서로 다른 서버 장소를 별개로 선택하고 ID로 수정한다', async () => {
  const state = useFavoriteStore.getState();
  const response = (placeId: string, memo = '', priority = 0) => ({
    data: {
      placeId,
      etag: '"sp-11111111111111111111111111111111"',
      name: '같은 이름',
      category: 'content-type:12',
      regionLabel: '제주',
      thumbnailUrl: null,
      recommendedStayMinutes: 75,
      memo,
      tags: [],
      priority,
      targetDay: null,
      savedAt: '2026-09-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    },
    status: 200,
    etag: '"sp-11111111111111111111111111111111"',
    location: null,
    idempotencyReplayed: null,
    traceId: null,
  });
  jest
    .mocked(createSavedPlace)
    .mockResolvedValueOnce(response(firstId))
    .mockResolvedValueOnce(response(secondId));
  jest
    .mocked(updateSavedPlace)
    .mockResolvedValue(response(firstId, '첫 장소 메모', 5));
  jest.mocked(deleteSavedPlace).mockResolvedValue();

  await state.addFavorite(place(firstId));
  await state.addFavorite(place(secondId));
  expect(useFavoriteStore.getState().favorites).toHaveLength(2);
  await state.updateFavorite(firstId, '필수방문', '첫 장소 메모');
  expect(useFavoriteStore.getState().favorites.map((p) => p.memo)).toEqual([
    '첫 장소 메모',
    '',
  ]);
  await state.removeFavorite(secondId);
  expect(useFavoriteStore.getState().favorites.map((p) => p.placeId)).toEqual([
    firstId,
  ]);
});

test('Day 항목은 ID로 중복을 막고 기존 사용자 체류 시간을 보존한다', () => {
  const state = useScheduleStore.getState();
  state.addPlaces(1, [place(firstId), place(secondId), place(firstId)]);
  expect(useScheduleStore.getState().places[1]).toHaveLength(2);
  state.updateStayMinutes(1, firstId, 95);
  state.addPlaces(1, [{ ...place(firstId), stayMinutes: 60 }]);
  expect(
    useScheduleStore.getState().places[1].map((p) => p.stayMinutes),
  ).toEqual([95, 75]);
  state.removePlace(1, secondId);
  expect(useScheduleStore.getState().places[1].map((p) => p.placeId)).toEqual([
    firstId,
  ]);
});

test('서버 ID 없는 과거 장소는 이름으로 자동 매핑하지 않는다', async () => {
  await expect(
    useFavoriteStore.getState().addFavorite(place('')),
  ).rejects.toThrow();
  expect(() =>
    useScheduleStore.getState().addPlaces(1, [place('legacy-name')]),
  ).toThrow();
  expect(useFavoriteStore.getState().favorites).toEqual([]);
  expect(useScheduleStore.getState().places).toEqual({});
});

test('이름과 좌표만 있는 이전 숙소는 입력 완료로 처리하지 않는다', () => {
  const { isLodgingComplete } = jest.requireActual('@/store/useTripStore');
  expect(
    isLodgingComplete(
      {
        lodgingMode: 'single',
        lodging: { name: '숙소', coord: null },
        dailyLodgings: {},
      },
      ['2026-09-10'],
    ),
  ).toBe(false);
  expect(
    isLodgingComplete(
      {
        lodgingMode: 'daily',
        lodging: null,
        dailyLodgings: { '2026-09-10': { ...place(firstId) } },
      },
      ['2026-09-10', '2026-09-11'],
    ),
  ).toBe(false);
  expect(
    isLodgingComplete(
      { lodgingMode: 'single', lodging: place(firstId), dailyLodgings: {} },
      ['2026-09-10'],
    ),
  ).toBe(true);
});
