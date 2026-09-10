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
  jest.mocked(createSavedPlace).mockReset();
  jest.mocked(deleteSavedPlace).mockReset();
  jest.mocked(fetchAllSavedPlaces).mockReset();
  jest.mocked(updateSavedPlace).mockReset();
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
  jest
    .mocked(fetchAllSavedPlaces)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOldList = resolve;
      }),
    )
    .mockResolvedValueOnce([serverPlace({ etag: etag2, memo: '새 메모' })]);
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
  expect(fetchAllSavedPlaces).toHaveBeenCalledTimes(3);
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

test('이전 A flight 대기 중 B로 전환되면 A intent를 B 요청으로 재귀 전송하지 않는다', async () => {
  let resolveFirst!: (
    value: Awaited<ReturnType<typeof createSavedPlace>>,
  ) => void;
  let markFirstStarted!: () => void;
  const firstStarted = new Promise<void>((resolve) => {
    markFirstStarted = resolve;
  });
  jest.mocked(createSavedPlace).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        markFirstStarted();
        resolveFirst = resolve;
      }),
  );
  const first = useFavoriteStore.getState().addFavorite(favoriteInput);
  await firstStarted;

  useUserStore.setState({ userId: ownerA, authGeneration: 3 });
  const waiting = useFavoriteStore
    .getState()
    .addFavorite({ ...favoriteInput, memo: 'A gen3 memo' });
  const waitingResult = expect(waiting).rejects.toMatchObject({
    status: 401,
    code: 'AUTHENTICATION_REQUIRED',
  });
  useUserStore.setState({ userId: ownerB, authGeneration: 4 });
  resolveFirst({
    data: serverPlace({ memo: '사용자 메모' }),
    status: 201,
    etag: etag1,
    location: `/api/v1/me/saved-places/${placeId}`,
    idempotencyReplayed: false,
    traceId: null,
  });

  await first;
  await waitingResult;
  expect(createSavedPlace).toHaveBeenCalledTimes(1);
});

test('같은 owner/place의 다른 create intent는 기존 성공 promise로 합치지 않는다', async () => {
  let resolveFirst!: (
    value: Awaited<ReturnType<typeof createSavedPlace>>,
  ) => void;
  let markFirstStarted!: () => void;
  const firstStarted = new Promise<void>((resolve) => {
    markFirstStarted = resolve;
  });
  jest.mocked(createSavedPlace).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        markFirstStarted();
        resolveFirst = resolve;
      }),
  );
  const first = useFavoriteStore.getState().addFavorite(favoriteInput);
  await firstStarted;

  const differentIntent = useFavoriteStore
    .getState()
    .addFavorite({ ...favoriteInput, memo: '두 번째 memo' });
  const differentIntentResult = expect(differentIntent).rejects.toMatchObject({
    status: 409,
    code: 'CONFLICT',
  });
  resolveFirst({
    data: serverPlace({ memo: '사용자 메모' }),
    status: 201,
    etag: etag1,
    location: `/api/v1/me/saved-places/${placeId}`,
    idempotencyReplayed: false,
    traceId: null,
  });
  await first;
  await differentIntentResult;

  expect(createSavedPlace).toHaveBeenCalledTimes(1);
  expect(useFavoriteStore.getState().favorites[0].memo).toBe('사용자 메모');
});

test('초기 hydrate 중 create가 실패해도 안전한 GET 결과를 버리지 않는다', async () => {
  let resolveHydration!: (places: SavedPlace[]) => void;
  jest.mocked(fetchAllSavedPlaces).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveHydration = resolve;
    }),
  );
  const hydration = useFavoriteStore.getState().hydrate(ownerA);
  jest
    .mocked(createSavedPlace)
    .mockRejectedValueOnce(
      new ApiError({ status: 0, code: 'CLIENT_NETWORK_ERROR' }),
    );

  await expect(
    useFavoriteStore.getState().addFavorite(favoriteInput),
  ).rejects.toMatchObject({ code: 'CLIENT_NETWORK_ERROR' });
  resolveHydration([serverPlace({ name: '서버 기존 장소' })]);
  await hydration;

  expect(useFavoriteStore.getState()).toMatchObject({
    status: 'ready',
    favorites: [expect.objectContaining({ name: '서버 기존 장소' })],
  });
});

