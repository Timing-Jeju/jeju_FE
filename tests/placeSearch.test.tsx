import { act, renderHook } from '@testing-library/react-native';
import { usePlaceSearch } from '@/hooks/usePlaceSearch';
import { listPlaces } from '@/services/places';
jest.mock('@/services/places', () => ({ listPlaces: jest.fn() }));
const page = (name: string) => ({
  items: [{ placeId: name, name }],
  page: { size: 20, hasNext: false, nextCursor: null },
});

test('늦게 도착한 이전 검색 응답은 최신 검색을 덮어쓰지 않는다', async () => {
  let resolveOld!: (value: unknown) => void;
  jest.mocked(listPlaces).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }) as never,
  );
  jest.mocked(listPlaces).mockResolvedValueOnce(page('최신') as never);
  const { result } = await renderHook(() => usePlaceSearch());
  let first!: Promise<void>;
  await act(async () => {
    first = result.current.search('이전');
  });
  await act(async () => {
    await result.current.search('최신');
  });
  await act(async () => {
    resolveOld(page('이전'));
    await first;
  });
  expect(result.current.results[0].name).toBe('최신');
  expect(jest.mocked(listPlaces).mock.calls[0][1]?.aborted).toBe(true);
});

test('화면 종료는 진행 중 검색을 취소한다', async () => {
  jest.mocked(listPlaces).mockImplementationOnce(() => new Promise(() => {}));
  const { result, unmount } = await renderHook(() => usePlaceSearch());
  await act(async () => {
    void result.current.search('숙소');
  });
  await unmount();
  expect(jest.mocked(listPlaces).mock.calls[0][1]?.aborted).toBe(true);
});

test('검색 실패는 빈 검색 성공과 구분한다', async () => {
  jest
    .mocked(listPlaces)
    .mockRejectedValueOnce(new Error('private provider body'));
  const { result } = await renderHook(() => usePlaceSearch());
  await act(async () => {
    await result.current.search('숙소');
  });
  expect(result.current.error).toContain('검색하지 못했어요');
  expect(result.current.error).not.toContain('private');
  expect(result.current.loading).toBe(false);
});

test('다음 페이지는 서버 cursor로 조회하고 중복 ID를 추가하지 않는다', async () => {
  jest.mocked(listPlaces).mockResolvedValueOnce({
    ...page('첫 장소'),
    page: { size: 20, hasNext: true, nextCursor: 'opaque-cursor' },
  } as never);
  jest.mocked(listPlaces).mockResolvedValueOnce({
    ...page('다음 장소'),
    items: [...page('첫 장소').items, ...page('다음 장소').items],
  } as never);
  const { result } = await renderHook(() => usePlaceSearch());
  await act(async () => {
    await result.current.search('제주');
  });
  await act(async () => {
    await result.current.more();
  });
  expect(jest.mocked(listPlaces).mock.calls[1][0]).toEqual({
    query: '제주',
    cursor: 'opaque-cursor',
  });
  expect(result.current.results.map((place) => place.name)).toEqual([
    '첫 장소',
    '다음 장소',
  ]);
  expect(result.current.hasMore).toBe(false);
});

test('연속 스크롤 이벤트는 같은 다음 페이지 요청을 중복 전송하지 않는다', async () => {
  jest.mocked(listPlaces).mockResolvedValueOnce({
    ...page('첫 장소'),
    page: { size: 20, hasNext: true, nextCursor: 'next' },
  } as never);
  let finish!: (value: never) => void;
  jest.mocked(listPlaces).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = await renderHook(() => usePlaceSearch());
  await act(async () => {
    await result.current.search('제주');
  });
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.more();
    void result.current.more();
    void result.current.more();
  });
  expect(listPlaces).toHaveBeenCalledTimes(2);
  await act(async () => {
    finish(page('다음') as never);
    await pending;
  });
  expect(result.current.loading).toBe(false);
});
