import { requestData } from '@/services/api/http';
import {
  fetchPlacesByFilter,
  type PlaceListItem,
  type PlacesListResponse,
} from '@/services/api/places';

jest.mock('@/services/api/http', () => ({
  request: jest.fn(),
  requestData: jest.fn(),
}));

const mockedRequestData = jest.mocked(requestData);

const item = (
  placeId: string,
  name: string,
  category: string,
  distanceMeters: number | null = null,
): PlaceListItem => ({
  placeId,
  contentId: placeId,
  name,
  category,
  regionCode: 'jeju',
  regionLabel: null,
  address: null,
  location: { lat: 33.5, lng: 126.5 },
  thumbnailUrl: null,
  recommendedStayMinutes: null,
  recommendedStaySource: null,
  recommendedStayPolicyVersion: null,
  recommendedStayEffectiveAt: null,
  recommendedStayUpdatedAt: null,
  operationsSummary: null,
  distanceMeters,
  dataFreshness: {
    provider: 'TOUR_API',
    observedAt: '',
    expiresAt: null,
    stale: false,
  },
  saved: false,
  memo: null,
  tags: [],
});

const page = (items: PlaceListItem[]): PlacesListResponse => ({
  items,
  page: { size: items.length, hasNext: false, nextCursor: null },
});

/** 요청의 category 에 따라 다른 페이지를 돌려주는 가짜 서버 */
const serve = (byCategory: Record<string, PlaceListItem[]>) => {
  mockedRequestData.mockImplementation(async (options) => {
    const category = String(options.params?.category ?? '');
    return page(byCategory[category] ?? []);
  });
};

const sentCategories = () =>
  mockedRequestData.mock.calls.map(([options]) => options.params?.category);

beforeEach(() => {
  mockedRequestData.mockReset();
});

describe('fetchPlacesByFilter', () => {
  it('필터가 없으면 분류 없이 한 번만 부른다', async () => {
    serve({ '': [item('a', '올리브영', 'SH')] });

    const items = await fetchPlacesByFilter(null, { size: 5 });

    expect(sentCategories()).toEqual([undefined]);
    expect(mockedRequestData.mock.calls[0][0].params).toMatchObject({
      size: 5,
    });
    expect(items.map((place) => place.placeId)).toEqual(['a']);
  });

  it('관광지는 코드마다 따로 불러 합치고 placeId 중복은 뺀다', async () => {
    serve({
      NA: [item('na1', '송악산', 'NA', 300), item('dup', '겹침', 'NA', 50)],
      HS: [item('hs1', '관음사', 'HS', 900)],
      EX: [item('dup', '겹침', 'EX', 50)],
      VE: [],
      LS: [item('ls1', '올레 1코스', 'LS', 100)],
      EV: [],
    });

    const items = await fetchPlacesByFilter('관광지', {
      lat: 33.5,
      lng: 126.5,
      radiusMeters: 3000,
    });

    expect(sentCategories()).toEqual(['NA', 'HS', 'EX', 'VE', 'LS', 'EV']);
    // 거리순으로 다시 정렬된다
    expect(items.map((place) => place.placeId)).toEqual([
      'dup',
      'ls1',
      'na1',
      'hs1',
    ]);
  });

  it('카페는 음식(FD)을 넉넉히 받아 이름으로 거른다', async () => {
    serve({
      FD: [
        item('f1', '카페 어림비', 'FD'),
        item('f2', '돈카츠 서황', 'FD'),
        item('f3', '가온 커피', 'FD'),
      ],
    });

    const items = await fetchPlacesByFilter('카페', { size: 10 });

    expect(sentCategories()).toEqual(['FD']);
    expect(mockedRequestData.mock.calls[0][0].params).toMatchObject({
      size: 100,
    });
    expect(items.map((place) => place.name)).toEqual([
      '가온 커피',
      '카페 어림비',
    ]);
  });

  it('좌표 검색이 아니면 이름순으로 정렬한다', async () => {
    serve({ FD: [item('b', '해왓', 'FD'), item('a', '다미회', 'FD')] });

    const items = await fetchPlacesByFilter('식당');

    expect(items.map((place) => place.name)).toEqual(['다미회', '해왓']);
  });

  it('한 코드라도 실패하면 전체가 실패한다', async () => {
    mockedRequestData.mockRejectedValue(new Error('down'));
    await expect(fetchPlacesByFilter('식당')).rejects.toThrow('down');
  });
});
