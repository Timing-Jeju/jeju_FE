import { request, type ApiResponse } from './http';
import { createIdempotencyKey } from './idempotency';
import type { TripMutationEffect } from './types';

/**
 * 숙소. 여행에 딸린 리소스라 셋 다 인증 필수이고 `If-Match`에 **여행 ETag**를 요구한다.
 * (숙소 자신의 ETag가 아니라 여행의 ETag다 — 응답 `etag`가 곧 다음 호출에 쓸 값이다)
 *
 * 목록 조회 API는 없다. 숙소는 `GET /trips/{tripId}` 응답으로 함께 내려온다.
 */

export interface Accommodation {
  accommodationId: string;
  /** 백엔드 장소와 이어진 숙소면 placeId, 직접 입력한 숙소면 null */
  placeId: string | null;
  /** 직접 입력한 이름. placeId로 고른 숙소면 null */
  customName: string | null;
  /** 화면에 그대로 쓰는 이름 — placeId 쪽 이름과 customName 중 실제 값 */
  name: string;
  /** YYYY-MM-DD */
  checkInDate: string;
  checkOutDate: string;
  /** HH:mm */
  checkInTime: string;
  checkOutTime: string;
  /** 같은 여행 안에서의 숙박 순서 */
  sequenceNo: number;
}

export interface AccommodationMutation extends TripMutationEffect {
  accommodationId: string;
  accommodation: Accommodation;
  /** 다음 변경의 If-Match에 쓸 여행 ETag (응답 헤더의 ETag와 같은 값) */
  etag: string;
  createdAt: string;
}

/**
 * 숙소 등록 요청.
 *
 * 여섯 필드를 **전부** 보내야 한다. `placeId`와 `customName`은 값 대신 null을 보낼 수 있지만
 * 필드 자체를 빼면 400이다. 둘 중 하나는 값이 있어야 한다.
 */
export interface AccommodationCreateRequest {
  placeId: string | null;
  /** 1..100자 */
  customName: string | null;
  /** YYYY-MM-DD */
  checkInDate: string;
  checkOutDate: string;
  /** HH:mm (24시간) */
  checkInTime: string;
  checkOutTime: string;
}

/**
 * 숙소 등록. `Idempotency-Key`와 `If-Match`(여행 ETag)가 필요하다.
 *
 * 숙박 기간은 여행 기간 안에 있어야 하고 다른 숙소와 겹치거나 비면 422다.
 *
 * 오류 code: INVALID_REQUEST (400), TRIP_NOT_FOUND (404),
 * IDEMPOTENCY_KEY_REUSED / TRIP_VERSION_CONFLICT (409),
 * ACCOMMODATION_DATE_GAP_OR_OVERLAP (422).
 */
export const createAccommodation = (
  tripId: string,
  body: AccommodationCreateRequest,
  etag: string,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<ApiResponse<AccommodationMutation>> =>
  request<AccommodationMutation>({
    method: 'POST',
    path: `/trips/${encodeURIComponent(tripId)}/accommodations`,
    auth: 'required',
    body,
    headers: { 'Idempotency-Key': idempotencyKey, 'If-Match': etag },
  });

/**
 * 숙소 수정 요청. 보낸 필드만 바뀌고 최소 한 개는 보내야 한다.
 *
 * `placeId` / `customName`만 null을 받는다. 날짜·시각에 null을 보내면 400이다.
 */
export interface AccommodationPatchRequest {
  placeId?: string | null;
  customName?: string | null;
  /** YYYY-MM-DD */
  checkInDate?: string;
  checkOutDate?: string;
  /** HH:mm */
  checkInTime?: string;
  checkOutTime?: string;
}

/**
 * 숙소 수정. `If-Match`(여행 ETag) 필수.
 *
 * 오류 code: INVALID_REQUEST (400), ACCOMMODATION_NOT_FOUND (404),
 * TRIP_VERSION_CONFLICT (409), ACCOMMODATION_DATE_GAP_OR_OVERLAP (422).
 */
export const updateAccommodation = (
  tripId: string,
  accommodationId: string,
  body: AccommodationPatchRequest,
  etag: string,
): Promise<ApiResponse<AccommodationMutation>> =>
  request<AccommodationMutation>({
    method: 'PATCH',
    path: `/trips/${encodeURIComponent(tripId)}/accommodations/${encodeURIComponent(accommodationId)}`,
    auth: 'required',
    body,
    headers: { 'If-Match': etag },
  });

/**
 * 숙소 삭제. `If-Match`(여행 ETag) 필수이고 204라 body가 없다.
 *
 * 확정 일정이 그 숙소를 쓰고 있으면 422로 막힌다.
 *
 * 오류 code: INVALID_REQUEST (400), ACCOMMODATION_NOT_FOUND (404),
 * TRIP_VERSION_CONFLICT (409), ACCOMMODATION_IN_USE_BY_ACTIVE_SCHEDULE (422).
 */
export const deleteAccommodation = async (
  tripId: string,
  accommodationId: string,
  etag: string,
): Promise<void> => {
  await request<void>({
    method: 'DELETE',
    path: `/trips/${encodeURIComponent(tripId)}/accommodations/${encodeURIComponent(accommodationId)}`,
    auth: 'required',
    headers: { 'If-Match': etag },
  });
};
