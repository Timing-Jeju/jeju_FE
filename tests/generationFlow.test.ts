import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTripStore } from '@/store/useTripStore';
import { useUserStore } from '@/store/useUserStore';
import { useScheduleStore } from '@/store/useScheduleStore';
import {
  beginGeneration,
  generationBlockReason,
  pollGeneration,
  useGenerationStore,
  applyGeneration,
  resumeGenerationApplication,
} from '@/services/generationFlow';
import * as api from '@/services/api/generations';
import { fetchSchedule } from '@/services/api/schedule';
import { fetchTrip } from '@/services/api/trips';
import { ApiError } from '@/services/api/problem';

jest.mock('@/services/plannerAvailability', () => ({
  PLANNER_AVAILABLE: true,
}));
jest.mock('@/services/api/generations', () => ({
  ...jest.requireActual('@/services/api/generations'),
  startGeneration: jest.fn(),
  getGeneration: jest.fn(),
  getCandidateSchedule: jest.fn(),
  applyCandidate: jest.fn(),
}));
jest.mock('@/services/api/schedule', () => ({ fetchSchedule: jest.fn() }));
jest.mock('@/services/api/trips', () => ({ fetchTrip: jest.fn() }));

const id = (n: number) =>
  `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const tripId = id(1);
const runId = id(2);
const accepted = {
  runId,
  pollUrl: `/api/v1/trips/${tripId}/schedule-generations/${runId}`,
  commandInputHash: 'a'.repeat(64),
  status: 'queued' as const,
};
const candidates: api.Candidate[] = (
  ['balanced', 'relaxed', 'experience_max'] as const
).map((strategy, index) => ({
  candidateId: id(index + 10),
  scheduleVersionId: id(index + 20),
  strategy,
  rank: index + 1,
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  explanation: '검증된 일정',
  scheduleUrl: `/api/v1/trips/${tripId}/schedule-versions/${id(index + 20)}`,
  applyUrl: `${accepted.pollUrl}/candidates/${id(index + 10)}/apply`,
}));
const success: api.GenerationRun = {
  ...accepted,
  status: 'succeeded',
  result: { outcome: 'success', baseScheduleVersionId: null, candidates },
};
const schedule = {
  tripId,
  scheduleVersion: {
    scheduleVersionId: id(20),
    versionNo: 1,
    status: 'candidate',
  },
  days: [{ dayNo: 1, items: [], legs: [] }],
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useUserStore.setState({ userId: id(100) });
  useGenerationStore.setState({
    journal: null,
    run: null,
    candidate: null,
    review: null,
    busy: false,
  });
  useTripStore.setState({
    tripId,
    saved: true,
    etag: '"trip-r1"',
    loading: false,
    arrivalTransport: '비행기',
    departureTransport: '비행기',
    lodgingMode: 'single',
    lodging: { placeId: id(5), name: '숙소', address: '', coord: null },
    serverTrip: {
      tripId,
      activeScheduleVersionId: null,
      days: [
        {
          dayId: id(3),
          dayNo: 1,
          date: '2099-01-01',
          activityStartTime: '09:00',
          activityEndTime: '18:00',
        },
      ],
    } as any,
  });
  useScheduleStore.setState({
    activeVersionId: null,
    mutating: false,
    pendingMutationRecovery: false,
  });
  jest
    .mocked(fetchSchedule)
    .mockRejectedValue(
      new ApiError({ status: 404, code: 'SCHEDULE_NOT_FOUND' }),
    );
  jest.mocked(api.startGeneration).mockResolvedValue({ data: accepted } as any);
  jest
    .mocked(api.getGeneration)
    .mockResolvedValue({ data: success, retryAfterSeconds: 7 } as any);
  jest
    .mocked(api.getCandidateSchedule)
    .mockResolvedValue({ data: schedule } as any);
});

afterEach(() => {
  useGenerationStore.setState({ run: null });
});

test('수동 일정이 채워져 있어도 AI 이력이 없으면 Day 1을 생성한다', async () => {
  const trip = useTripStore.getState().serverTrip!;
  useTripStore.setState({
    serverTrip: { ...trip, activeScheduleVersionId: id(40) },
  });
  useScheduleStore.setState({ activeVersionId: id(40) });
  jest.mocked(fetchSchedule).mockResolvedValue({
    ...schedule,
    scheduleVersion: {
      ...schedule.scheduleVersion,
      scheduleVersionId: id(40),
      status: 'active',
    },
    days: [
      {
        dayId: id(3),
        dayNo: 1,
        date: '2099-01-01',
        items: [{ itemId: id(41) }],
        legs: [],
        hasGenerationResult: false,
      },
    ],
  } as any);
  await beginGeneration(1);
  expect(api.startGeneration).toHaveBeenCalled();
  expect(
    useGenerationStore.getState().journal?.command
      .expectedActiveScheduleVersionId,
  ).toBe(id(40));
});

test.each([
  ['이미 AI 이력이 있음', true, 'Day 1부터 첫 미완료 날짜'],
  ['서버 이력 필드 누락', undefined, 'AI 생성 이력을 확인할 수 없어요'],
])('%s이면 Day 1을 중복 접수하지 않는다', async (_purpose, result, message) => {
  const trip = useTripStore.getState().serverTrip!;
  useTripStore.setState({
    serverTrip: { ...trip, activeScheduleVersionId: id(40) },
  });
  useScheduleStore.setState({ activeVersionId: id(40) });
  jest.mocked(fetchSchedule).mockResolvedValue({
    ...schedule,
    scheduleVersion: {
      ...schedule.scheduleVersion,
      scheduleVersionId: id(40),
      status: 'active',
    },
    days: [
      {
        dayId: id(3),
        dayNo: 1,
        date: '2099-01-01',
        items: [],
        legs: [],
        ...(result === undefined ? {} : { hasGenerationResult: result }),
      },
    ],
  } as any);
  await expect(beginGeneration(1)).rejects.toThrow(message as string);
  expect(api.startGeneration).not.toHaveBeenCalled();
});

test('최대 5일을 넘으면 저장된 일반 여행도 AI 접수를 하지 않는다', async () => {
  const trip = useTripStore.getState().serverTrip!;
  useTripStore.setState({
    serverTrip: {
      ...trip,
      days: Array.from({ length: 6 }, (_, i) => ({
        ...trip.days[0],
        dayNo: i + 1,
      })),
    },
  });
  await expect(beginGeneration(1)).rejects.toThrow('최대 5일');
  expect(api.startGeneration).not.toHaveBeenCalled();
});

test('410 만료는 후보와 보류 기록을 폐기해 사용자가 재생성할 수 있게 한다', async () => {
  await beginGeneration(1);
  jest
    .mocked(api.getGeneration)
    .mockRejectedValueOnce(
      new ApiError({ status: 410, code: 'CANDIDATE_EXPIRED' }),
    );
  await expect(
    pollGeneration(new AbortController().signal),
  ).rejects.toMatchObject({ status: 410 });
  expect(useGenerationStore.getState().journal).toBeNull();
  expect(await AsyncStorage.getAllKeys()).toHaveLength(0);
});

test('첫 생성의 null 기준 버전과 원본 ETag를 보내고 응답 유실에는 같은 키로 재시도한다', async () => {
  jest.mocked(api.startGeneration).mockRejectedValueOnce(new Error('network'));
  await expect(beginGeneration(1)).rejects.toThrow('network');
  await beginGeneration(1);
  const calls = jest.mocked(api.startGeneration).mock.calls;
  expect(calls[0].slice(0, 4)).toEqual(calls[1].slice(0, 4));
  expect(calls[1][1]).toEqual({
    targetDayId: id(3),
    candidateCount: 3,
    expectedActiveScheduleVersionId: null,
  });
  const stored = (await AsyncStorage.getAllKeys()).length;
  expect(stored).toBe(1);
});

test('이미 접수된 작업은 앱 메모리가 초기화돼도 다시 POST하지 않는다', async () => {
  await beginGeneration(1);
  useGenerationStore.setState({ journal: null });
  await beginGeneration(1);
  expect(api.startGeneration).toHaveBeenCalledTimes(1);
});

test('선박과 5일 초과는 생성 호출 전에 차단한다', async () => {
  useTripStore.setState({ arrivalTransport: '선박' });
  expect(generationBlockReason(1)).toContain('항공');
  await expect(beginGeneration(1)).rejects.toThrow('항공');
  expect(api.startGeneration).not.toHaveBeenCalled();
});

test('후보가 2개이거나 외부 URL이면 미리보기 조회 전에 거부한다', () => {
  expect(() =>
    api.validateRun(
      {
        ...success,
        result: { ...success.result!, candidates: candidates.slice(0, 2) },
      },
      tripId,
    ),
  ).toThrow();
  expect(() =>
    api.validateRun(
      {
        ...success,
        result: {
          ...success.result!,
          candidates: [
            { ...candidates[0], scheduleUrl: 'https://example.com' },
            ...candidates.slice(1),
          ],
        },
      },
      tripId,
    ),
  ).toThrow();
});

test('서버의 24시간 후보를 허용하며 단말 시계로 보존 기한을 축소하지 않는다', () => {
  const result = {
    ...success,
    result: {
      ...success.result!,
      candidates: candidates.map((candidate) => ({
        ...candidate,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })),
    },
  };
  expect(api.validateRun(result, tripId)).toBe(result);
  // 단말 시계가 서버보다 느려도 유효 후보 자체를 잘못된 계약으로 거부하지 않는다.
  const now = jest
    .spyOn(Date, 'now')
    .mockReturnValue(Date.now() - 60 * 60 * 1000);
  try {
    expect(api.validateRun(result, tripId)).toBe(result);
  } finally {
    now.mockRestore();
  }
});

test('정확히 세 후보 중 균형형만 미리보기하고 자동 적용하지 않는다', async () => {
  await beginGeneration(1);
  const result = await pollGeneration(new AbortController().signal);
  expect(result?.retryAfterSeconds).toBe(7);
  expect(useGenerationStore.getState().candidate?.strategy).toBe('balanced');
  expect(api.applyCandidate).not.toHaveBeenCalled();
  for (const key of await AsyncStorage.getAllKeys()) {
    expect(await AsyncStorage.getItem(key)).not.toContain('검증된 일정');
  }
});

test('적용 후 다음 날짜는 항목 수가 아니라 AI 이력으로 결정한다', async () => {
  await beginGeneration(1);
  await pollGeneration(new AbortController().signal);
  jest
    .mocked(api.applyCandidate)
    .mockResolvedValue({ data: { activeScheduleVersionId: id(20) } } as any);
  const original = useTripStore.getState().serverTrip!;
  jest.mocked(fetchTrip).mockResolvedValue({
    data: {
      ...original,
      activeScheduleVersionId: id(20),
      days: [
        original.days[0],
        { ...original.days[0], dayId: id(4), dayNo: 2, date: '2099-01-02' },
      ],
    },
    etag: '"trip-r2"',
  } as any);
  jest.mocked(fetchSchedule).mockResolvedValue({
    ...schedule,
    scheduleVersion: { ...schedule.scheduleVersion, status: 'active' },
    days: [
      { dayNo: 1, items: [], legs: [], hasGenerationResult: true },
      { dayNo: 2, items: [], legs: [], hasGenerationResult: false },
    ],
  } as any);
  await expect(applyGeneration()).resolves.toBe(2);
});

test('여행 전환 후 늦은 polling 응답이 새 여행의 후보를 덮지 않는다', async () => {
  await beginGeneration(1);
  let resolve!: (value: any) => void;
  jest.mocked(api.getGeneration).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const request = pollGeneration(new AbortController().signal);
  useTripStore.setState({ tripId: id(200) });
  resolve({ data: success });
  await expect(request).rejects.toThrow('변경');
  expect(useGenerationStore.getState().candidate).toBeNull();
});

test.each(['버전 불일치', '이력 필드 누락'])(
  '적용 후 %s이면 동일 키 복구 기록을 보존한다',
  async (purpose) => {
    await beginGeneration(1);
    await pollGeneration(new AbortController().signal);
    jest
      .mocked(api.applyCandidate)
      .mockResolvedValue({ data: { activeScheduleVersionId: id(20) } } as any);
    jest.mocked(fetchTrip).mockResolvedValue({
      data: {
        ...useTripStore.getState().serverTrip,
        activeScheduleVersionId: id(20),
      },
      etag: '"trip-r2"',
    } as any);
    jest.mocked(fetchSchedule).mockResolvedValue({
      ...schedule,
      scheduleVersion: {
        ...schedule.scheduleVersion,
        status: 'active',
        scheduleVersionId: purpose === '버전 불일치' ? id(21) : id(20),
      },
      days: [
        {
          dayNo: 1,
          items: [],
          legs: [],
          ...(purpose === '이력 필드 누락'
            ? {}
            : { hasGenerationResult: true }),
        },
      ],
    } as any);
    await expect(applyGeneration()).rejects.toThrow();
    expect(await AsyncStorage.getAllKeys()).toHaveLength(1);
    expect(useGenerationStore.getState().journal?.apply).toBeDefined();
    expect(useScheduleStore.getState().activeVersionId).toBeNull();
  },
);

test('적용 응답 유실 후에는 후보 본문 없이 원래 키와 ETag로 receipt를 확인한다', async () => {
  await beginGeneration(1);
  await pollGeneration(new AbortController().signal);
  jest.mocked(fetchTrip).mockResolvedValue({
    data: {
      ...useTripStore.getState().serverTrip,
      activeScheduleVersionId: id(20),
    },
    etag: '"trip-r2"',
  } as any);
  jest.mocked(api.applyCandidate).mockRejectedValueOnce(new Error('network'));
  await expect(applyGeneration()).rejects.toThrow('network');
  const original = jest.mocked(api.applyCandidate).mock.calls[0];
  useGenerationStore.setState({ journal: null, candidate: null, review: null });
  await beginGeneration(1);
  jest
    .mocked(api.applyCandidate)
    .mockResolvedValue({ data: { activeScheduleVersionId: id(20) } } as any);
  jest.mocked(fetchSchedule).mockResolvedValue({
    ...schedule,
    scheduleVersion: { ...schedule.scheduleVersion, status: 'active' },
    days: schedule.days.map((day) => ({ ...day, hasGenerationResult: true })),
  } as any);
  await resumeGenerationApplication();
  expect(jest.mocked(api.applyCandidate).mock.calls[1].slice(0, 4)).toEqual(
    original.slice(0, 4),
  );
  expect(useScheduleStore.getState().activeVersionId).toBe(id(20));
  expect(await AsyncStorage.getAllKeys()).toHaveLength(0);
});
