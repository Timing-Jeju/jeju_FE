import { request, requestData, type ApiResponse } from '@/services/api/http';
import { ApiError } from '@/services/api/problem';
import {
  putTransportEvent,
  deleteTransportEvent,
} from '@/services/api/transportEvents';
import {
  fetchTrip,
  fetchTrips,
  updateTrip,
  replaceDayActivityWindows,
  replacePlannerConditions,
  replaceTripPlacePreferences,
  type ScoreProvenance,
  type Trip,
  type TripListItem,
} from '@/services/api/trips';

jest.mock('@/services/api/http', () => ({
  request: jest.fn(),
  requestData: jest.fn(),
}));

const tripId = '44000000-0000-4000-8000-000000000044';

test('장소 선호 저장 재시도는 호출자가 보존한 동일 키와 ETag를 전달한다', async () => {
  const key = '53000000-0000-4000-8000-000000000001';
  await replaceTripPlacePreferences(tripId, [], '"trip-r1"', key);
  await replaceTripPlacePreferences(tripId, [], '"trip-r1"', key);
  expect(request).toHaveBeenLastCalledWith(
    expect.objectContaining({
      body: { items: [] },
      headers: { 'If-Match': '"trip-r1"', 'Idempotency-Key': key },
    }),
  );
});

test('날짜별 선택 장소는 canonical 필드와 체류시간만 전송하고 찜 생성을 요구하지 않는다', async () => {
  const preference = {
    placeId: tripId,
    type: 'preferred' as const,
    targetDayNo: 2,
    priority: 50,
    requestedStayMinutes: null,
    name: '전송하지 않을 이름',
    address: '전송하지 않을 주소',
  };
  await replaceTripPlacePreferences(tripId, [preference], '"trip-r1"');
  expect(request).toHaveBeenLastCalledWith({
    method: 'PUT',
    path: `/trips/${tripId}/place-preferences`,
    auth: 'required',
    body: {
      items: [
        {
          placeId: tripId,
          type: 'preferred',
          targetDayNo: 2,
          priority: 50,
          requestedStayMinutes: null,
        },
      ],
    },
    headers: { 'If-Match': '"trip-r1"' },
  });
});

test('교통 삭제 재시도는 같은 selector와 멱등 키·ETag를 전달하고 본문을 만들지 않는다', async () => {
  await deleteTransportEvent(tripId, 'departure', '"trip-r1"', 'delete-key');
  expect(request).toHaveBeenCalledWith({
    method: 'DELETE',
    path: `/trips/${tripId}/transport-event`,
    auth: 'required',
    params: { eventType: 'departure' },
    headers: { 'If-Match': '"trip-r1"', 'Idempotency-Key': 'delete-key' },
  });
});

test('항공 저장 재시도는 터미널 ID를 만들지 않고 같은 멱등 키와 ETag를 전달한다', async () => {
  const body = {
    eventType: 'arrival' as const,
    transportType: 'flight' as const,
    terminalPlaceId: null,
    customTerminalName: null,
    scheduledAt: '2026-09-10T09:00:00+09:00',
    transportNumber: null,
    note: null,
  };
  await putTransportEvent(tripId, body, '"trip-r1"', 'flight-key');
  expect(request).toHaveBeenCalledWith({
    method: 'PUT',
    path: `/trips/${tripId}/transport-event`,
    auth: 'required',
    body,
    headers: { 'If-Match': '"trip-r1"', 'Idempotency-Key': 'flight-key' },
  });
});

