import { request, requestData } from '@/services/api/http';
import { fetchSchedule } from '@/services/api/schedule';
import {
  createScheduleItem,
  deleteScheduleItem,
  moveScheduleItem,
  reorderSchedule,
  updateScheduleItem,
} from '@/services/api/scheduleItems';

jest.mock('@/services/api/http', () => ({
  request: jest.fn(),
  requestData: jest.fn(),
}));

const tripId = '50000000-0000-4000-8000-000000000001';
const itemId = '61000000-0000-4000-8000-000000000001';
const versionId = '60000000-0000-4000-8000-000000000001';
const placeId = '34000000-0000-4000-8000-000000000001';
const etag = `"trip-${tripId}-r1"`;
const key = 'schedule-mutation-test-1';
const locks = { etag, expectedActiveScheduleVersionId: versionId };

beforeEach(() => {
  jest.mocked(request).mockResolvedValue({
    data: {},
    status: 200,
    etag: null,
    location: null,
    idempotencyReplayed: null,
    traceId: null,
  });
  jest.mocked(requestData).mockResolvedValue({});
});

test('schedule GET은 선택 versionId를 opaque 값 그대로 전달한다', async () => {
  await fetchSchedule(tripId, versionId);
  expect(requestData).toHaveBeenCalledWith({
    method: 'GET',
    path: `/trips/${tripId}/schedule`,
    auth: 'required',
    params: { versionId },
  });
});

test('일정 항목 5개 mutation은 method/path/body/query/header 계약을 정확히 따른다', async () => {
  await createScheduleItem(
    tripId,
    {
      dayNo: 1,
      sequenceNo: 1,
      itemType: 'place_visit',
      placeId,
      plannedStartAt: '2026-09-10T09:00:00+09:00',
      stayMinutes: 60,
    },
    locks,
    key,
  );
  await updateScheduleItem(tripId, itemId, { stayMinutes: 90 }, locks, key);
  await deleteScheduleItem(tripId, itemId, locks, key);
  await moveScheduleItem(
    tripId,
    itemId,
    { targetDayNo: 2, targetSequenceNo: 1 },
    locks,
    key,
  );
  await reorderSchedule(
    tripId,
    [{ dayNo: 1, orderedItemIds: [itemId] }],
    locks,
    key,
  );

  const headers = { 'If-Match': etag, 'Idempotency-Key': key };
  expect(request).toHaveBeenNthCalledWith(1, {
    method: 'POST',
    path: `/trips/${tripId}/schedule-items`,
    auth: 'required',
    body: {
      expectedActiveScheduleVersionId: versionId,
      dayNo: 1,
      sequenceNo: 1,
      itemType: 'place_visit',
      placeId,
      plannedStartAt: '2026-09-10T09:00:00+09:00',
      stayMinutes: 60,
    },
    headers,
  });
  expect(request).toHaveBeenNthCalledWith(2, {
    method: 'PATCH',
    path: `/trips/${tripId}/schedule-items/${itemId}`,
    auth: 'required',
    body: { expectedActiveScheduleVersionId: versionId, stayMinutes: 90 },
    headers,
  });
  expect(request).toHaveBeenNthCalledWith(3, {
    method: 'DELETE',
    path: `/trips/${tripId}/schedule-items/${itemId}`,
    auth: 'required',
    params: { expectedActiveScheduleVersionId: versionId },
    headers,
  });
  expect(request).toHaveBeenNthCalledWith(4, {
    method: 'POST',
    path: `/trips/${tripId}/schedule-items/${itemId}/move`,
    auth: 'required',
    body: {
      expectedActiveScheduleVersionId: versionId,
      targetDayNo: 2,
      targetSequenceNo: 1,
    },
    headers,
  });
  expect(request).toHaveBeenNthCalledWith(5, {
    method: 'PUT',
    path: `/trips/${tripId}/schedule-order`,
    auth: 'required',
    body: {
      expectedActiveScheduleVersionId: versionId,
      days: [{ dayNo: 1, orderedItemIds: [itemId] }],
    },
    headers,
  });
});
