import { ApiError } from '@/services/api/problem';
import * as accommodations from '@/services/api/accommodations';
import * as transportEvents from '@/services/api/transportEvents';
import * as trips from '@/services/api/trips';
import {
  createTripPersistenceActions,
  toTripCreateRequest,
  toTripPatchRequest,
} from '@/services/tripPersistence';
import { useTripStore, type TripConditions } from '@/store/useTripStore';
import { useUserStore } from '@/store/useUserStore';

jest.mock('@/services/api/trips', () => ({
  createTrip: jest.fn(),
  fetchTrip: jest.fn(),
  fetchTrips: jest.fn(),
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
  replaceDayActivityWindows: jest.fn(),
}));
jest.mock('@/services/api/accommodations', () => ({
  createAccommodation: jest.fn(),
  updateAccommodation: jest.fn(),
  deleteAccommodation: jest.fn(),
}));
jest.mock('@/services/api/transportEvents', () => ({
  putTransportEvent: jest.fn(),
  deleteTransportEvent: jest.fn(),
}));

const tripId = '44000000-0000-4000-8000-000000000044';
const accommodationId = '68000000-0000-4000-8000-000000000069';
const etag1 = `"trip-${tripId}-r1"`;
const etag2 = `"trip-${tripId}-r2"`;
const etag3 = `"trip-${tripId}-r3"`;

const conditions: TripConditions = {
  startDate: '2026-09-10',
  endDate: '2026-09-12',
  arrivalTransport: '비행기',
  arrivalTime: '9:00',
  departureTransport: '선박',
  departureTime: '18:30',
  dayTimes: {
    '2026-09-10': { start: '9:00', end: '18:00' },
    '2026-09-11': { start: '10:00', end: '19:00' },
    '2026-09-12': { start: '10:00', end: '17:00' },
  },
  lodgingMode: null,
  lodging: null,
  dailyLodgings: {},
  styles: ['맛집투어'],
  transport: ['bus', 'taxi'],
};

