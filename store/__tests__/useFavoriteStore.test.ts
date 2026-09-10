import {
  ApiError,
  createSavedPlace,
  deleteSavedPlace,
  fetchAllPlaces,
  fetchAllSavedPlaces,
  readSavedPlaceEtag,
  updateSavedPlace,
  type ApiResponse,
  type PlaceListItem,
  type SavedPlace,
} from '@/services/api';
import {
  matchesFavoriteFilter,
  useFavoriteStore,
  type FavoritePlace,
} from '@/store/useFavoriteStore';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api/problem'),
  categoryLabel: jest.requireActual('@/services/api/category').categoryLabel,
  createSavedPlace: jest.fn(),
  deleteSavedPlace: jest.fn(),
  fetchAllPlaces: jest.fn(),
  fetchAllSavedPlaces: jest.fn(),
  readSavedPlaceEtag: jest.fn(),
  updateSavedPlace: jest.fn(),
}));

const mocked = {
  createSavedPlace: jest.mocked(createSavedPlace),
  deleteSavedPlace: jest.mocked(deleteSavedPlace),
  fetchAllPlaces: jest.mocked(fetchAllPlaces),
  fetchAllSavedPlaces: jest.mocked(fetchAllSavedPlaces),
  readSavedPlaceEtag: jest.mocked(readSavedPlaceEtag),
  updateSavedPlace: jest.mocked(updateSavedPlace),
};

const savedPlace = (overrides: Partial<SavedPlace> = {}): SavedPlace => ({
  placeId: 'p1',
  name: '함덕해수욕장',
  category: 'content-type:12',
  regionLabel: '조천',
  thumbnailUrl: null,
  recommendedStayMinutes: null,
  memo: null,
  tags: [],
  priority: 0,
  targetDay: null,
  savedAt: '',
  updatedAt: '',
  ...overrides,
});

const placeItem = (overrides: Partial<PlaceListItem> = {}): PlaceListItem => ({
  placeId: 'p1',
  contentId: '1',
  name: '함덕해수욕장',
  category: 'content-type:12',
  regionCode: 'jeju',
  regionLabel: '조천',
  address: '제주시 조천읍',
  location: { lat: 33.54, lng: 126.67 },
  thumbnailUrl: null,
  recommendedStayMinutes: null,
  recommendedStaySource: null,
  recommendedStayPolicyVersion: null,
  recommendedStayEffectiveAt: null,
  recommendedStayUpdatedAt: null,
  operationsSummary: null,
  distanceMeters: null,
  dataFreshness: {
    provider: 'TOUR_API',
    observedAt: '',
    expiresAt: null,
    stale: false,
  },
  saved: true,
  memo: null,
  tags: [],
  ...overrides,
});

const favorite = (overrides: Partial<FavoritePlace> = {}): FavoritePlace => ({
  placeId: 'p1',
  name: '함덕해수욕장',
  category: '관광지',
  address: '제주시 조천읍',
  visitType: '선택방문',
  memo: '',
  stayMinutes: 60,
  direction: '동쪽',
  coord: { latitude: 33.54, longitude: 126.67 },
  tags: [],
  targetDay: null,
  etag: null,
  ...overrides,
});

const response = <T>(data: T, etag: string | null): ApiResponse<T> => ({
  data,
  status: 200,
  etag,
  location: null,
  idempotencyReplayed: null,
  traceId: null,
});

const apiError = (code: string, detail = '실패') =>
  new ApiError({ code, status: 409, detail });

const store = () => useFavoriteStore.getState();

beforeEach(() => {
  Object.values(mocked).forEach((fn) => fn.mockReset());
  mocked.fetchAllSavedPlaces.mockResolvedValue([]);
  mocked.fetchAllPlaces.mockResolvedValue([]);
  useFavoriteStore.setState({ favorites: [], loading: false, error: null });
});

