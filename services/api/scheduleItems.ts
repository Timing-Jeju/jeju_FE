import { request, type ApiResponse } from './http';
import { createIdempotencyKey } from './idempotency';

/**
 * 확정 일정 직접 편집. 다섯 개 모두 인증 필수이고
 * `If-Match`(여행 ETag)와 `Idempotency-Key`를 **둘 다** 요구한다.
 *
 * 잠금이 두 겹인 게 이 도메인의 특징이다.
 * - `If-Match` — 여행 자체가 그 사이 바뀌지 않았는지 (여행 ETag)
 * - `expectedActiveScheduleVersionId` — 보고 있던 일정 버전이 아직 유효한지
 *
 * 두 값 모두 `GET /trips/{tripId}/schedule` 응답에서 가져와 들고 있다가 그대로 넘긴다.
 * 편집이 성공할 때마다 **새 일정 버전이 만들어지므로**, 응답의
 * `activeScheduleVersionId`와 `etag`로 갱신하지 않으면 다음 호출이 409로 막힌다.
 */

/** 일정 한 칸의 종류 */
export type ScheduleItemType =
  | 'place_visit'
  | 'meal'
  | 'accommodation'
  | 'arrival'
  | 'departure'
  | 'free_time'
  | 'custom';

/**
 * 일정을 바꾼 결과. 다섯 호출이 모두 같은 모양으로 답한다.
 *
 * `feasibilityStale`은 항상 true다 — 직접 편집한 일정은 이동 시간 재계산 전이라는 뜻이다.
 */
export interface ScheduleMutationResult {
  tripId: string;
  previousScheduleVersionId: string;
  /** 이 편집으로 새로 만들어진 버전. 다음 호출에 이 값을 쓴다 */
  activeScheduleVersionId: string;
  versionNo: number;
  sourceType: 'user_edit';
  feasibilityStale: boolean;
  changedItemIds: string[];
  /** 다음 호출의 If-Match에 쓸 여행 ETag */
  etag: string;
  updatedAt: string;
}

/** 다섯 호출이 공통으로 요구하는 두 잠금 값 */
interface ScheduleMutationLocks {
  /** 여행 ETag — If-Match 헤더로 나간다 */
  etag: string;
  /** 보고 있던 일정 버전 — 요청 body/query로 나간다 */
  expectedActiveScheduleVersionId: string;
}

const mutate = <T>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT',
  body: unknown,
  etag: string,
  idempotencyKey: string,
) =>
  request<T>({
    method,
    path,
    auth: 'required',
    body,
    headers: { 'If-Match': etag, 'Idempotency-Key': idempotencyKey },
  });

/**
 * 일정 항목 추가 요청.
 *
 * `itemType`에 따라 이어 붙일 대상이 달라진다 — `place_visit`/`meal`은 `placeId`,
 * `accommodation`은 `accommodationId`, `arrival`/`departure`는 `transportEventId`가
 * 필요하고, `free_time`/`custom`은 `title`을 쓴다. 어긋나면 422다.
 */
export interface ScheduleItemCreateRequest {
  /** 1부터 */
  dayNo: number;
  /** 1부터. 그 자리에 끼워 넣고 뒤를 밀어낸다 */
  sequenceNo: number;
  itemType: ScheduleItemType;
  placeId?: string;
  accommodationId?: string;
  transportEventId?: string;
  /** 1..200자 */
  title?: string;
  /** offset을 붙인 date-time (예: 2026-09-01T10:00:00+09:00) */
  plannedStartAt: string;
  /** 1..1440 */
  stayMinutes: number;
  /** 0..1440 */
  bufferAfterMinutes?: number;
  required?: boolean;
  /** 최대 500자. null로 비운다 */
  memo?: string | null;
}

/**
 * 일정 항목 추가.
 *
 * 오류 code: INVALID_REQUEST / IDEMPOTENCY_KEY_REQUIRED /
 * IDEMPOTENCY_KEY_INVALID (400), TRIP_NOT_FOUND / PLACE_NOT_FOUND /
 * ACCOMMODATION_NOT_FOUND / TRANSPORT_EVENT_NOT_FOUND /
 * SCHEDULE_VERSION_NOT_FOUND (404), IDEMPOTENCY_KEY_REUSED /
 * TRIP_VERSION_CONFLICT / ACTIVE_SCHEDULE_VERSION_CONFLICT (409),
 * SCHEDULE_ITEM_INVALID / SCHEDULE_LEG_INCOMPLETE (422).
 */