const trip: trips.Trip = {
  tripId,
  title: '제주 여행',
  status: 'draft',
  startDate: '2026-09-10',
  endDate: '2026-09-12',
  timezone: 'Asia/Seoul',
  userPace: 'normal',
  transportModes: [
    { mode: 'public_transit', priority: 1, primary: true },
    { mode: 'taxi', priority: 2, primary: false },
  ],
  days: [1, 2, 3].map((dayNo) => ({
    dayId: `45000000-0000-4000-8000-00000000000${dayNo}`,
    dayNo,
    date: `2026-09-${dayNo + 9}`,
    activityStartTime: null,
    activityEndTime: null,
  })),
  accommodations: [],
  transportEvents: { arrival: null, departure: null },
  activeScheduleVersionId: null,
  totalScore: null,
  scoreProvenance: null,
  scheduleEffect: 'none',
  regenerationRequired: false,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const response = (etag: string, data = trip) => ({
  data,
  status: 200,
  etag,
  location: null,
  idempotencyReplayed: false,
  traceId: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(trips.replaceDayActivityWindows)
    .mockReset()
    .mockResolvedValue(response(etag3));
  useTripStore.setState(useTripStore.getInitialState(), true);
  useUserStore.setState({
    authReady: true,
    isLoggedIn: true,
    userId: 'user-a',
    userName: null,
  });
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('한국어 이동수단을 순서가 고정된 Spring enum으로 매핑하고 위치·dayTimes를 보내지 않는다', () => {
  const body = toTripCreateRequest(conditions);

  expect(body).toEqual({
    title: '제주 여행',
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    timezone: 'Asia/Seoul',
    userPace: 'normal',
    transportModes: [
      { mode: 'public_transit', priority: 1, primary: true },
      { mode: 'taxi', priority: 2, primary: false },
    ],
  });
  expect(JSON.stringify(body)).not.toMatch(/dayTimes|coord|latitude|longitude/);
  expect(toTripPatchRequest(conditions)).toEqual({
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    timezone: 'Asia/Seoul',
    userPace: 'normal',
    transportModes: body.transportModes,
  });
});

test('Spring에 없는 도보 전용 enum은 다른 값으로 가장하지 않고 차단한다', () => {
  expect(() =>
    toTripCreateRequest({ ...conditions, transport: ['walk'] }),
  ).toThrow('도보 이동 수단은 아직 서버에 저장할 수 없어요.');
});

test('여행 기간은 YYYY-MM-DD 순서와 30일 한도를 요청 전에 검증한다', () => {
  expect(() =>
    toTripCreateRequest({ ...conditions, endDate: '2026-09-09' }),
  ).toThrow('여행 기간은 1일부터 30일까지 설정해 주세요.');
  expect(() =>
    toTripCreateRequest({ ...conditions, endDate: '2026-10-10' }),
  ).toThrow('여행 기간은 1일부터 30일까지 설정해 주세요.');
});

test('생성 실패 재시도는 같은 payload에 같은 Idempotency-Key를 재사용하고 성공 ETag를 저장한다', async () => {
  jest
    .mocked(trips.createTrip)
    .mockRejectedValueOnce(
      new ApiError({ status: 0, code: 'CLIENT_NETWORK_ERROR' }),
    )
    .mockResolvedValueOnce(response(etag1));
  const actions = createTripPersistenceActions();

  await expect(actions.saveTrip(conditions)).rejects.toMatchObject({
    code: 'CLIENT_NETWORK_ERROR',
  });
  await actions.saveTrip(conditions);

  expect(trips.createTrip).toHaveBeenCalledTimes(2);
  expect(jest.mocked(trips.createTrip).mock.calls[0][1]).toBe(
    jest.mocked(trips.createTrip).mock.calls[1][1],
  );
  expect(useTripStore.getState()).toMatchObject({
    tripId,
    etag: etag3,
    saved: true,
    draftSaved: true,
  });
});

test('목록에서 최신 여행을 골라 상세와 strong ETag를 hydration한다', async () => {
  jest.mocked(trips.fetchTrips).mockResolvedValue({
    items: [trip],
    page: { size: 20, hasNext: false, nextCursor: null },
  });
  jest.mocked(trips.fetchTrip).mockResolvedValue(response(etag1));

  await createTripPersistenceActions().hydrateLatestTrip();

  expect(trips.fetchTrips).toHaveBeenCalledWith({ size: 20 });
  expect(trips.fetchTrip).toHaveBeenCalledWith(tripId);
  expect(useTripStore.getState()).toMatchObject({
    tripId,
    etag: etag1,
    startDate: trip.startDate,
    endDate: trip.endDate,
    transport: ['bus', 'taxi'],
    saved: true,
  });
});

test('hydrate 지연 응답은 logout 뒤 이전 사용자의 trip/error를 재주입하지 않는다', async () => {
  const pending = deferred<Awaited<ReturnType<typeof trips.fetchTrips>>>();
  jest.mocked(trips.fetchTrips).mockReturnValue(pending.promise);
  const loading = createTripPersistenceActions().hydrateLatestTrip();

  useTripStore.setState(useTripStore.getInitialState(), true);
  useUserStore.setState({ isLoggedIn: false, userId: null });
  pending.resolve({
    items: [trip],
    page: { size: 20, hasNext: false, nextCursor: null },
  });

  await expect(loading).rejects.toHaveProperty(
    'name',
    'TripSessionChangedError',
  );
  expect(trips.fetchTrip).not.toHaveBeenCalled();
  expect(useTripStore.getState()).toMatchObject({
    tripId: null,
    serverTrip: null,
    serverError: null,
    loading: false,
  });
});

test('mutation 지연 응답은 A→B 전환 뒤 이전 trip과 ETag를 쓰지 않는다', async () => {
  const pending = deferred<Awaited<ReturnType<typeof trips.createTrip>>>();
  jest.mocked(trips.createTrip).mockReturnValue(pending.promise);
  const saving = createTripPersistenceActions().saveTrip(conditions);

  useTripStore.setState(useTripStore.getInitialState(), true);
  useUserStore.setState({ userId: 'user-b' });
  pending.resolve(response(etag1));

  await expect(saving).rejects.toHaveProperty(
    'name',
    'TripSessionChangedError',
  );
  expect(useTripStore.getState()).toMatchObject({
    tripId: null,
    etag: null,
    serverError: null,
  });
});

test('stale PATCH는 자동 재시도하지 않고 최신 ETag만 재조회하며 입력을 보존한다', async () => {
  useTripStore.getState().saveConditions(conditions);
  useTripStore.setState({ tripId, etag: etag1, serverTrip: trip });
  jest
    .mocked(trips.updateTrip)
    .mockRejectedValue(
      new ApiError({ status: 409, code: 'TRIP_VERSION_CONFLICT' }),
    );
  jest.mocked(trips.fetchTrip).mockResolvedValue(response(etag2));

  await expect(
    createTripPersistenceActions().saveTrip({
      ...conditions,
      startDate: '2026-09-11',
    }),
  ).rejects.toMatchObject({ code: 'TRIP_VERSION_CONFLICT' });

  expect(trips.updateTrip).toHaveBeenCalledTimes(1);
  expect(trips.fetchTrip).toHaveBeenCalledTimes(1);
  expect(useTripStore.getState()).toMatchObject({
    startDate: '2026-09-11',
    etag: etag2,
    saved: false,
    draftSaved: true,
  });
});

test('숙소 create/update/delete가 매번 최신 ETag를 이어 쓰고 DELETE 뒤 상세로 갱신한다', async () => {
  useTripStore.setState({ tripId, etag: etag1, serverTrip: trip });
  const accommodation = {
    accommodationId,
    placeId: '00000000-0000-4000-8000-000000000010',
    customName: null,
    name: '제주 호텔',
    checkInDate: '2026-09-10',
    checkOutDate: '2026-09-12',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    sequenceNo: 1,
  };
  const mutation = { data: { accommodationId, accommodation }, etag: etag2 };
  jest
    .mocked(accommodations.createAccommodation)
    .mockResolvedValue(mutation as never);
  jest.mocked(accommodations.updateAccommodation).mockResolvedValue({
    ...mutation,
    etag: etag3,
  } as never);
  jest.mocked(accommodations.deleteAccommodation).mockResolvedValue();
  jest
    .mocked(trips.fetchTrip)
    .mockResolvedValue(response(`"trip-${tripId}-r4"`));
  const actions = createTripPersistenceActions();
  const request = {
    placeId: accommodation.placeId,
    customName: null,
    checkInDate: accommodation.checkInDate,
    checkOutDate: accommodation.checkOutDate,
    checkInTime: accommodation.checkInTime,
    checkOutTime: accommodation.checkOutTime,
  };

  await actions.createAccommodation(request);
  await actions.updateAccommodation(accommodationId, { checkInTime: '16:00' });
  await actions.deleteAccommodation(accommodationId);

  expect(accommodations.createAccommodation).toHaveBeenCalledWith(
    tripId,
    request,
    etag1,
    expect.any(String),
  );
  expect(accommodations.updateAccommodation).toHaveBeenCalledWith(
    tripId,
    accommodationId,
    { checkInTime: '16:00' },
    etag2,
  );
  expect(accommodations.deleteAccommodation).toHaveBeenCalledWith(
    tripId,
    accommodationId,
    etag3,
  );
  expect(useTripStore.getState().etag).toBe(`"trip-${tripId}-r4"`);
});

test('숙소 XOR와 여행 범위·gap·overlap을 요청 전에 검증한다', async () => {
  useTripStore.setState({
    tripId,
    etag: etag1,
    serverTrip: trip,
    accommodations: {
      [accommodationId]: {
        accommodationId,
        placeId: null,
        customName: '첫 숙소',
        name: '첫 숙소',
        checkInDate: '2026-09-10',
        checkOutDate: '2026-09-11',
        checkInTime: '15:00',
        checkOutTime: '11:00',
        sequenceNo: 1,
      },
    },
  });
  const actions = createTripPersistenceActions();
  const base = {
    placeId: '00000000-0000-4000-8000-000000000010',
    customName: null,
    checkInDate: '2026-09-11',
    checkOutDate: '2026-09-12',
    checkInTime: '15:00',
    checkOutTime: '11:00',
  };

  await expect(
    actions.createAccommodation({ ...base, customName: '둘 다 입력' }),
  ).rejects.toThrow('숙소는 검색 장소와 직접 입력 이름 중 하나만 필요해요.');
  await expect(
    actions.createAccommodation({ ...base, checkInDate: '2026-09-12' }),
  ).rejects.toThrow('숙소 날짜의 공백이나 중복을 확인해 주세요.');
  await expect(
    actions.createAccommodation({ ...base, checkInDate: '2026-09-10' }),
  ).rejects.toThrow('숙소 날짜의 공백이나 중복을 확인해 주세요.');
  expect(accommodations.createAccommodation).not.toHaveBeenCalled();
});

test('숙소 PATCH는 허용 필드만 새 객체로 전달해 좌표 등 초과 필드를 제거한다', async () => {
  const current = {
    accommodationId,
    placeId: null,
    customName: '첫 숙소',
    name: '첫 숙소',
    checkInDate: '2026-09-10',
    checkOutDate: '2026-09-12',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    sequenceNo: 1,
  };
  useTripStore.setState({
    tripId,
    etag: etag1,
    serverTrip: trip,
    accommodations: { [accommodationId]: current },
  });
  jest.mocked(accommodations.updateAccommodation).mockResolvedValue({
    data: { accommodationId, accommodation: current },
    etag: etag2,
  } as never);

  await createTripPersistenceActions().updateAccommodation(accommodationId, {
    customName: '수정 숙소',
    latitude: 33.4,
    longitude: 126.5,
  } as accommodations.AccommodationPatchRequest & {
    latitude: number;
    longitude: number;
  });

  expect(accommodations.updateAccommodation).toHaveBeenCalledWith(
    tripId,
    accommodationId,
    { customName: '수정 숙소' },
    etag1,
  );
});

test('입출도 PUT/DELETE는 +09:00 payload와 ETag만 전달하고 GPS를 포함하지 않는다', async () => {
  useTripStore.setState({ tripId, etag: etag1, serverTrip: trip });
  const event = {
    eventType: 'arrival' as const,
    transportType: 'flight' as const,
    terminalPlaceId: '00000000-0000-4000-8000-000000000011',
    customTerminalName: null,
    scheduledAt: '2026-09-10T09:00:00+09:00',
    transportNumber: null,
    note: null,
  };
  jest.mocked(transportEvents.putTransportEvent).mockResolvedValue({
    data: { eventType: 'arrival', deleted: false, event },
    etag: etag2,
  } as never);
  jest.mocked(transportEvents.deleteTransportEvent).mockResolvedValue({
    data: { eventType: 'arrival', deleted: true, event: null },
    etag: etag3,
  } as never);
  const actions = createTripPersistenceActions();

  await actions.putTransportEvent(event);
  await actions.deleteTransportEvent('arrival');

  expect(transportEvents.putTransportEvent).toHaveBeenCalledWith(
    tripId,
    event,
    etag1,
  );
  expect(
    JSON.stringify(
      jest.mocked(transportEvents.putTransportEvent).mock.calls[0],
    ),
  ).not.toMatch(/coord|latitude|longitude|gps/i);
  expect(transportEvents.deleteTransportEvent).toHaveBeenCalledWith(
    tripId,
    'arrival',
    etag2,
  );
  expect(useTripStore.getState().etag).toBe(etag3);
});

test('입출도 터미널 XOR, +09:00, 도착-출발 순서를 요청 전에 검증한다', async () => {
  useTripStore.setState({
    tripId,
    etag: etag1,
    serverTrip: trip,
    transportEvents: {
      arrival: {
        eventType: 'arrival',
        transportType: 'flight',
        terminalPlaceId: null,
        customTerminalName: '제주공항',
        scheduledAt: '2026-09-10T18:00:00+09:00',
        transportNumber: null,
        note: null,
      },
    },
  });
  const actions = createTripPersistenceActions();
  const departure = {
    eventType: 'departure' as const,
    transportType: 'ferry' as const,
    terminalPlaceId: null,
    customTerminalName: '제주항',
    scheduledAt: '2026-09-10T17:00:00+09:00',
    transportNumber: null,
    note: null,
  };

  await expect(actions.putTransportEvent(departure)).rejects.toThrow(
    '도착 시간은 출발 시간보다 빨라야 해요.',
  );
  await expect(
    actions.putTransportEvent({
      ...departure,
      scheduledAt: '2026-09-10T19:00:00Z',
    }),
  ).rejects.toThrow('교통편 시간은 제주 시간(+09:00)으로 입력해 주세요.');
  await expect(
    actions.putTransportEvent({
      ...departure,
      terminalPlaceId: '00000000-0000-4000-8000-000000000011',
    }),
  ).rejects.toThrow('터미널은 검색 장소와 직접 입력 이름 중 하나만 필요해요.');
  expect(transportEvents.putTransportEvent).not.toHaveBeenCalled();
});

test('여행 삭제는 서버 성공 뒤에만 세션 상태를 비운다', async () => {
  useTripStore.setState({ tripId, etag: etag1, serverTrip: trip });
  jest.mocked(trips.deleteTrip).mockResolvedValue();

  await createTripPersistenceActions().deleteTrip();

  expect(trips.deleteTrip).toHaveBeenCalledWith(tripId);
  expect(useTripStore.getState()).toMatchObject({
    tripId: null,
    etag: null,
    saved: false,
    draftSaved: false,
  });
});

test.each([false, true])(
  '같은 사용자의 여행 전환 뒤 늦은 수정 응답을 폐기한다 (원래 여행 재선택=%s)',
  async (returnToOriginal) => {
    useTripStore.setState({ tripId, etag: etag1, serverTrip: trip });
    const pending = deferred<Awaited<ReturnType<typeof trips.updateTrip>>>();
    jest.mocked(trips.updateTrip).mockReturnValue(pending.promise);
    const saving = createTripPersistenceActions().saveTrip(conditions);
    const otherId = '44000000-0000-4000-8000-000000000045';
    useTripStore.setState({
      tripId: otherId,
      etag: `"trip-${otherId}-r1"`,
      serverTrip: { ...trip, tripId: otherId },
      loading: false,
      serverError: null,
    });
    if (returnToOriginal) {
      useTripStore.setState({ tripId, etag: etag3, serverTrip: trip });
    }
    const selected = useTripStore.getState();
    pending.resolve(response(etag2));
    await expect(saving).rejects.toHaveProperty(
      'name',
      'TripSessionChangedError',
    );
    expect(useTripStore.getState()).toBe(selected);
    expect(trips.fetchTrip).not.toHaveBeenCalled();
  },
);

test('상세 복원은 서버 활동 시간과 숙소 및 입출도 정보를 함께 복원하고 이전 여행 값을 제거한다', async () => {
  useTripStore.setState({
    ...conditions,
    pendingTripCreate: { fingerprint: 'old', key: 'old' },
    pendingAccommodationCreate: { fingerprint: 'old', key: 'old' },
    pendingDayActivityWindows: {
      tripId,
      body: { days: [] },
      etag: etag1,
      key: 'old',
      fingerprint: 'old',
    },
    dayTimes: { '2025-01-01': { start: '01:00', end: '02:00' } },
  });
  const stored = {
    ...trip,
    days: [
      {
        dayId: '45000000-0000-4000-8000-000000000001',
        dayNo: 1,
        date: '2026-09-10',
        activityStartTime: '09:30',
        activityEndTime: '17:00',
      },
    ],
    accommodations: [],
    transportEvents: { arrival: null, departure: null },
  };
  jest.mocked(trips.fetchTrips).mockResolvedValue({
    items: [stored],
    page: { size: 20, hasNext: false, nextCursor: null },
  });
  jest.mocked(trips.fetchTrip).mockResolvedValue(response(etag1, stored));
  await createTripPersistenceActions().hydrateLatestTrip();
  expect(useTripStore.getState()).toMatchObject({
    pendingTripCreate: null,
    pendingAccommodationCreate: null,
    pendingDayActivityWindows: null,
    dayTimes: { '2026-09-10': { start: '09:30', end: '17:00' } },
    accommodations: {},
    transportEvents: {},
    arrivalTransport: null,
    arrivalTime: null,
    departureTransport: null,
    departureTime: null,
    lodging: null,
    lodgingMode: null,
    dailyLodgings: {},
  });
  expect(useTripStore.getState().dayTimes).not.toHaveProperty('2025-01-01');
});

test('서버에 저장된 입출도와 숙소의 실제 값만 복원하며 좌표를 만들지 않는다', async () => {
  const accommodation: accommodations.Accommodation = {
    accommodationId,
    placeId: '00000000-0000-4000-8000-000000000010',
    customName: null,
    name: '저장된 숙소',
    checkInDate: '2026-09-10',
    checkOutDate: '2026-09-12',
    checkInTime: '16:00',
    checkOutTime: '10:00',
    sequenceNo: 1,
  };
  const arrival: transportEvents.TransportEvent = {
    eventType: 'arrival',
    transportType: 'ferry',
    terminalPlaceId: null,
    customTerminalName: '저장된 항구',
    scheduledAt: '2026-09-10T09:30:00+09:00',
    transportNumber: null,
    note: null,
  };
  const stored = {
    ...trip,
    accommodations: [accommodation],
    transportEvents: { arrival, departure: null },
  };
  jest.mocked(trips.fetchTrips).mockResolvedValue({
    items: [stored],
    page: { size: 20, hasNext: false, nextCursor: null },
  });
  jest.mocked(trips.fetchTrip).mockResolvedValue(response(etag1, stored));
  await createTripPersistenceActions().hydrateLatestTrip();
  expect(useTripStore.getState()).toMatchObject({
    accommodations: { [accommodationId]: accommodation },
    transportEvents: { arrival },
    arrivalTransport: '선박',
    arrivalTime: '09:30',
    departureTransport: null,
    departureTime: null,
    lodgingMode: 'single',
    lodging: {
      placeId: accommodation.placeId,
      name: '저장된 숙소',
      address: '',
      coord: null,
    },
  });
});

test('여행 목록이 비면 이전 선택과 복원 데이터를 비운다', async () => {
  useTripStore.setState({
    ...conditions,
    tripId,
    etag: etag1,
    serverTrip: trip,
    saved: true,
  });
  jest.mocked(trips.fetchTrips).mockResolvedValue({
    items: [],
    page: { size: 20, hasNext: false, nextCursor: null },
  });
  await expect(
    createTripPersistenceActions().hydrateLatestTrip(),
  ).resolves.toBeNull();
  expect(useTripStore.getState()).toMatchObject({
    tripId: null,
    etag: null,
    serverTrip: null,
    dayTimes: {},
    saved: false,
    arrivalTime: null,
    loading: false,
  });
});

test('기존 활동 시간 입력은 root 저장 후 서버 Day ID와 새 ETag로 전체 저장한다', async () => {
  jest.mocked(trips.createTrip).mockResolvedValueOnce(response(etag1));
  await createTripPersistenceActions().saveTrip(conditions);
  expect(trips.replaceDayActivityWindows).toHaveBeenCalledWith(
    tripId,
    {
      days: [
        { dayId: trip.days[0].dayId, startTime: '09:00', endTime: '18:00' },
        { dayId: trip.days[1].dayId, startTime: '10:00', endTime: '19:00' },
        { dayId: trip.days[2].dayId, startTime: '10:00', endTime: '17:00' },
      ],
    },
    etag1,
    expect.any(String),
  );
  expect(useTripStore.getState()).toMatchObject({ etag: etag3, saved: true });
});

test('활동 시간 응답이 불확실하면 root를 재수정하지 않고 원본 body와 ETag 및 키로 재시도한다', async () => {
  jest.mocked(trips.createTrip).mockResolvedValueOnce(response(etag1));
  jest
    .mocked(trips.replaceDayActivityWindows)
    .mockRejectedValueOnce(
      new ApiError({ status: 0, code: 'CLIENT_NETWORK_ERROR' }),
    )
    .mockResolvedValueOnce(response(etag3));
  const actions = createTripPersistenceActions();
  await expect(actions.saveTrip(conditions)).rejects.toHaveProperty(
    'code',
    'CLIENT_NETWORK_ERROR',
  );
  expect(useTripStore.getState()).toMatchObject({
    tripId,
    saved: false,
    dayTimes: conditions.dayTimes,
  });
  await actions.saveTrip(conditions);
  expect(trips.createTrip).toHaveBeenCalledTimes(1);
  expect(trips.updateTrip).not.toHaveBeenCalled();
  const calls = jest.mocked(trips.replaceDayActivityWindows).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[1]).toEqual(calls[0]);
  expect(useTripStore.getState()).toMatchObject({ etag: etag3, saved: true });
});

test('활동 시간 충돌은 최신 ETag만 복구하고 사용자 입력과 미완료 상태를 보존한다', async () => {
  useTripStore.setState({ tripId, etag: etag1, serverTrip: trip });
  jest.mocked(trips.updateTrip).mockResolvedValueOnce(response(etag2));
  jest
    .mocked(trips.replaceDayActivityWindows)
    .mockRejectedValueOnce(
      new ApiError({ status: 409, code: 'TRIP_VERSION_CONFLICT' }),
    );
  jest.mocked(trips.fetchTrip).mockResolvedValueOnce(response(etag3));
  await expect(
    createTripPersistenceActions().saveTrip(conditions),
  ).rejects.toHaveProperty('code', 'TRIP_VERSION_CONFLICT');
  expect(useTripStore.getState()).toMatchObject({
    saved: false,
    dayTimes: conditions.dayTimes,
    etag: etag3,
  });
});

test('활동 시간 저장 전에는 기본 정보 성공만으로 saved를 true로 알리지 않는다', async () => {
  const observed: boolean[] = [];
  const unsubscribe = useTripStore.subscribe((state) =>
    observed.push(state.saved),
  );
  jest.mocked(trips.createTrip).mockResolvedValueOnce(response(etag1));
  jest
    .mocked(trips.replaceDayActivityWindows)
    .mockRejectedValueOnce(
      new ApiError({ status: 0, code: 'CLIENT_NETWORK_ERROR' }),
    );
  try {
    await expect(
      createTripPersistenceActions().saveTrip(conditions),
    ).rejects.toThrow();
    expect(observed).not.toContain(true);
  } finally {
    unsubscribe();
  }
});

test('동일 여행의 저장 중 재클릭은 두 번째 root 요청을 만들지 않는다', async () => {
  const pending = deferred<Awaited<ReturnType<typeof trips.createTrip>>>();
  jest.mocked(trips.createTrip).mockReturnValueOnce(pending.promise);
  const first = createTripPersistenceActions().saveTrip(conditions);
  const second = createTripPersistenceActions().saveTrip(conditions);
  pending.resolve(response(etag1));
  const [firstResult, secondResult] = await Promise.allSettled([first, second]);
  expect(firstResult.status).toBe('fulfilled');
  expect(secondResult).toMatchObject({
    status: 'rejected',
    reason: { message: expect.stringContaining('저장이 진행 중') },
  });
  expect(trips.createTrip).toHaveBeenCalledTimes(1);
});

test('과거 생성 receipt는 최신 상세를 조회한 후 현재 Day와 ETag로 시간을 저장한다', async () => {
  const {
    transportEvents: ignoredEvents,
    accommodations: ignoredAccommodations,
    ...legacy
  } = trip;
  void ignoredEvents;
  void ignoredAccommodations;
  jest.mocked(trips.createTrip).mockResolvedValueOnce({
    ...response(etag1),
    data: legacy,
    idempotencyReplayed: true,
  });
  jest.mocked(trips.fetchTrip).mockResolvedValueOnce(response(etag2));
  await createTripPersistenceActions().saveTrip(conditions);
  expect(trips.fetchTrip).toHaveBeenCalledWith(tripId);
  expect(jest.mocked(trips.replaceDayActivityWindows).mock.calls[0][2]).toBe(
    etag2,
  );
});

test.each([false, true])(
  '활동 시간 지연 응답도 여행 전환 후 폐기한다 (재선택=%s)',
  async (returnToOriginal) => {
    jest.mocked(trips.createTrip).mockResolvedValueOnce(response(etag1));
    const pending =
      deferred<Awaited<ReturnType<typeof trips.replaceDayActivityWindows>>>();
    jest
      .mocked(trips.replaceDayActivityWindows)
      .mockReturnValueOnce(pending.promise);
    const saving = createTripPersistenceActions().saveTrip(conditions);
    for (
      let i = 0;
      i < 10 && !jest.mocked(trips.replaceDayActivityWindows).mock.calls.length;
      i++
    )
      await Promise.resolve();
    expect(trips.replaceDayActivityWindows).toHaveBeenCalledTimes(1);
    const otherId = '44000000-0000-4000-8000-000000000045';
    useTripStore.setState({
      tripId: otherId,
      etag: `"trip-${otherId}-r1"`,
      serverTrip: { ...trip, tripId: otherId },
      saved: false,
      loading: false,
    });
    if (returnToOriginal)
      useTripStore.setState({ tripId, etag: etag2, serverTrip: trip });
    const selected = useTripStore.getState();
    pending.resolve(response(etag3));
    await expect(saving).rejects.toHaveProperty(
      'name',
      'TripSessionChangedError',
    );
    expect(useTripStore.getState()).toBe(selected);
  },
);

test('응답 대기 중 바뀐 입력은 이전 저장 성공으로 완료 처리하지 않는다', async () => {
  jest.mocked(trips.createTrip).mockResolvedValueOnce(response(etag1));
  const pending =
    deferred<Awaited<ReturnType<typeof trips.replaceDayActivityWindows>>>();
  jest
    .mocked(trips.replaceDayActivityWindows)
    .mockReturnValueOnce(pending.promise);
  const saving = createTripPersistenceActions().saveTrip(conditions);
  for (
    let i = 0;
    i < 10 && !jest.mocked(trips.replaceDayActivityWindows).mock.calls.length;
    i++
  )
    await Promise.resolve();
  const edited = {
    ...conditions,
    dayTimes: {
      ...conditions.dayTimes,
      '2026-09-10': { start: '11:00', end: '18:00' },
    },
  };
  useTripStore.getState().saveConditions(edited);
  pending.resolve(response(etag3));
  await saving;
  expect(useTripStore.getState()).toMatchObject({
    saved: false,
    dayTimes: edited.dayTimes,
  });
});

test('불확실한 저장 후 입력을 바꾸면 이전 요청을 먼저 확정한 뒤 새 시간을 저장한다', async () => {
  jest.mocked(trips.createTrip).mockResolvedValueOnce(response(etag1));
  jest
    .mocked(trips.replaceDayActivityWindows)
    .mockRejectedValueOnce(
      new ApiError({ status: 0, code: 'CLIENT_NETWORK_ERROR' }),
    )
    .mockResolvedValueOnce(response(etag2))
    .mockResolvedValueOnce(response(`"trip-${tripId}-r4"`));
  const actions = createTripPersistenceActions();
  await expect(actions.saveTrip(conditions)).rejects.toThrow();
  const edited = {
    ...conditions,
    dayTimes: {
      ...conditions.dayTimes,
      '2026-09-10': { start: '11:00', end: '18:00' },
    },
  };
  jest.mocked(trips.updateTrip).mockResolvedValueOnce(response(etag3));
  await actions.saveTrip(edited);
  const calls = jest.mocked(trips.replaceDayActivityWindows).mock.calls;
  expect(calls).toHaveLength(3);
  expect(calls[1]).toEqual(calls[0]);
  expect(calls[2][1].days[0].startTime).toBe('11:00');
  expect(calls[2][2]).toBe(etag3);
  expect(calls[2][3]).not.toBe(calls[0][3]);
  expect(trips.updateTrip).toHaveBeenCalledWith(
    tripId,
    toTripPatchRequest(edited),
    etag2,
  );
});

test('같은 여행을 조회하는 동안 바뀐 입력은 늦은 GET으로 덮지 않는다', async () => {
  useTripStore.setState({
    ...conditions,
    tripId,
    etag: etag1,
    serverTrip: trip,
  });
  jest.mocked(trips.fetchTrips).mockResolvedValueOnce({
    items: [trip],
    page: { size: 20, hasNext: false, nextCursor: null },
  });
  const pending = deferred<Awaited<ReturnType<typeof trips.fetchTrip>>>();
  jest.mocked(trips.fetchTrip).mockReturnValueOnce(pending.promise);
  const read = createTripPersistenceActions().hydrateLatestTrip();
  for (
    let i = 0;
    i < 10 && !jest.mocked(trips.fetchTrip).mock.calls.length;
    i++
  )
    await Promise.resolve();
  const edited = {
    ...conditions,
    dayTimes: {
      ...conditions.dayTimes,
      '2026-09-10': { start: '12:00', end: '19:00' },
    },
  };
  useTripStore.getState().saveConditions(edited);
  pending.resolve(response(etag1));
  await expect(read).rejects.toHaveProperty('name', 'TripReadChangedError');
  expect(useTripStore.getState()).toMatchObject({
    dayTimes: edited.dayTimes,
    etag: etag1,
    saved: false,
    loading: false,
  });
});

test('같은 여행의 저장 완료 뒤 늦은 GET은 새 ETag를 되돌리지 않는다', async () => {
  useTripStore.setState({
    ...conditions,
    tripId,
    etag: etag1,
    serverTrip: trip,
  });
  jest.mocked(trips.fetchTrips).mockResolvedValueOnce({
    items: [trip],
    page: { size: 20, hasNext: false, nextCursor: null },
  });
  const pending = deferred<Awaited<ReturnType<typeof trips.fetchTrip>>>();
  jest.mocked(trips.fetchTrip).mockReturnValueOnce(pending.promise);
  const read = createTripPersistenceActions().hydrateLatestTrip();
  for (
    let i = 0;
    i < 10 && !jest.mocked(trips.fetchTrip).mock.calls.length;
    i++
  )
    await Promise.resolve();
  jest.mocked(trips.updateTrip).mockResolvedValueOnce(response(etag2));
  await createTripPersistenceActions().saveTrip(conditions);
  pending.resolve(response(etag1));
  await expect(read).rejects.toHaveProperty('name', 'TripReadChangedError');
  expect(useTripStore.getState()).toMatchObject({
    dayTimes: conditions.dayTimes,
    etag: etag3,
    saved: true,
    loading: false,
  });
});