describe('matchesFavoriteFilter', () => {
  it('전체는 모두, 관광지는 식당이 아닌 것, 식당은 식당만 고른다', () => {
    const restaurant = favorite({ category: '식당' });
    const museum = favorite({ category: '문화시설' });

    expect(matchesFavoriteFilter(restaurant, '전체')).toBe(true);
    expect(matchesFavoriteFilter(restaurant, '관광지')).toBe(false);
    expect(matchesFavoriteFilter(museum, '관광지')).toBe(true);
    expect(matchesFavoriteFilter(restaurant, '식당')).toBe(true);
    expect(matchesFavoriteFilter(museum, '식당')).toBe(false);
  });

  it('필수방문 · 선택방문은 visitType 으로 고른다', () => {
    expect(
      matchesFavoriteFilter(favorite({ visitType: '필수방문' }), '필수방문'),
    ).toBe(true);
    expect(
      matchesFavoriteFilter(favorite({ visitType: '필수방문' }), '선택방문'),
    ).toBe(false);
  });
});

describe('loadFavorites', () => {
  it('찜 목록과 장소 목록을 placeId 로 합쳐 화면 값으로 바꾼다', async () => {
    mocked.fetchAllSavedPlaces.mockResolvedValue([
      savedPlace({
        category: 'content-type:39',
        priority: 5,
        memo: '노을 시간',
        tags: ['바다'],
        targetDay: 2,
        recommendedStayMinutes: 90,
      }),
    ]);
    mocked.fetchAllPlaces.mockResolvedValue([placeItem()]);

    await store().loadFavorites();

    expect(mocked.fetchAllPlaces).toHaveBeenCalledWith({ savedOnly: true });
    expect(store().loading).toBe(false);
    expect(store().error).toBeNull();
    expect(store().favorites).toEqual([
      favorite({
        category: '식당',
        visitType: '필수방문',
        memo: '노을 시간',
        tags: ['바다'],
        targetDay: 2,
        stayMinutes: 90,
      }),
    ]);
  });

  it('장소 목록에 없으면 지역명으로 주소와 방향을 대신하고 좌표는 비운다', async () => {
    mocked.fetchAllSavedPlaces.mockResolvedValue([savedPlace()]);

    await store().loadFavorites();

    expect(store().favorites[0]).toMatchObject({
      address: '조천',
      direction: '조천',
      coord: null,
      memo: '',
      stayMinutes: 60,
      visitType: '선택방문',
    });
  });

  it('방향은 경도 126.55 를 기준으로 동쪽 · 서쪽을 가른다', async () => {
    mocked.fetchAllSavedPlaces.mockResolvedValue([
      savedPlace({ placeId: 'east' }),
      savedPlace({ placeId: 'west' }),
    ]);
    mocked.fetchAllPlaces.mockResolvedValue([
      placeItem({ placeId: 'east', location: { lat: 33.4, lng: 126.9 } }),
      placeItem({ placeId: 'west', location: { lat: 33.4, lng: 126.3 } }),
    ]);

    await store().loadFavorites();

    expect(store().favorites.map((place) => place.direction)).toEqual([
      '동쪽',
      '서쪽',
    ]);
  });

  it('priority 가 3 이상이면 필수방문으로 본다', async () => {
    mocked.fetchAllSavedPlaces.mockResolvedValue([
      savedPlace({ placeId: 'a', priority: 3 }),
      savedPlace({ placeId: 'b', priority: 2 }),
    ]);

    await store().loadFavorites();

    expect(store().favorites.map((place) => place.visitType)).toEqual([
      '필수방문',
      '선택방문',
    ]);
  });

  it('이미 받아 둔 ETag 는 다시 불러와도 버리지 않는다', async () => {
    useFavoriteStore.setState({ favorites: [favorite({ etag: '"e1"' })] });
    mocked.fetchAllSavedPlaces.mockResolvedValue([savedPlace()]);

    await store().loadFavorites();

    expect(store().favorites[0].etag).toBe('"e1"');
  });

  it('실패하면 사용자에게 보여줄 문구를 error 에 남긴다', async () => {
    mocked.fetchAllSavedPlaces.mockRejectedValue(apiError('X', '서버 점검 중'));
    await store().loadFavorites();
    expect(store()).toMatchObject({ loading: false, error: '서버 점검 중' });

    mocked.fetchAllSavedPlaces.mockRejectedValue(new Error('boom'));
    await store().loadFavorites();
    expect(store().error).toBe('요청을 처리하지 못했습니다.');
  });
});

