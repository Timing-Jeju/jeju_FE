import {
  createSchedulePersistenceActions,
  scheduleToPlaces,
  scheduleToReviews,
  SchedulePersistenceValidationError,
} from '@/services/schedulePersistence';
import * as scheduleApi from '@/services/api/schedule';
import * as itemApi from '@/services/api/scheduleItems';
import * as tripApi from '@/services/api/trips';
import { ApiError } from '@/services/api/problem';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';
import { useUserStore } from '@/store/useUserStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockJournalStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(
      async (key: string) => mockJournalStorage.get(key) ?? null,
    ),
    setItem: jest.fn(async (key: string, value: string) => {
      mockJournalStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockJournalStorage.delete(key);
    }),
  },
}));

jest.mock('@/services/api/schedule', () => ({ fetchSchedule: jest.fn() }));
jest.mock('@/services/api/scheduleItems', () => ({
  createScheduleItem: jest.fn(),
  updateScheduleItem: jest.fn(),
  deleteScheduleItem: jest.fn(),
  moveScheduleItem: jest.fn(),
  reorderSchedule: jest.fn(),
}));
jest.mock('@/services/api/trips', () => ({ fetchTrip: jest.fn() }));

const tripId = '50000000-0000-4000-8000-000000000001';
const place1 = '34000000-0000-4000-8000-000000000001';
const place2 = '34000000-0000-4000-8000-000000000002';
const item1 = '61000000-0000-4000-8000-000000000001';
const item2 = '61000000-0000-4000-8000-000000000002';
const version1 = '60000000-0000-4000-8000-000000000001';
const version2 = '60000000-0000-4000-8000-000000000002';
const etag1 = `"trip-${tripId}-r1"`;
const etag2 = `"trip-${tripId}-r2"`;

const item = (
  itemId: string,
  placeId: string | null,
  sequenceNo: number,
  title: string,
  progress: 'planned' | 'completed' = 'planned',
) => ({
  itemId,
  sequenceNo,
  itemType: placeId ? ('place_visit' as const) : ('custom' as const),
  placeId,
  title,
  plannedStartAt: `2026-09-10T${sequenceNo === 1 ? '09:00' : '11:00'}:00+09:00`,
  plannedEndAt: `2026-09-10T${sequenceNo === 1 ? '10:00' : '12:00'}:00+09:00`,
  stayMinutes: 60,
  bufferAfterMinutes: 10,
  required: false,
  memo: null,
  progress: {
    status: progress,
    actualStartedAt: null,
    actualArrivedAt: null,
    actualCompletedAt: null,
    updatedAt: '2026-09-01T00:00:00Z',
  },
});

const schedule = (
  version = version1,
  items = [item(item1, place1, 1, '성산일출봉')],
): scheduleApi.TripSchedule => ({
  tripId,
  scheduleVersion: {
    scheduleVersionId: version,
    versionNo: version === version1 ? 1 : 2,
    status: 'active' as const,
    sourceType: 'initial' as const,
    baseScheduleVersionId: null,
    score: null,
    feasibilityStale: false,
  },
  days: [
    {
      dayId: '62000000-0000-4000-8000-000000000001',
      dayNo: 1,
      date: '2026-09-10',
      items,
      legs: [],
    },
  ],
});

