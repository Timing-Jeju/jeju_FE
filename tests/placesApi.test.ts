import api from '@/services/apiClient';
import { getPlace, listPlaces } from '@/services/places';

jest.mock('@/services/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
const id = '34000000-0000-4000-8000-000000000001';
const row = (placeId = id) => ({
  placeId,
  name: '같은 이름',
  contentId: 'provider-77',
  category: 'content-type:12',
  address: '제주',
  location: { lat: 33.4, lng: 126.5 },
  recommendedStayMinutes: null,
  thumbnailUrl: null,
});
const page = { size: 20, hasNext: false, nextCursor: null };

test('이름이 같아도 서버 canonical ID를 보존하고 미제공 체류 시간을 만들지 않는다', async () => {
  (api.get as jest.Mock).mockResolvedValue({
    data: { items: [row(), row('34000000-0000-4000-8000-000000000002')], page },
  });
  const result = await listPlaces({ query: '같은 이름' });
  expect(result.items.map((p) => p.placeId)).toEqual([
    id,
    '34000000-0000-4000-8000-000000000002',
  ]);
  expect(result.items[0].recommendedStayMinutes).toBeNull();
  expect(result.items[0].coord).toEqual({ latitude: 33.4, longitude: 126.5 });
});

test('요청은 공개 검색 필드만 전송하고 위치와 파생 필드를 전달하지 않는다', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { items: [], page } });
  await listPlaces({
    query: '숙소',
    currentLocation: { latitude: 33, longitude: 126 },
    geoHash: 'private',
  } as never);
  const [, options] = (api.get as jest.Mock).mock.calls[0];
  expect(options.params).toEqual({
    query: '숙소',
    category: undefined,
    cursor: undefined,
    size: 20,
  });
});

test.each(['', 'place-name', '34000000-0000-4000-8000-00000000000G'])(
  '잘못된 서버 ID는 결과로 표시하지 않는다 (%s)',
  async (placeId) => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { items: [row(placeId)], page },
    });
    await expect(listPlaces()).rejects.toThrow('장소 응답');
  },
);

test('이름만 있는 상세 링크는 서버 장소로 추정하지 않는다', async () => {
  await expect(getPlace('함덕해수욕장')).rejects.toThrow();
  expect(api.get).not.toHaveBeenCalled();
});

test('미제공 좌표는 지도 표시용 가짜 좌표를 만들지 않는다', async () => {
  (api.get as jest.Mock).mockResolvedValue({
    data: { items: [{ ...row(), location: null }], page },
  });
  expect((await listPlaces()).items[0].coord).toBeNull();
});

test.each([
  { items: [row(), row()], page },
  { items: [row()], page: { ...page, hasNext: true } },
  { items: [{ ...row(), location: { lat: 999, lng: 126 } }], page },
  { items: [{ ...row(), recommendedStayMinutes: 0 }], page },
])(
  '잘못된 페이지 또는 facts는 정상 장소 목록으로 표시하지 않는다',
  async (data) => {
    (api.get as jest.Mock).mockResolvedValue({ data });
    await expect(listPlaces()).rejects.toThrow('장소 응답');
  },
);

test('요청한 장소와 다른 ID의 상세 응답은 거부한다', async () => {
  (api.get as jest.Mock).mockResolvedValue({
    data: row('34000000-0000-4000-8000-000000000002'),
  });
  await expect(getPlace(id)).rejects.toThrow('장소 응답');
});