describe('addFavorite', () => {
  it('방문 유형을 priority 로, 빈 메모는 null 로 보내고 응답으로 항목을 만든다', async () => {
    mocked.createSavedPlace.mockResolvedValue(
      response(
        savedPlace({ priority: 5, recommendedStayMinutes: 120 }),
        '"e1"',
      ),
    );

    await store().addFavorite({
      placeId: 'p1',
      visitType: '필수방문',
      memo: '   ',
      address: '직접 넘긴 주소',
      coord: { latitude: 33.4, longitude: 126.3 },
    });

    expect(mocked.createSavedPlace).toHaveBeenCalledWith({
      placeId: 'p1',
      memo: null,
      priority: 5,
    });
    expect(store().favorites).toEqual([
      favorite({
        visitType: '필수방문',
        stayMinutes: 120,
        address: '직접 넘긴 주소',
        coord: { latitude: 33.4, longitude: 126.3 },
        direction: '서쪽',
        etag: '"e1"',
      }),
    ]);
  });

  it('같은 장소가 이미 있으면 새 값으로 바꾼다', async () => {
    useFavoriteStore.setState({ favorites: [favorite({ memo: '옛 메모' })] });
    mocked.createSavedPlace.mockResolvedValue(
      response(savedPlace({ memo: '새 메모' }), null),
    );

    await store().addFavorite({
      placeId: 'p1',
      visitType: '선택방문',
      memo: '새 메모',
    });

    expect(store().favorites).toHaveLength(1);
    expect(store().favorites[0].memo).toBe('새 메모');
  });

  it('실패하면 목록은 그대로 두고 error 만 남긴다', async () => {
    mocked.createSavedPlace.mockRejectedValue(
      apiError('PLACE_NOT_FOUND', '없는 장소'),
    );

    await store().addFavorite({
      placeId: 'p1',
      visitType: '선택방문',
      memo: '',
    });

    expect(store().favorites).toEqual([]);
    expect(store().error).toBe('없는 장소');
  });
});