const trip = {
  tripId,
  title: '제주 여행',
  status: 'planned' as const,
  startDate: '2026-09-10',
  endDate: '2026-09-10',
  timezone: 'Asia/Seoul' as const,
  userPace: 'normal' as const,
  transportModes: [
    { mode: 'public_transit' as const, priority: 1, primary: true },
  ],
  days: [
    {
      dayId: '62000000-0000-4000-8000-000000000001',
      dayNo: 1,
      date: '2026-09-10',
      activityStartTime: null,
      activityEndTime: null,
    },
  ],
  accommodations: [],
  transportEvents: { arrival: null, departure: null },
  activeScheduleVersionId: version1,
  totalScore: null,
  scoreProvenance: null,
  scheduleEffect: 'maintained' as const,
  regenerationRequired: false,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const mutation = {
  data: {
    tripId,
    previousScheduleVersionId: version1,
    activeScheduleVersionId: version2,
    versionNo: 2,
    sourceType: 'user_edit' as const,
    feasibilityStale: true as const,
    changedItemIds: [item1],
    etag: etag2,
    updatedAt: '2026-09-01T00:01:00Z',
  },
  status: 200,
  etag: etag2,
  location: null,
  idempotencyReplayed: false,
  traceId: null,
};

beforeEach(() => {
  mockJournalStorage.clear();
  useUserStore.setState({ userId: 'user-1' });
  useTripStore.setState({
    tripId,
    etag: etag1,
    serverTrip: trip,
    saved: true,
    dayTimes: { '2026-09-10': { start: '09:00', end: '18:00' } },
  });
  useScheduleStore.setState(useScheduleStore.getInitialState(), true);
});

test('adapter는 서버 순서와 opaque itemId를 보존하고 custom 항목도 실제 제목으로 표시한다', () => {
  const rows = scheduleToPlaces(
    schedule(version1, [
      item(item2, null, 2, '바다 산책'),
      item(item1, place1, 1, '성산일출봉'),
    ]),
  );

  expect(rows[1].map((row) => [row.itemId, row.placeId, row.name])).toEqual([
    [item1, place1, '성산일출봉'],
    [item2, null, '바다 산책'],
  ]);
  expect(scheduleToPlaces(schedule(version1, []))).toEqual({ 1: [] });
});

test('서버 legs는 요금·거리 누락을 합성하지 않고 기존 검토 모델에 연결한다', () => {
  const value = schedule(version1, [
    item(item1, place1, 1, '성산일출봉'),
    item(item2, place2, 2, '섭지코지'),
  ]);
  value.days[0].legs = [
    {
      legId: '63000000-0000-4000-8000-000000000001',
      sequenceNo: 1,
      fromItemId: item1,
      toItemId: item2,
      transportMode: 'public_transit',
      plannedDepartureAt: '2026-09-10T10:00:00+09:00',
      plannedArrivalAt: '2026-09-10T10:30:00+09:00',
      walkMinutes: 5,
      waitMinutes: 5,
      rideMinutes: 20,
      transferMinutes: 0,
      durationMinutes: 30,
      bufferMinutes: 10,
      distanceMeters: null,
      estimatedFareKrw: null,
      riskScore: null,
    },
  ];
  const places = scheduleToPlaces(value);

  const review = scheduleToReviews(value, places)[1];

  expect(review.serverBacked).toBe(true);
  expect(review.legs[0]).toMatchObject({
    from: '성산일출봉',
    to: '섭지코지',
    cost: null,
    distanceText: '거리 정보 없음',
    reason: '위험도 정보 미제공',
  });
});

test('조회는 active version과 서버 항목을 store에 함께 반영한다', async () => {
  jest.mocked(scheduleApi.fetchSchedule).mockResolvedValue(schedule());

  await createSchedulePersistenceActions().hydrateSchedule();

  expect(scheduleApi.fetchSchedule).toHaveBeenCalledWith(tripId);
  expect(useScheduleStore.getState()).toMatchObject({
    activeVersionId: version1,
    versionNo: 1,
    loading: false,
    error: null,
  });
  expect(useScheduleStore.getState().places[1][0].itemId).toBe(item1);
});

test('수정 성공은 최신 ETag/version을 연결하고 서버 결과를 다시 조회한다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(schedule()),
    activeVersionId: version1,
    versionNo: 1,
  });
  jest.mocked(itemApi.updateScheduleItem).mockResolvedValue(mutation);
  jest
    .mocked(scheduleApi.fetchSchedule)
    .mockResolvedValue(
      schedule(version2, [
        { ...item(item1, place1, 1, '성산일출봉'), stayMinutes: 90 },
      ]),
    );

  await createSchedulePersistenceActions().updateItem(item1, {
    stayMinutes: 90,
  });

  expect(itemApi.updateScheduleItem).toHaveBeenCalledWith(
    tripId,
    item1,
    { stayMinutes: 90 },
    { etag: etag1, expectedActiveScheduleVersionId: version1 },
    expect.any(String),
  );
  expect(useTripStore.getState().etag).toBe(etag2);
  expect(useScheduleStore.getState().activeVersionId).toBe(version2);
  expect(useScheduleStore.getState().places[1][0].stayMinutes).toBe(90);
});

