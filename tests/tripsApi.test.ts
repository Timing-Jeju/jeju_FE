import { request, requestData, type ApiResponse } from '@/services/api/http';
import { ApiError } from '@/services/api/problem';
import {
  fetchTrip,
  fetchTrips,
  updateTrip,
  type ScoreProvenance,
  type Trip,
  type TripListItem,
} from '@/services/api/trips';

jest.mock('@/services/api/http', () => ({
  request: jest.fn(),
  requestData: jest.fn(),
}));

const tripId = '44000000-0000-4000-8000-000000000044';
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
  ...summary,
  userPace: 'normal',
  transportModes: [{ mode: 'public_transit', priority: 1, primary: true }],
  days: [
    {
      dayId: '45000000-0000-4000-8000-000000000001',
      dayNo: 1,
      date: '2026-09-10',
    },
  ],
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
