import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createSavedPlace,
  deleteSavedPlace,
  fetchAllSavedPlaces,
  updateSavedPlace,
  type SavedPlace,
} from '@/services/api/savedPlaces';
import { ApiError } from '@/services/api/problem';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useUserStore } from '@/store/useUserStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/services/api/savedPlaces', () => ({
  createSavedPlace: jest.fn(),
  deleteSavedPlace: jest.fn(),
  fetchAllSavedPlaces: jest.fn(),
  updateSavedPlace: jest.fn(),
}));

const ownerA = 'user-a';
const ownerB = 'user-b';
const placeId = '34000000-0000-4000-8000-000000000001';
const etag1 = '"sp-11111111111111111111111111111111"';
const etag2 = '"sp-22222222222222222222222222222222"';

const serverPlace = (overrides: Partial<SavedPlace> = {}): SavedPlace => ({
  placeId,
  etag: etag1,
  name: '새별오름',
  category: 'content-type:12',
  regionLabel: '제주시',
  thumbnailUrl: null,
  recommendedStayMinutes: 90,
  memo: '서버 메모',
  tags: [],
  priority: 0,
  targetDay: null,
  savedAt: '2026-09-10T00:00:00Z',
  updatedAt: '2026-09-10T00:00:00Z',
  ...overrides,
});

const favoriteInput = {
  placeId,
  name: '새별오름',
  category: '관광지',
  address: '제주시',
  visitType: '선택방문' as const,
  memo: '사용자 메모',
  stayMinutes: 90,
  direction: '',
  coord: { latitude: 33.4, longitude: 126.5 },
};

beforeEach(() => {
  useUserStore.setState({
    authGeneration: 1,
    authReady: true,
    isLoggedIn: true,
    userId: ownerA,
    userName: null,
  });
  useFavoriteStore.setState(useFavoriteStore.getInitialState(), true);
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockResolvedValue();
  jest.mocked(AsyncStorage.removeItem).mockResolvedValue();
});

test('로그인 사용자의 실제 목록과 item strong ETag를 hydrate한다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValue([serverPlace()]);

  await useFavoriteStore.getState().hydrate(ownerA);

  expect(fetchAllSavedPlaces).toHaveBeenCalledWith({}, expect.any(Function));
  expect(useFavoriteStore.getState()).toMatchObject({
    ownerId: ownerA,
    status: 'ready',
    favorites: [
      expect.objectContaining({
        placeId,
        etag: etag1,
        name: '새별오름',
        coord: null,
      }),
    ],
  });
});

test('서버가 체류 시간을 주지 않으면 60분 같은 값을 만들지 않는다', async () => {
  jest
    .mocked(fetchAllSavedPlaces)
    .mockResolvedValue([serverPlace({ recommendedStayMinutes: null })]);

  await useFavoriteStore.getState().hydrate(ownerA);

  expect(useFavoriteStore.getState().favorites[0].stayMinutes).toBeNull();
});

test('계정 generation이 바뀐 뒤 끝난 이전 GET은 새 사용자 상태를 덮지 않는다', async () => {
  let resolveA!: (places: SavedPlace[]) => void;
  const pendingA = new Promise<SavedPlace[]>((resolve) => {
    resolveA = resolve;
  });
  jest.mocked(fetchAllSavedPlaces).mockReturnValueOnce(pendingA);
  jest
    .mocked(fetchAllSavedPlaces)
    .mockResolvedValueOnce([serverPlace({ name: 'B의 장소' })]);

  const hydrationA = useFavoriteStore.getState().hydrate(ownerA);
  useUserStore.setState({ userId: ownerB, authGeneration: 2 });
  const hydrationB = useFavoriteStore.getState().hydrate(ownerB);
  await hydrationB;
  resolveA([serverPlace({ name: 'A의 장소' })]);
  await hydrationA;

  expect(useFavoriteStore.getState()).toMatchObject({
    ownerId: ownerB,
    favorites: [expect.objectContaining({ name: 'B의 장소' })],
  });
});