test('409/412는 mutation을 자동 재시도하지 않고 trip과 schedule만 재조회한다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(schedule()),
    activeVersionId: version1,
    versionNo: 1,
  });
  const conflict = new ApiError({
    status: 409,
    code: 'ACTIVE_SCHEDULE_VERSION_CONFLICT',
    traceId: '0'.repeat(32),
  });
  jest.mocked(itemApi.updateScheduleItem).mockRejectedValue(conflict);
  jest.mocked(tripApi.fetchTrip).mockResolvedValue({
    data: { ...trip, activeScheduleVersionId: version2 },
    status: 200,
    etag: etag2,
    location: null,
    idempotencyReplayed: null,
    traceId: null,
  });
  jest.mocked(scheduleApi.fetchSchedule).mockResolvedValue(schedule(version2));

  await expect(
    createSchedulePersistenceActions().updateItem(item1, { stayMinutes: 90 }),
  ).rejects.toBe(conflict);

  expect(itemApi.updateScheduleItem).toHaveBeenCalledTimes(1);
  expect(tripApi.fetchTrip).toHaveBeenCalledWith(tripId);
  expect(scheduleApi.fetchSchedule).toHaveBeenCalledWith(tripId);
  expect(useTripStore.getState().etag).toBe(etag2);
  expect(useScheduleStore.getState().activeVersionId).toBe(version2);
});

test('재정렬은 누락·중복 itemId를 네트워크 전에 거부한다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(
      schedule(version1, [
        item(item1, place1, 1, '성산일출봉'),
        item(item2, place2, 2, '섭지코지'),
      ]),
    ),
    activeVersionId: version1,
  });
  const actions = createSchedulePersistenceActions();

  await expect(actions.reorderDay(1, [item1])).rejects.toBeInstanceOf(
    SchedulePersistenceValidationError,
  );
  await expect(actions.reorderDay(1, [item1, item1])).rejects.toBeInstanceOf(
    SchedulePersistenceValidationError,
  );
  expect(itemApi.reorderSchedule).not.toHaveBeenCalled();
});

test('완료 상태 항목의 수정·삭제·이동은 네트워크 전에 거부한다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(
      schedule(version1, [item(item1, place1, 1, '성산일출봉', 'completed')]),
    ),
    activeVersionId: version1,
  });
  const actions = createSchedulePersistenceActions();

  await expect(actions.updateItem(item1, { stayMinutes: 90 })).rejects.toThrow(
    '완료된 일정',
  );
  await expect(actions.deleteItem(item1)).rejects.toThrow('완료된 일정');
  await expect(actions.moveItem(item1, 1, 1)).rejects.toThrow('완료된 일정');
  expect(itemApi.updateScheduleItem).not.toHaveBeenCalled();
  expect(itemApi.deleteScheduleItem).not.toHaveBeenCalled();
  expect(itemApi.moveScheduleItem).not.toHaveBeenCalled();
});

test('생성 payload는 일정 필드만 보내며 GPS 위치를 수집하거나 전송하지 않는다', async () => {
  useScheduleStore.setState({ activeVersionId: version1, places: { 1: [] } });
  jest.mocked(itemApi.createScheduleItem).mockResolvedValue(mutation);
  jest.mocked(scheduleApi.fetchSchedule).mockResolvedValue(schedule(version2));

  await createSchedulePersistenceActions().createPlace(1, {
    placeId: place1,
    name: '성산일출봉',
    category: '관광지',
    address: '제주',
    visitType: '선택방문',
    stayMinutes: 60,
    coord: { latitude: 33.4, longitude: 126.9 },
  });

  expect(itemApi.createScheduleItem).toHaveBeenCalledWith(
    tripId,
    expect.objectContaining({
      dayNo: 1,
      sequenceNo: 1,
      itemType: 'place_visit',
      placeId: place1,
      plannedStartAt: '2026-09-10T09:00:00+09:00',
      stayMinutes: 60,
    }),
    { etag: etag1, expectedActiveScheduleVersionId: version1 },
    expect.any(String),
  );
  const sent = jest.mocked(itemApi.createScheduleItem).mock
    .calls[0][1] as unknown as Record<string, unknown>;
  expect(sent).not.toHaveProperty('coord');
  expect(sent).not.toHaveProperty('latitude');
  expect(sent).not.toHaveProperty('longitude');
});