test('플래너 조건은 canonical 숙소 ID와 스타일 및 동일 멱등 키로 저장한다', async () => {
  const body = {
    dayAnchors: [{ dayId: tripId, lodgingPlaceId: tripId }],
    styleCodes: ['relaxed' as const],
  };
  await replacePlannerConditions(tripId, body, '"trip-r1"', 'planner-key');
  expect(request).toHaveBeenCalledWith({
    method: 'PUT',
    path: `/trips/${tripId}/planner-conditions`,
    auth: 'required',
    body,
    headers: { 'If-Match': '"trip-r1"', 'Idempotency-Key': 'planner-key' },
  });
});
const scheduleVersionId = '49000000-0000-4000-8000-000000000002';
const etag1 = `"trip-${tripId}-r1"`;
const etag2 = `"trip-${tripId}-r2"`;
const provenance: ScoreProvenance = {
  source: 'feasibility_run',
  runId: '48000000-0000-4000-8000-000000000001',
  scheduleVersionId,
  calculatedAt: '2026-09-10T01:00:00Z',
  observedAt: '2026-09-10T01:00:00Z',
  expiresAt: '2026-09-10T02:00:00Z',
  stale: false,
};
const summary: TripListItem = {
  tripId,
  title: '제주 여행',
  status: 'planned',
  startDate: '2026-09-10',
  endDate: '2026-09-12',
  timezone: 'Asia/Seoul',
  activeScheduleVersionId: scheduleVersionId,
  totalScore: 91,
  scoreProvenance: provenance,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-10T01:00:00Z',
};
const trip: Trip = {
  placePreferences: [],
  plannerConditions: { dayAnchors: [], styleCodes: [] },
  ...summary,
  userPace: 'normal',
  transportModes: [{ mode: 'public_transit', priority: 1, primary: true }],
  days: [
    {
      dayId: '45000000-0000-4000-8000-000000000001',
      dayNo: 1,
      date: '2026-09-10',
      activityStartTime: null,
      activityEndTime: null,
    },
  ],
  accommodations: [],
  transportEvents: { arrival: null, departure: null },
  scheduleEffect: 'maintained',
  regenerationRequired: false,
};

const response = (etag: string): ApiResponse<Trip> => ({
  data: trip,
  status: 200,
  etag,
  location: null,
  idempotencyReplayed: null,
  traceId: null,
});

test('여행 상세 조회 ETag를 보존해 다음 변경의 If-Match로 전달한다', async () => {
  jest.mocked(request).mockResolvedValueOnce(response(etag1));
  jest.mocked(request).mockResolvedValueOnce(response(etag2));

  const loaded = await fetchTrip(tripId);
  expect(loaded.etag).toBe(etag1);
  await updateTrip(tripId, { title: '수정된 여행' }, loaded.etag!);

  expect(request).toHaveBeenNthCalledWith(1, {
    method: 'GET',
    path: `/trips/${tripId}`,
    auth: 'required',
  });
  expect(request).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ headers: { 'If-Match': etag1 } }),
  );
  expect(requestData).not.toHaveBeenCalled();
});

test.each([
  [409, 'TRIP_VERSION_CONFLICT'],
  [412, 'PRECONDITION_FAILED'],
] as const)(
  '%i 충돌 뒤 호출자가 상세를 재조회해 최신 ETag를 확보한다',
  async (status, code) => {
    jest.mocked(request).mockResolvedValueOnce(response(etag1));
    jest.mocked(request).mockRejectedValueOnce(new ApiError({ status, code }));
    jest.mocked(request).mockResolvedValueOnce(response(etag2));

    const first = await fetchTrip(tripId);
    await expect(
      updateTrip(tripId, { title: '충돌 요청' }, first.etag!),
    ).rejects.toMatchObject({ status, code });
    expect(request).toHaveBeenCalledTimes(2);

    const refreshed = await fetchTrip(tripId);
    expect(refreshed.etag).toBe(etag2);
    expect(request).toHaveBeenCalledTimes(3);
  },
);

test('목록과 상세의 non-null scoreProvenance 객체 계약을 보존한다', async () => {
  jest.mocked(requestData).mockResolvedValueOnce({
    items: [summary],
    page: { size: 20, hasNext: false, nextCursor: null },
  });
  jest.mocked(request).mockResolvedValueOnce(response(etag1));

  const list = await fetchTrips();
  const detail = await fetchTrip(tripId);

  expect(list.items[0].scoreProvenance).toEqual(provenance);
  expect(detail.data.scoreProvenance).toEqual(provenance);
});

test('활동 시간 저장은 서버 Day ID와 원본 ETag 및 멱등 키를 그대로 전달한다', async () => {
  const body = {
    days: [
      {
        dayId: '45000000-0000-4000-8000-000000000001',
        startTime: '09:00',
        endTime: '18:00',
      },
    ],
  };
  jest.mocked(request).mockResolvedValueOnce(response(etag2));
  const result = await replaceDayActivityWindows(
    tripId,
    body,
    etag1,
    'day-attempt-1',
  );
  expect(request).toHaveBeenCalledWith({
    method: 'PUT',
    path: `/trips/${tripId}/day-activity-windows`,
    auth: 'required',
    body,
    headers: { 'If-Match': etag1, 'Idempotency-Key': 'day-attempt-1' },
  });
  expect(result.etag).toBe(etag2);
});