test('초기 hydrate 중 create가 성공하면 최신 목록을 보충해 기존 X와 새 Y를 모두 유지한다', async () => {
  const existingPlaceId = '34000000-0000-4000-8000-000000000002';
  const existingPlace = serverPlace({
    placeId: existingPlaceId,
    name: '기존 X',
  });
  const createdPlace = serverPlace({ name: '새 Y', memo: '사용자 메모' });
  let resolveOldHydration!: (places: SavedPlace[]) => void;
  jest
    .mocked(fetchAllSavedPlaces)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOldHydration = resolve;
      }),
    )
    .mockResolvedValueOnce([existingPlace, createdPlace]);
  jest.mocked(createSavedPlace).mockResolvedValueOnce({
    data: createdPlace,
    status: 201,
    etag: etag1,
    location: `/api/v1/me/saved-places/${placeId}`,
    idempotencyReplayed: false,
    traceId: null,
  });

  const hydration = useFavoriteStore.getState().hydrate(ownerA);
  await useFavoriteStore.getState().addFavorite(favoriteInput);
  resolveOldHydration([existingPlace]);
  await hydration;

  expect(fetchAllSavedPlaces).toHaveBeenCalledTimes(2);
  expect(useFavoriteStore.getState()).toMatchObject({
    ownerId: ownerA,
    status: 'ready',
  });
  expect(
    useFavoriteStore.getState().favorites.map(({ placeId }) => placeId),
  ).toEqual([existingPlaceId, placeId]);
});

test('보충 GET 중 계정이 바뀌면 이전 owner 목록을 새 계정에 commit하지 않는다', async () => {
  const existingPlace = serverPlace({
    placeId: '34000000-0000-4000-8000-000000000002',
    name: 'A의 기존 X',
  });
  const createdPlace = serverPlace({ name: 'A의 새 Y', memo: '사용자 메모' });
  let resolveOldHydration!: (places: SavedPlace[]) => void;
  let resolveSupplement!: (places: SavedPlace[]) => void;
  let markSupplementStarted!: () => void;
  const supplementStarted = new Promise<void>((resolve) => {
    markSupplementStarted = resolve;
  });
  jest
    .mocked(fetchAllSavedPlaces)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOldHydration = resolve;
      }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          markSupplementStarted();
          resolveSupplement = resolve;
        }),
    )
    .mockResolvedValueOnce([serverPlace({ name: 'B의 장소' })]);
  jest.mocked(createSavedPlace).mockResolvedValueOnce({
    data: createdPlace,
    status: 201,
    etag: etag1,
    location: `/api/v1/me/saved-places/${placeId}`,
    idempotencyReplayed: false,
    traceId: null,
  });

  const hydrationA = useFavoriteStore.getState().hydrate(ownerA);
  await useFavoriteStore.getState().addFavorite(favoriteInput);
  resolveOldHydration([existingPlace]);
  await supplementStarted;

  useUserStore.setState({ userId: ownerB, authGeneration: 2 });
  await useFavoriteStore.getState().hydrate(ownerB);
  resolveSupplement([existingPlace, createdPlace]);
  await hydrationA;

  expect(useFavoriteStore.getState()).toMatchObject({
    ownerId: ownerB,
    status: 'ready',
    favorites: [expect.objectContaining({ name: 'B의 장소' })],
  });
});

test('보충 GET 중 새 mutation이 성공하면 더 최신 epoch로 다시 보충한다', async () => {
  const existingPlace = serverPlace({
    placeId: '34000000-0000-4000-8000-000000000002',
    name: '기존 X',
  });
  const createdY = serverPlace({ name: '새 Y', memo: '사용자 메모' });
  const placeZId = '34000000-0000-4000-8000-000000000003';
  const createdZ = serverPlace({
    placeId: placeZId,
    name: '새 Z',
    memo: 'Z memo',
  });
  let resolveOldHydration!: (places: SavedPlace[]) => void;
  let resolveSupplement!: (places: SavedPlace[]) => void;
  let markSupplementStarted!: () => void;
  const supplementStarted = new Promise<void>((resolve) => {
    markSupplementStarted = resolve;
  });
  jest
    .mocked(fetchAllSavedPlaces)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOldHydration = resolve;
      }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          markSupplementStarted();
          resolveSupplement = resolve;
        }),
    )
    .mockResolvedValueOnce([existingPlace, createdY, createdZ]);
  jest
    .mocked(createSavedPlace)
    .mockResolvedValueOnce({
      data: createdY,
      status: 201,
      etag: etag1,
      location: `/api/v1/me/saved-places/${placeId}`,
      idempotencyReplayed: false,
      traceId: null,
    })
    .mockResolvedValueOnce({
      data: createdZ,
      status: 201,
      etag: etag1,
      location: `/api/v1/me/saved-places/${placeZId}`,
      idempotencyReplayed: false,
      traceId: null,
    });

  const hydration = useFavoriteStore.getState().hydrate(ownerA);
  await useFavoriteStore.getState().addFavorite(favoriteInput);
  resolveOldHydration([existingPlace]);
  await supplementStarted;
  await useFavoriteStore.getState().addFavorite({
    ...favoriteInput,
    placeId: placeZId,
    name: '새 Z',
    memo: 'Z memo',
  });
  resolveSupplement([existingPlace, createdY]);
  await hydration;

  expect(fetchAllSavedPlaces).toHaveBeenCalledTimes(3);
  expect(
    useFavoriteStore.getState().favorites.map(({ placeId }) => placeId),
  ).toEqual([existingPlace.placeId, placeId, placeZId]);
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
  expect(deleteSavedPlace).toHaveBeenCalledWith(
    placeId,
    etag1,
    expect.any(Function),
  );
  expect(useFavoriteStore.getState().favorites).toEqual([]);
});