test('삭제·이동·재정렬 성공도 매번 같은 최신 lock 계약과 서버 재조회를 따른다', async () => {
  const reset = () => {
    useTripStore.setState({ etag: etag1, serverTrip: trip });
    useScheduleStore.setState({
      places: scheduleToPlaces(
        schedule(version1, [
          item(item1, place1, 1, '성산일출봉'),
          item(item2, place2, 2, '섭지코지'),
        ]),
      ),
      activeVersionId: version1,
      versionNo: 1,
    });
    jest
      .mocked(scheduleApi.fetchSchedule)
      .mockResolvedValue(schedule(version2));
  };

  reset();
  jest.mocked(itemApi.deleteScheduleItem).mockResolvedValue(mutation);
  await createSchedulePersistenceActions().deleteItem(item1);
  expect(itemApi.deleteScheduleItem).toHaveBeenCalledWith(
    tripId,
    item1,
    { etag: etag1, expectedActiveScheduleVersionId: version1 },
    expect.any(String),
  );

  reset();
  jest.mocked(itemApi.moveScheduleItem).mockResolvedValue(mutation);
  await createSchedulePersistenceActions().moveItem(item1, 1, 2);
  expect(itemApi.moveScheduleItem).toHaveBeenCalledWith(
    tripId,
    item1,
    { targetDayNo: 1, targetSequenceNo: 2 },
    { etag: etag1, expectedActiveScheduleVersionId: version1 },
    expect.any(String),
  );

  reset();
  jest.mocked(itemApi.reorderSchedule).mockResolvedValue(mutation);
  await createSchedulePersistenceActions().reorderDay(1, [item2, item1]);
  expect(itemApi.reorderSchedule).toHaveBeenCalledWith(
    tripId,
    [{ dayNo: 1, orderedItemIds: [item2, item1] }],
    { etag: etag1, expectedActiveScheduleVersionId: version1 },
    expect.any(String),
  );
});

test('사용자가 바뀐 뒤 도착한 일정 조회 응답은 새 세션 store에 적용하지 않는다', async () => {
  let resolve!: (value: ReturnType<typeof schedule>) => void;
  jest.mocked(scheduleApi.fetchSchedule).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const pending = createSchedulePersistenceActions().hydrateSchedule();

  useUserStore.setState({ userId: 'user-2' });
  resolve(schedule());

  await expect(pending).rejects.toThrow('로그인 사용자가 변경');
  expect(useScheduleStore.getState().places).toEqual({});
});

test('결과가 불명확한 실패는 action 재생성 뒤에도 같은 payload·lock·Idempotency-Key를 재사용한다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(schedule()),
    activeVersionId: version1,
    versionNo: 1,
  });
  jest
    .mocked(itemApi.updateScheduleItem)
    .mockRejectedValueOnce(new Error('network lost'))
    .mockResolvedValueOnce(mutation);
  jest.mocked(scheduleApi.fetchSchedule).mockResolvedValue(schedule(version2));
  await expect(
    createSchedulePersistenceActions().updateItem(item1, { stayMinutes: 90 }),
  ).rejects.toThrow('network lost');
  expect(useScheduleStore.getState().places[1][0].stayMinutes).toBe(60);

  await createSchedulePersistenceActions().updateItem(item1, {
    stayMinutes: 90,
  });

  const firstKey = jest.mocked(itemApi.updateScheduleItem).mock.calls[0][4];
  const retryKey = jest.mocked(itemApi.updateScheduleItem).mock.calls[1][4];
  expect(retryKey).toBe(firstKey);
  expect(jest.mocked(itemApi.updateScheduleItem).mock.calls[1][3]).toEqual({
    etag: etag1,
    expectedActiveScheduleVersionId: version1,
  });
});

test('POST 성공 뒤 GET 실패는 저장 성공이며 재진입해도 POST를 다시 보내지 않는다', async () => {
  useScheduleStore.setState({ activeVersionId: version1, places: { 1: [] } });
  jest.mocked(itemApi.createScheduleItem).mockResolvedValue(mutation);
  jest
    .mocked(scheduleApi.fetchSchedule)
    .mockRejectedValueOnce(new Error('refresh failed'))
    .mockResolvedValueOnce(schedule(version2));
  const place = {
    placeId: place1,
    name: '성산일출봉',
    category: '관광지',
    address: '제주',
    visitType: '선택방문' as const,
    stayMinutes: 60,
    coord: null,
  };

  await expect(
    createSchedulePersistenceActions().createPlace(1, place),
  ).resolves.toMatchObject({ saved: true, refreshed: false });
  expect(itemApi.createScheduleItem).toHaveBeenCalledTimes(1);

  await expect(
    createSchedulePersistenceActions().createPlace(1, place),
  ).resolves.toMatchObject({ saved: true, refreshed: true });
  expect(itemApi.createScheduleItem).toHaveBeenCalledTimes(1);
});