describe('updateFavorite', () => {
  it('ETag 를 들고 있으면 바로 PATCH 하고 응답으로 갱신한다', async () => {
    useFavoriteStore.setState({ favorites: [favorite({ etag: '"e1"' })] });
    mocked.updateSavedPlace.mockResolvedValue(
      response(
        savedPlace({ memo: '수정', priority: 5, tags: ['t'], targetDay: 3 }),
        '"e2"',
      ),
    );

    await store().updateFavorite('p1', '필수방문', '수정');

    expect(mocked.readSavedPlaceEtag).not.toHaveBeenCalled();
    expect(mocked.updateSavedPlace).toHaveBeenCalledWith(
      'p1',
      { memo: '수정', priority: 5 },
      '"e1"',
    );
    expect(store().favorites[0]).toMatchObject({
      memo: '수정',
      visitType: '필수방문',
      tags: ['t'],
      targetDay: 3,
      etag: '"e2"',
    });
  });

  it('ETag 가 없으면 현재 값 그대로 다시 등록해 ETag 를 읽어 온 뒤 PATCH 한다', async () => {
    useFavoriteStore.setState({
      favorites: [
        favorite({
          memo: '기존',
          tags: ['a'],
          targetDay: 1,
          visitType: '필수방문',
        }),
      ],
    });
    mocked.readSavedPlaceEtag.mockResolvedValue('"fresh"');
    mocked.updateSavedPlace.mockResolvedValue(response(savedPlace(), '"e2"'));

    await store().updateFavorite('p1', '선택방문', '');

    expect(mocked.readSavedPlaceEtag).toHaveBeenCalledWith({
      placeId: 'p1',
      memo: '기존',
      tags: ['a'],
      priority: 5,
      targetDay: 1,
    });
    expect(mocked.updateSavedPlace).toHaveBeenCalledWith(
      'p1',
      { memo: null, priority: 0 },
      '"fresh"',
    );
  });

  it('ETag 가 낡아 409 가 나면 목록을 다시 불러 한 번만 재시도한다', async () => {
    useFavoriteStore.setState({ favorites: [favorite({ etag: '"old"' })] });
    mocked.updateSavedPlace
      .mockRejectedValueOnce(apiError('SAVED_PLACE_VERSION_CONFLICT'))
      .mockResolvedValueOnce(response(savedPlace({ memo: '수정' }), '"e3"'));
    mocked.fetchAllSavedPlaces.mockResolvedValue([
      savedPlace({ memo: '서버 메모' }),
    ]);
    mocked.readSavedPlaceEtag.mockResolvedValue('"latest"');

    await store().updateFavorite('p1', '선택방문', '수정');

    expect(mocked.fetchAllSavedPlaces).toHaveBeenCalledTimes(1);
    // 다시 불러온 항목은 ETag 가 없으므로 현재 서버 값으로 ETag 를 읽는다
    expect(mocked.readSavedPlaceEtag).toHaveBeenCalledWith(
      expect.objectContaining({ memo: '서버 메모' }),
    );
    expect(mocked.updateSavedPlace).toHaveBeenCalledTimes(2);
    expect(mocked.updateSavedPlace).toHaveBeenLastCalledWith(
      'p1',
      { memo: '수정', priority: 0 },
      '"latest"',
    );
    expect(store().favorites[0]).toMatchObject({ memo: '수정', etag: '"e3"' });
    expect(store().error).toBeNull();
  });

  it('재시도도 실패하면 error 를 남긴다', async () => {
    useFavoriteStore.setState({ favorites: [favorite({ etag: '"old"' })] });
    mocked.updateSavedPlace.mockRejectedValue(
      apiError('SAVED_PLACE_VERSION_CONFLICT', '충돌'),
    );
    mocked.fetchAllSavedPlaces.mockResolvedValue([savedPlace()]);
    mocked.readSavedPlaceEtag.mockResolvedValue('"latest"');

    await store().updateFavorite('p1', '선택방문', '수정');

    expect(mocked.updateSavedPlace).toHaveBeenCalledTimes(2);
    expect(store().error).toBe('충돌');
  });

  it('충돌이 아닌 오류는 재시도하지 않는다', async () => {
    useFavoriteStore.setState({ favorites: [favorite({ etag: '"e1"' })] });
    mocked.updateSavedPlace.mockRejectedValue(
      apiError('SAVED_PLACE_NOT_FOUND', '없음'),
    );

    await store().updateFavorite('p1', '선택방문', '수정');

    expect(mocked.updateSavedPlace).toHaveBeenCalledTimes(1);
    expect(mocked.fetchAllSavedPlaces).not.toHaveBeenCalled();
    expect(store().error).toBe('없음');
  });

  it('목록에 없는 장소는 아무것도 하지 않는다', async () => {
    await store().updateFavorite('unknown', '선택방문', '');
    expect(mocked.updateSavedPlace).not.toHaveBeenCalled();
    expect(mocked.readSavedPlaceEtag).not.toHaveBeenCalled();
  });
});

describe('removeFavorite', () => {
  beforeEach(() => {
    useFavoriteStore.setState({
      favorites: [favorite(), favorite({ placeId: 'p2' })],
    });
  });

  it('삭제하면 목록에서 뺀다', async () => {
    mocked.deleteSavedPlace.mockResolvedValue();

    await store().removeFavorite('p1');

    expect(store().favorites.map((place) => place.placeId)).toEqual(['p2']);
    expect(store().error).toBeNull();
  });

  it('이미 지워진 장소(404)도 화면에서 뺀다', async () => {
    mocked.deleteSavedPlace.mockRejectedValue(
      apiError('SAVED_PLACE_NOT_FOUND'),
    );

    await store().removeFavorite('p1');

    expect(store().favorites.map((place) => place.placeId)).toEqual(['p2']);
    expect(store().error).toBeNull();
  });

  it('다른 오류면 목록을 유지하고 error 를 남긴다', async () => {
    mocked.deleteSavedPlace.mockRejectedValue(apiError('X', '잠시 후'));

    await store().removeFavorite('p1');

    expect(store().favorites).toHaveLength(2);
    expect(store().error).toBe('잠시 후');
  });
});
