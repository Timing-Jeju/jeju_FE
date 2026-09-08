import { request, type ApiResponse } from './http';
import type { TripMutationEffect } from './types';

/**
 * 제주 오가는 교통편(비행기 / 배). 둘 다 인증 필수이고
 * `If-Match`에 **여행 ETag**를 요구한다.
 *
 * 여행 하나당 `arrival`(입도) 1건, `departure`(출도) 1건이라 생성/수정 구분 없이 PUT 하나로
 * 덮어쓴다. 조회 API는 없고 `GET /trips/{tripId}` 응답에 함께 내려온다.
 */

/** 입도인지 출도인지 */
export type TransportEventType = 'arrival' | 'departure';

export type TransportEventKind = 'flight' | 'ferry';

export interface TransportEvent {
  eventType: TransportEventType;
  transportType: TransportEventKind;
  /** 백엔드 장소와 이어진 터미널이면 placeId, 직접 입력이면 null */
  terminalPlaceId: string | null;
  /** 직접 입력한 터미널 이름. terminalPlaceId로 고르면 null */
  customTerminalName: string | null;
  /** Asia/Seoul offset을 붙인 date-time (예: 2026-09-01T09:00:00+09:00) */
  scheduledAt: string;
  /** 편명 (1..30자). 없으면 null */
  transportNumber: string | null;
  /** 메모 (1..500자). 없으면 null */
  note: string | null;
}

export interface TransportEventMutation extends TripMutationEffect {
  eventType: TransportEventType;
  /** 삭제 호출이었으면 true이고 `event`가 null이다 */
  deleted: boolean;
  event: TransportEvent | null;
}

/**
 * 교통편 등록 요청.
 *
 * 일곱 필드를 **전부** 보내야 한다. nullable한 값도 필드를 빼면 400이고 null을 명시해야 한다.
 * `terminalPlaceId`와 `customTerminalName` 중 하나는 값이 있어야 한다.
 */
export type TransportEventRequest = TransportEvent;

/**
 * 교통편 등록·수정. 같은 `eventType`이 이미 있으면 덮어쓴다. `If-Match`(여행 ETag) 필수.
 *
 * `scheduledAt`은 여행 기간 안이어야 하고, 입도가 출도보다 늦으면 422다.
 *
 * 오류 code: INVALID_REQUEST (400), TRIP_NOT_FOUND (404),
 * TRIP_VERSION_CONFLICT (409), TRANSPORT_EVENT_CONSTRAINT_VIOLATION (422).
 */
export const putTransportEvent = (
  tripId: string,
  body: TransportEventRequest,
  etag: string,
): Promise<ApiResponse<TransportEventMutation>> =>
  request<TransportEventMutation>({
    method: 'PUT',
    path: `/trips/${tripId}/transport-event`,
    auth: 'required',
    body,
    headers: { 'If-Match': etag },
  });

/**
 * 교통편 삭제. 지울 대상을 `eventType` query로 지정한다. `If-Match`(여행 ETag) 필수.
 *
 * 204가 아니라 200 + 변경 결과를 돌려주므로 응답의 새 ETag를 이어서 쓴다.
 *
 * 오류 code: INVALID_REQUEST (400), TRANSPORT_EVENT_NOT_FOUND (404),
 * TRIP_VERSION_CONFLICT (409), TRANSPORT_EVENT_CONSTRAINT_VIOLATION (422).
 */
export const deleteTransportEvent = (
  tripId: string,
  eventType: TransportEventType,
  etag: string,
): Promise<ApiResponse<TransportEventMutation>> =>
  request<TransportEventMutation>({
    method: 'DELETE',
    path: `/trips/${tripId}/transport-event`,
    auth: 'required',
    params: { eventType },
    headers: { 'If-Match': etag },
  });
