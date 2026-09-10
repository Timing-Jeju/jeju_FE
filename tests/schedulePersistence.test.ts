import {
  createSchedulePersistenceActions,
  scheduleToPlaces,
  SchedulePersistenceValidationError,
} from '@/services/schedulePersistence';
import * as scheduleApi from '@/services/api/schedule';
import * as itemApi from '@/services/api/scheduleItems';
import * as tripApi from '@/services/api/trips';
import { ApiError } from '@/services/api/problem';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';
import { useUserStore } from '@/store/useUserStore';

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
) => ({
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
    },
  ],
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

test('결과가 불명확한 실패는 화면을 바꾸지 않고 같은 payload 재시도에 Idempotency-Key를 재사용한다', async () => {
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
  const actions = createSchedulePersistenceActions();

  await expect(actions.updateItem(item1, { stayMinutes: 90 })).rejects.toThrow(
    'network lost',
  );
  expect(useScheduleStore.getState().places[1][0].stayMinutes).toBe(60);

  await actions.updateItem(item1, { stayMinutes: 90 });

  const firstKey = jest.mocked(itemApi.updateScheduleItem).mock.calls[0][4];
  const retryKey = jest.mocked(itemApi.updateScheduleItem).mock.calls[1][4];
  expect(retryKey).toBe(firstKey);
});