test('PATCH 성공 뒤 늦게 끝난 이전 목록 GET은 새 memo를 덮지 않는다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValueOnce([serverPlace()]);
  await useFavoriteStore.getState().hydrate(ownerA);

  let resolvePatch!: (
    value: Awaited<ReturnType<typeof updateSavedPlace>>,
  ) => void;
  let markPatchStarted!: () => void;
  const patchStarted = new Promise<void>((resolve) => {
    markPatchStarted = resolve;
  });
  jest.mocked(updateSavedPlace).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        markPatchStarted();
        resolvePatch = resolve;
      }),
  );
  const update = useFavoriteStore
    .getState()
    .updateFavorite(placeId, '선택방문', '새 메모');
  await patchStarted;

  let resolveOldList!: (places: SavedPlace[]) => void;
  jest.mocked(fetchAllSavedPlaces).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveOldList = resolve;
    }),
  );
  const staleHydration = useFavoriteStore.getState().hydrate(ownerA);
  resolvePatch({
    data: serverPlace({ etag: etag2, memo: '새 메모' }),
    status: 200,
    etag: etag2,
    location: null,
    idempotencyReplayed: null,
    traceId: null,
  });
  await update;
  resolveOldList([serverPlace({ memo: '오래된 메모' })]);
  await staleHydration;

  expect(useFavoriteStore.getState().favorites[0]).toMatchObject({
    etag: etag2,
    memo: '새 메모',
  });
});

test('A 충돌 복구 GET 중 B로 전환되면 A draft를 B 상태에 기록하지 않는다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValueOnce([serverPlace()]);
  await useFavoriteStore.getState().hydrate(ownerA);
  jest
    .mocked(updateSavedPlace)
    .mockRejectedValueOnce(
      new ApiError({ status: 409, code: 'SAVED_PLACE_VERSION_CONFLICT' }),
    );
  let resolveRecoveryA!: (places: SavedPlace[]) => void;
  let markRecoveryStarted!: () => void;
  const recoveryStarted = new Promise<void>((resolve) => {
    markRecoveryStarted = resolve;
  });
  jest.mocked(fetchAllSavedPlaces).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        markRecoveryStarted();
        resolveRecoveryA = resolve;
      }),
  );
  const updateA = useFavoriteStore
    .getState()
    .updateFavorite(placeId, '필수방문', 'A private memo');
  await recoveryStarted;

  useUserStore.setState({ userId: ownerB, authGeneration: 2 });
  jest
    .mocked(fetchAllSavedPlaces)
    .mockResolvedValueOnce([serverPlace({ name: 'B의 장소' })]);
  await useFavoriteStore.getState().hydrate(ownerB);
  resolveRecoveryA([serverPlace({ memo: 'A 최신 메모' })]);
  await expect(updateA).rejects.toMatchObject({ status: 409 });

  expect(useFavoriteStore.getState()).toMatchObject({
    ownerId: ownerB,
    favorites: [expect.objectContaining({ name: 'B의 장소' })],
  });
  expect(useFavoriteStore.getState().conflictDrafts).toEqual({});
  expect(useFavoriteStore.getState().notice).toBeNull();
});

test('같은 owner/place 동시 생성은 하나의 durable key와 단일 요청을 공유한다', async () => {
  jest.mocked(createSavedPlace).mockResolvedValue({
    data: serverPlace({ memo: '사용자 메모' }),
    status: 201,
    etag: etag1,
    location: `/api/v1/me/saved-places/${placeId}`,
    idempotencyReplayed: false,
    traceId: null,
  });

  await Promise.all([
    useFavoriteStore.getState().addFavorite(favoriteInput),
    useFavoriteStore.getState().addFavorite(favoriteInput),
  ]);

  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect(createSavedPlace).toHaveBeenCalledTimes(1);
  expect(useFavoriteStore.getState().favorites).toHaveLength(1);
});