test('DELETE 204 응답이 끝나기 전에는 hydrated 장소를 로컬 성공 처리하지 않는다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValueOnce([serverPlace()]);
  await useFavoriteStore.getState().hydrate(ownerA);
  let resolveDelete!: () => void;
  let markDeleteStarted!: () => void;
  const deleteStarted = new Promise<void>((resolve) => {
    markDeleteStarted = resolve;
  });
  jest.mocked(deleteSavedPlace).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        markDeleteStarted();
        resolveDelete = resolve;
      }),
  );

  const deletion = useFavoriteStore.getState().removeFavorite(placeId);
  await deleteStarted;
  expect(useFavoriteStore.getState().favorites).toHaveLength(1);

  resolveDelete();
  await deletion;
  expect(useFavoriteStore.getState().favorites).toEqual([]);
});

test('ETag가 없으면 DELETE를 보내지 않고 최신 목록을 재조회해 다시 시도하도록 안내한다', async () => {
  jest
    .mocked(fetchAllSavedPlaces)
    .mockResolvedValueOnce([serverPlace({ etag: etag2 })]);
  useFavoriteStore.setState({
    ownerId: ownerA,
    status: 'ready',
    favorites: [
      {
        ...favoriteInput,
        etag: undefined,
        coord: null,
      },
    ],
  });

  await expect(
    useFavoriteStore.getState().removeFavorite(placeId),
  ).rejects.toMatchObject({ code: 'INVALID_ETAG' });

  expect(deleteSavedPlace).not.toHaveBeenCalled();
  expect(fetchAllSavedPlaces).toHaveBeenCalledTimes(1);
  expect(useFavoriteStore.getState()).toMatchObject({
    notice:
      '최신 찜 정보를 다시 불러왔어요. 삭제할 장소를 확인한 뒤 다시 시도해 주세요.',
    favorites: [expect.objectContaining({ etag: etag2 })],
  });
});

test('DELETE 409는 자동 삭제 재시도 없이 최신 목록을 읽고 충돌을 안내한다', async () => {
  jest
    .mocked(fetchAllSavedPlaces)
    .mockResolvedValueOnce([serverPlace()])
    .mockResolvedValueOnce([
      serverPlace({ etag: etag2, memo: '다른 기기 메모' }),
    ]);
  await useFavoriteStore.getState().hydrate(ownerA);
  jest
    .mocked(deleteSavedPlace)
    .mockRejectedValueOnce(
      new ApiError({ status: 409, code: 'SAVED_PLACE_VERSION_CONFLICT' }),
    );

  await expect(
    useFavoriteStore.getState().removeFavorite(placeId),
  ).rejects.toMatchObject({
    status: 409,
    code: 'SAVED_PLACE_VERSION_CONFLICT',
  });

  expect(deleteSavedPlace).toHaveBeenCalledTimes(1);
  expect(deleteSavedPlace).toHaveBeenCalledWith(
    placeId,
    etag1,
    expect.any(Function),
  );
  expect(fetchAllSavedPlaces).toHaveBeenCalledTimes(2);
  expect(useFavoriteStore.getState()).toMatchObject({
    notice:
      '다른 곳에서 변경된 최신 내용을 불러왔어요. 입력한 내용을 확인한 뒤 다시 저장해 주세요.',
    favorites: [
      expect.objectContaining({ etag: etag2, memo: '다른 기기 메모' }),
    ],
  });
});

test('DELETE 충돌 복구 중 authGeneration이 바뀌면 이전 owner 결과와 안내를 폐기한다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValueOnce([serverPlace()]);
  await useFavoriteStore.getState().hydrate(ownerA);
  jest
    .mocked(deleteSavedPlace)
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

  const deleteA = useFavoriteStore.getState().removeFavorite(placeId);
  await recoveryStarted;
  useUserStore.setState({ userId: ownerB, authGeneration: 2 });
  jest
    .mocked(fetchAllSavedPlaces)
    .mockResolvedValueOnce([serverPlace({ name: 'B의 장소' })]);
  await useFavoriteStore.getState().hydrate(ownerB);
  resolveRecoveryA([serverPlace({ memo: 'A 최신 메모' })]);
  await expect(deleteA).rejects.toMatchObject({ status: 409 });

  expect(useFavoriteStore.getState()).toMatchObject({
    ownerId: ownerB,
    favorites: [expect.objectContaining({ name: 'B의 장소' })],
    notice: null,
  });
});