test('느린 이전 GET은 mutation 뒤 최신 GET 결과를 덮지 않는다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(schedule()),
    activeVersionId: version1,
    versionNo: 1,
  });
  let resolveOld!: (value: ReturnType<typeof schedule>) => void;
  jest
    .mocked(scheduleApi.fetchSchedule)
    .mockReturnValueOnce(new Promise((done) => (resolveOld = done)))
    .mockResolvedValueOnce(
      schedule(version2, [
        { ...item(item1, place1, 1, '성산일출봉'), stayMinutes: 90 },
      ]),
    );
  jest.mocked(itemApi.updateScheduleItem).mockResolvedValue(mutation);

  const oldRequest = createSchedulePersistenceActions().hydrateSchedule();
  await createSchedulePersistenceActions().updateItem(item1, {
    stayMinutes: 90,
  });
  resolveOld(schedule(version1));
  await oldRequest;

  expect(useScheduleStore.getState().activeVersionId).toBe(version2);
  expect(useScheduleStore.getState().places[1][0].stayMinutes).toBe(90);
});

test('처리 중인 mutation이 있으면 두 번째 mutation을 보내지 않는다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(schedule()),
    activeVersionId: version1,
  });
  let resolveMutation!: (value: typeof mutation) => void;
  jest
    .mocked(itemApi.updateScheduleItem)
    .mockReturnValue(new Promise((done) => (resolveMutation = done)));
  const pending = createSchedulePersistenceActions().updateItem(item1, {
    stayMinutes: 90,
  });

  await expect(
    createSchedulePersistenceActions().deleteItem(item1),
  ).rejects.toThrow('저장 중');
  expect(itemApi.deleteScheduleItem).not.toHaveBeenCalled();

  jest.mocked(scheduleApi.fetchSchedule).mockResolvedValue(schedule(version2));
  resolveMutation(mutation);
  await pending;
});

test('H:mm 시작 시각을 HH:mm:ss+09:00으로 정규화한다', async () => {
  useTripStore.setState({
    dayTimes: { '2026-09-10': { start: '9:00', end: '18:00' } },
  });
  useScheduleStore.setState({ activeVersionId: version1, places: { 1: [] } });
  jest.mocked(itemApi.createScheduleItem).mockResolvedValue(mutation);
  jest.mocked(scheduleApi.fetchSchedule).mockResolvedValue(schedule(version2));

  await createSchedulePersistenceActions().createPlace(1, {
    placeId: place1,
    name: '성산일출봉',
    category: '관광지',
    address: '제주',
    visitType: null,
    stayMinutes: 60,
    coord: null,
  });

  expect(
    jest.mocked(itemApi.createScheduleItem).mock.calls[0][1].plannedStartAt,
  ).toBe('2026-09-10T09:00:00+09:00');
});

test('A→logout→A는 같은 userId여도 이전 요청 응답을 폐기한다', async () => {
  let resolve!: (value: ReturnType<typeof schedule>) => void;
  jest
    .mocked(scheduleApi.fetchSchedule)
    .mockReturnValue(new Promise((done) => (resolve = done)));
  const pending = createSchedulePersistenceActions().hydrateSchedule();

  useUserStore.setState({ userId: null });
  useUserStore.setState({ userId: 'user-1' });
  resolve(schedule());

  await expect(pending).rejects.toThrow('로그인 사용자가 변경');
  expect(useScheduleStore.getState().places).toEqual({});
});

test('PATCH는 허용 필드만 새 객체로 복사해 위치·초과 필드를 제거한다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(schedule()),
    activeVersionId: version1,
  });
  jest.mocked(itemApi.updateScheduleItem).mockResolvedValue(mutation);
  jest.mocked(scheduleApi.fetchSchedule).mockResolvedValue(schedule(version2));

  await createSchedulePersistenceActions().updateItem(item1, {
    stayMinutes: 90,
    latitude: 33.4,
    longitude: 126.9,
    extra: true,
  } as never);

  expect(itemApi.updateScheduleItem).toHaveBeenCalledWith(
    tripId,
    item1,
    { stayMinutes: 90 },
    expect.any(Object),
    expect.any(String),
  );
});