test('불확실한 생성 실패는 durable key를 보존하고 사용자의 명시 재시도에 재사용한다', async () => {
  jest
    .mocked(createSavedPlace)
    .mockRejectedValueOnce(
      new ApiError({ status: 0, code: 'CLIENT_NETWORK_ERROR' }),
    )
    .mockResolvedValueOnce({
      data: serverPlace({ memo: '사용자 메모' }),
      status: 201,
      etag: etag1,
      location: `/api/v1/me/saved-places/${placeId}`,
      idempotencyReplayed: false,
      traceId: null,
    });

  await expect(
    useFavoriteStore.getState().addFavorite(favoriteInput),
  ).rejects.toMatchObject({ code: 'CLIENT_NETWORK_ERROR' });
  expect(useFavoriteStore.getState().favorites).toEqual([]);
  const [, durableValue] = jest.mocked(AsyncStorage.setItem).mock.calls[0];
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(durableValue);

  await useFavoriteStore.getState().addFavorite(favoriteInput);

  const firstKey = jest.mocked(createSavedPlace).mock.calls[0][1];
  const secondKey = jest.mocked(createSavedPlace).mock.calls[1][1];
  expect(secondKey).toBe(firstKey);
  expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
  expect(useFavoriteStore.getState().favorites[0]).toMatchObject({
    placeId,
    etag: etag1,
    coord: null,
  });
  expect(createSavedPlace).toHaveBeenNthCalledWith(
    1,
    expect.not.objectContaining({ coord: expect.anything() }),
    expect.any(String),
    expect.any(Function),
  );
});

test.each([
  [409, 'SAVED_PLACE_VERSION_CONFLICT'],
  [412, 'PRECONDITION_FAILED'],
] as const)(
  '%i 수정 충돌은 자동 mutation 재시도 없이 최신 목록을 다시 읽고 draft를 보존한다',
  async (status, code) => {
    jest.mocked(fetchAllSavedPlaces).mockResolvedValueOnce([serverPlace()]);
    await useFavoriteStore.getState().hydrate(ownerA);
    jest
      .mocked(updateSavedPlace)
      .mockRejectedValueOnce(new ApiError({ status, code }));
    jest
      .mocked(fetchAllSavedPlaces)
      .mockResolvedValueOnce([
        serverPlace({ etag: etag2, memo: '다른 기기 메모' }),
      ]);

    await expect(
      useFavoriteStore
        .getState()
        .updateFavorite(placeId, '필수방문', '내 충돌 메모'),
    ).rejects.toMatchObject({ status, code });

    expect(updateSavedPlace).toHaveBeenCalledTimes(1);
    expect(updateSavedPlace).toHaveBeenCalledWith(
      placeId,
      { memo: '내 충돌 메모', priority: 5 },
      etag1,
      expect.any(Function),
    );
    expect(fetchAllSavedPlaces).toHaveBeenCalledTimes(2);
    expect(useFavoriteStore.getState()).toMatchObject({
      notice:
        '다른 곳에서 변경된 최신 내용을 불러왔어요. 입력한 내용을 확인한 뒤 다시 저장해 주세요.',
      conflictDrafts: {
        [placeId]: { memo: '내 충돌 메모', visitType: '필수방문' },
      },
      favorites: [
        expect.objectContaining({ etag: etag2, memo: '다른 기기 메모' }),
      ],
    });
  },
);

test('삭제는 서버 204 뒤에만 화면에서 제거하며 실패를 성공으로 처리하지 않는다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValue([serverPlace()]);
  await useFavoriteStore.getState().hydrate(ownerA);
  jest
    .mocked(deleteSavedPlace)
    .mockRejectedValueOnce(
      new ApiError({ status: 500, code: 'INTERNAL_SERVER_ERROR' }),
    )
    .mockResolvedValueOnce();

  await expect(
    useFavoriteStore.getState().removeFavorite(placeId),
  ).rejects.toMatchObject({ status: 500 });
  expect(useFavoriteStore.getState().favorites).toHaveLength(1);

  await useFavoriteStore.getState().removeFavorite(placeId);
  expect(deleteSavedPlace).toHaveBeenCalledWith(placeId, expect.any(Function));
  expect(useFavoriteStore.getState().favorites).toEqual([]);
});