export const createScheduleItem = (
  tripId: string,
  body: ScheduleItemCreateRequest,
  { etag, expectedActiveScheduleVersionId }: ScheduleMutationLocks,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<ApiResponse<ScheduleMutationResult>> =>
  mutate<ScheduleMutationResult>(
    `/trips/${encodeURIComponent(tripId)}/schedule-items`,
    'POST',
    { expectedActiveScheduleVersionId, ...body },
    etag,
    idempotencyKey,
  );

/**
 * 일정 항목 수정 요청. 보낸 필드만 바뀐다.
 * `memo`만 null을 받아 비울 수 있다.
 */
export interface ScheduleItemPatchRequest {
  placeId?: string;
  accommodationId?: string;
  transportEventId?: string;
  title?: string;
  plannedStartAt?: string;
  stayMinutes?: number;
  bufferAfterMinutes?: number;
  required?: boolean;
  memo?: string | null;
}

/**
 * 일정 항목 수정. 이미 다녀온(완료된) 항목은 422 SCHEDULE_ITEM_COMPLETED다.
 *
 * 오류 code: INVALID_REQUEST (400), SCHEDULE_ITEM_NOT_FOUND (404),
 * ACTIVE_SCHEDULE_VERSION_CONFLICT (409),
 * SCHEDULE_ITEM_INVALID / SCHEDULE_ITEM_COMPLETED / SCHEDULE_LEG_INCOMPLETE (422).
 */
export const updateScheduleItem = (
  tripId: string,
  itemId: string,
  body: ScheduleItemPatchRequest,
  { etag, expectedActiveScheduleVersionId }: ScheduleMutationLocks,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<ApiResponse<ScheduleMutationResult>> =>
  mutate<ScheduleMutationResult>(
    `/trips/${encodeURIComponent(tripId)}/schedule-items/${encodeURIComponent(itemId)}`,
    'PATCH',
    { expectedActiveScheduleVersionId, ...body },
    etag,
    idempotencyKey,
  );

/**
 * 일정 항목 삭제.
 *
 * 이것만 `expectedActiveScheduleVersionId`가 body가 아니라 **query**로 간다
 * (서버가 body 없는 DELETE만 받는다). 204가 아니라 200 + 변경 결과다.
 *
 * 오류 code: INVALID_REQUEST (400), SCHEDULE_ITEM_NOT_FOUND (404),
 * ACTIVE_SCHEDULE_VERSION_CONFLICT (409),
 * SCHEDULE_ITEM_COMPLETED / SCHEDULE_DAY_EMPTY / SCHEDULE_LEG_INCOMPLETE (422).
 */
export const deleteScheduleItem = (
  tripId: string,
  itemId: string,
  { etag, expectedActiveScheduleVersionId }: ScheduleMutationLocks,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<ApiResponse<ScheduleMutationResult>> =>
  request<ScheduleMutationResult>({
    method: 'DELETE',
    path: `/trips/${encodeURIComponent(tripId)}/schedule-items/${encodeURIComponent(itemId)}`,
    auth: 'required',
    params: { expectedActiveScheduleVersionId },
    headers: { 'If-Match': etag, 'Idempotency-Key': idempotencyKey },
  });

/**
 * 일정 항목을 다른 날 / 다른 순서로 옮긴다.
 *
 * `plannedStartAt`을 빼면 옮긴 자리에 맞춰 서버가 다시 잡는다.
 *
 * 오류 code: INVALID_REQUEST (400),
 * SCHEDULE_ITEM_NOT_FOUND / TRIP_DAY_NOT_FOUND (404),
 * ACTIVE_SCHEDULE_VERSION_CONFLICT (409),
 * SCHEDULE_ITEM_INVALID / SCHEDULE_ITEM_COMPLETED / SCHEDULE_DAY_EMPTY (422).
 */
export const moveScheduleItem = (
  tripId: string,
  itemId: string,
  target: {
    targetDayNo: number;
    targetSequenceNo: number;
    plannedStartAt?: string;
  },
  { etag, expectedActiveScheduleVersionId }: ScheduleMutationLocks,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<ApiResponse<ScheduleMutationResult>> =>
  mutate<ScheduleMutationResult>(
    `/trips/${encodeURIComponent(tripId)}/schedule-items/${encodeURIComponent(itemId)}/move`,
    'POST',
    { expectedActiveScheduleVersionId, ...target },
    etag,
    idempotencyKey,
  );

/** 하루치 항목 순서 — 그 날의 **모든** 항목 id를 원하는 순서대로 담는다 */
export interface ScheduleDayOrder {
  dayNo: number;
  orderedItemIds: string[];
}

/**
 * 하루 안에서 항목 순서를 바꾼다. 드래그로 재정렬한 뒤 한 번에 보낸다.
 *
 * `orderedItemIds`는 그 날 항목의 **순열**이어야 한다. 빠뜨리거나 없는 id를 넣으면
 * 400 SCHEDULE_ORDER_NOT_PERMUTATION이다.
 *
 * 오류 code: INVALID_REQUEST / SCHEDULE_ORDER_NOT_PERMUTATION (400),
 * SCHEDULE_ITEM_NOT_FOUND (404), ACTIVE_SCHEDULE_VERSION_CONFLICT (409),
 * SCHEDULE_ITEM_INVALID / SCHEDULE_ITEM_COMPLETED (422).
 */
export const reorderSchedule = (
  tripId: string,
  days: ScheduleDayOrder[],
  { etag, expectedActiveScheduleVersionId }: ScheduleMutationLocks,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<ApiResponse<ScheduleMutationResult>> =>
  mutate<ScheduleMutationResult>(
    `/trips/${encodeURIComponent(tripId)}/schedule-order`,
    'PUT',
    { expectedActiveScheduleVersionId, days },
    etag,
    idempotencyKey,
  );