test('응답 유실 POST가 서버 일정에 있으면 hydrate가 journal을 해소해 다음 mutation을 막지 않는다', async () => {
  useScheduleStore.setState({ activeVersionId: version1, places: { 1: [] } });
  jest
    .mocked(itemApi.createScheduleItem)
    .mockRejectedValueOnce(new Error('response lost'))
    .mockResolvedValueOnce(mutation);
  const actions = createSchedulePersistenceActions();
  const firstPlace: Parameters<typeof actions.createPlace>[1] = {
    placeId: place1,
    name: '성산일출봉',
    category: '관광지',
    address: '제주',
    visitType: null,
    stayMinutes: 60,
    coord: null,
  };

  await expect(actions.createPlace(1, firstPlace)).rejects.toThrow(
    'response lost',
  );
  jest
    .mocked(scheduleApi.fetchSchedule)
    .mockResolvedValue(
      schedule(version2, [item(item1, place1, 1, '성산일출봉')]),
    );
  jest.mocked(tripApi.fetchTrip).mockResolvedValue({
    data: { ...trip, activeScheduleVersionId: version2 },
    status: 200,
    etag: etag2,
    location: null,
    idempotencyReplayed: null,
    traceId: null,
  });

  await createSchedulePersistenceActions().hydrateSchedule();

  expect(mockJournalStorage.size).toBe(0);
  expect(tripApi.fetchTrip).toHaveBeenCalledWith(tripId);
  await expect(
    createSchedulePersistenceActions().createPlace(1, {
      ...firstPlace,
      placeId: place2,
      name: '섭지코지',
    }),
  ).resolves.toMatchObject({ saved: true });
  expect(itemApi.createScheduleItem).toHaveBeenCalledTimes(2);
});

test('서버 확인으로도 불명확한 journal은 사용자가 명시적으로 해제할 수 있다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(schedule()),
    activeVersionId: version1,
  });
  jest
    .mocked(itemApi.updateScheduleItem)
    .mockRejectedValueOnce(new Error('response lost'));
  const actions = createSchedulePersistenceActions();
  await expect(actions.updateItem(item1, { stayMinutes: 90 })).rejects.toThrow(
    'response lost',
  );

  await actions.discardPendingMutation();

  expect(mockJournalStorage.size).toBe(0);
});

test('journal 저장 중 계정이 바뀌면 Spring mutation을 전송하지 않는다', async () => {
  useScheduleStore.setState({
    places: scheduleToPlaces(schedule()),
    activeVersionId: version1,
  });
  let finishSave!: () => void;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishSave = resolve;
      }),
  );

  const pending = createSchedulePersistenceActions().updateItem(item1, {
    stayMinutes: 90,
  });
  await Promise.resolve();
  await Promise.resolve();
  useUserStore.setState({ userId: 'user-2' });
  finishSave();

  await expect(pending).rejects.toThrow('로그인 사용자가 변경');
  expect(itemApi.updateScheduleItem).not.toHaveBeenCalled();
});

test('빈 일정 재시작은 pending create 복구를 노출하고 원래 key로만 재시도한다', async () => {
  useScheduleStore.setState({ activeVersionId: version1, places: { 1: [] } });
  jest
    .mocked(itemApi.createScheduleItem)
    .mockRejectedValueOnce(new Error('response lost'))
    .mockResolvedValueOnce(mutation);
  const place: Parameters<
    ReturnType<typeof createSchedulePersistenceActions>['createPlace']
  >[1] = {
    placeId: place1,
    name: '성산일출봉',
    category: '관광지',
    address: '제주',
    visitType: null,
    stayMinutes: 60,
    coord: null,
  };

  await expect(
    createSchedulePersistenceActions().createPlace(1, place),
  ).rejects.toThrow('response lost');
  const originalKey = jest.mocked(itemApi.createScheduleItem).mock.calls[0][3];
  jest
    .mocked(scheduleApi.fetchSchedule)
    .mockResolvedValue(schedule(version1, []));

  await createSchedulePersistenceActions().hydrateSchedule();

  expect(
    (useScheduleStore.getState() as { pendingMutationRecovery?: boolean })
      .pendingMutationRecovery,
  ).toBe(true);
  jest.mocked(scheduleApi.fetchSchedule).mockResolvedValue(schedule(version2));
  await (
    createSchedulePersistenceActions() as ReturnType<
      typeof createSchedulePersistenceActions
    > & { retryPendingMutation: () => Promise<unknown> }
  ).retryPendingMutation();

  expect(itemApi.createScheduleItem).toHaveBeenCalledTimes(2);
  expect(jest.mocked(itemApi.createScheduleItem).mock.calls[1][3]).toBe(
    originalKey,
  );
});
