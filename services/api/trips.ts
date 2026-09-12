import type { components } from '../generated/backend';
import { request, requestData, type ApiResponse } from './http';
import { createIdempotencyKey } from './idempotency';
import type { CursorPageResponse, TripMutationEffect } from './types';

/**
 * 여행. 모두 인증 필수다.
 *
 * 목록 조회는 ETag를 반환하지 않는다. 상세 조회·생성·변경 응답의 ETag는
 * 후속 수정·여행 조건·장소 선호 요청의 If-Match에 필요하다.
 * ETag는 `fetchTrip()`의 응답 헤더 또는 직전 변경 응답에서 큰따옴표까지 그대로 들고 온다.
 * 형식은 `"trip-<tripId>-r<revision>"`이며 뜯어보지 않는다.
 */

export type TripStatus =
  | 'draft'
  | 'generating'
  | 'planned'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'failed';

/** 여행 일정의 여유 정도 */
export type UserPace = 'slow' | 'normal' | 'fast';

export type TransportMode = 'public_transit' | 'rental_car' | 'taxi';

/**
 * 이동 수단 우선순위.
 * 1..3개이며 priority는 1부터 연속/중복 없이, primary는 정확히 하나이고 priority 1이어야 한다.
 */
export interface TripTransportMode {
  mode: TransportMode;
  priority: number;
  primary: boolean;
}

/** 점수의 계산 run과 freshness를 설명하는 pinned OpenAPI 객체. */
export type ScoreProvenance = components['schemas']['ScoreProvenance'];

/** 여행 목록의 한 줄 */
export type TripListItem = components['schemas']['TripSummary'];

export type TripDay = components['schemas']['TripDay'];
/** 최신 GET/PATCH 응답. 과거 생성 receipt는 TripCreateResponse로 구분한다. */
export type Trip = components['schemas']['TripDetail'];
export type TripCreateResponse = components['schemas']['TripCreateResponse'];

export type TripsListResponse = CursorPageResponse<TripListItem>;

export interface TripsListQuery {
  status?: TripStatus;
  sort?: 'updated_at_desc';
  cursor?: string;
  /** 1..50, 기본 20 */
  size?: number;
}

/**
 * 여행 목록 조회. `updatedAt DESC, tripId DESC` 정렬이다.
 *
 * 오류 code: INVALID_QUERY_PARAMETER / INVALID_CURSOR /
 * CURSOR_CONTEXT_MISMATCH (400), TRIP_DATA_UNAVAILABLE (503).
 */
export const fetchTrips = (query: TripsListQuery = {}) =>
  requestData<TripsListResponse>({
    method: 'GET',
    path: '/trips',
    auth: 'required',
    params: { ...query },
  });

/**
 * 여행 생성 요청.
 *
 * 생략 기본값: timezone `Asia/Seoul`, userPace `normal`,
 * transportModes `[{ mode: 'public_transit', priority: 1, primary: true }]`.
 * optional 필드에 explicit null을 보내면 거부된다.
 */
export interface TripCreateRequest {
  /** trim 후 1..100자 */
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, startDate 포함 최대 30일 */
  endDate: string;
  timezone?: string;
  userPace?: UserPace;
  transportModes?: TripTransportMode[];
}

/**
 * 여행 생성. `Idempotency-Key`는 1~128자 printable ASCII로 필수다.
 *
 * 성공은 201이고 같은 key + 같은 payload는 원본 201을 replay한다.
 * 다른 payload이거나 처리 중인 key는 409 IDEMPOTENCY_KEY_REUSED다.
 * (찜의 409 IDEMPOTENCY_PAYLOAD_CONFLICT와 code가 다르니 합치지 않는다.)
 *
 * 오류 code: INVALID_REQUEST / IDEMPOTENCY_KEY_REQUIRED /
 * IDEMPOTENCY_KEY_INVALID (400), IDEMPOTENCY_KEY_REUSED / PROFILE_CONFLICT (409),
 * TRIP_CONSTRAINT_VIOLATION (422), TRIP_DATA_UNAVAILABLE (503).
 */
export const createTrip = (
  body: TripCreateRequest,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<ApiResponse<TripCreateResponse>> =>
  request<TripCreateResponse>({
    method: 'POST',
    path: '/trips',
    auth: 'required',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  });

/**
 * 여행 상세 조회. 남의 여행도 404 TRIP_NOT_FOUND로 숨긴다.
 *
 * 오류 code: INVALID_REQUEST (400), TRIP_NOT_FOUND (404),
 * TRIP_DATA_UNAVAILABLE (503).
 */
export const fetchTrip = (tripId: string): Promise<ApiResponse<Trip>> =>
  request<Trip>({
    method: 'GET',
    path: `/trips/${encodeURIComponent(tripId)}`,
    auth: 'required',
  });

/**
 * 여행 수정 요청. 보낸 필드만 바뀌고, 최소 한 개는 보내야 한다.
 *
 * 찜 PATCH와 달리 explicit null은 전부 거부된다(400). 모르는 필드도 거부된다.
 * 날짜를 바꾸면 Day가 다시 계산되므로 확정 일정이 무효가 될 수 있다.
 */
export interface TripPatchRequest {
  /** trim 후 1..100자 */
  title?: string;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD, startDate 포함 최대 30일 */
  endDate?: string;
  timezone?: string;
  userPace?: UserPace;
  transportModes?: TripTransportMode[];
}

/**
 * 여행 수정. `If-Match`에 여행 ETag가 **필수**다.
 *
 * 응답 ETag가 다음 변경의 If-Match가 되므로 반환값의 `etag`를 갱신해 둔다.
 *
 * 오류 code: IF_MATCH_REQUIRED / INVALID_REQUEST (400), TRIP_NOT_FOUND (404),
 * TRIP_VERSION_CONFLICT (409), TRIP_CONSTRAINT_VIOLATION (422),
 * TRIP_DATA_UNAVAILABLE (503).
 */
export const updateTrip = (
  tripId: string,
  body: TripPatchRequest,
  etag: string,
): Promise<ApiResponse<Trip>> =>
  request<Trip>({
    method: 'PATCH',
    path: `/trips/${encodeURIComponent(tripId)}`,
    auth: 'required',
    body,
    headers: { 'If-Match': etag },
  });

/**
 * 여행 삭제. 204라 응답 body가 없다.
 *
 * 서버가 body 없는 DELETE만 받으므로 body를 실어 보내지 않는다.
 *
 * 오류 code: INVALID_REQUEST (400), TRIP_NOT_FOUND (404),
 * TRIP_DELETE_CONFLICT (409), TRIP_DATA_UNAVAILABLE (503).
 */
export const deleteTrip = async (tripId: string): Promise<void> => {
  await request<void>({
    method: 'DELETE',
    path: `/trips/${encodeURIComponent(tripId)}`,
    auth: 'required',
  });
};

/** 이동 수단 우선순위 (여행 조건 전용 표현) */
export interface PreferenceTransportMode {
  mode: TransportMode;
  priority: number;
  primary: boolean;
}

/**
 * 여행 조건 전체 교체 요청. 부분 수정이 아니라 **전체 교체**다.
 * 모든 필드가 필수이며 빼면 400이다.
 */
/**
 * 여행 조건의 선호 카테고리. 화면 라벨이 아니라 **고정 코드**만 받는다.
 * (`places`의 `content-type:NN` 분류와도 다른 별개 코드표다)
 */
export type PreferredCategory =
  | 'tourist_attraction'
  | 'cultural_facility'
  | 'festival'
  | 'travel_course'
  | 'leisure'
  | 'restaurant'
  | 'cafe'
  | 'shopping';

export interface TripPreferencesRequest {
  /** 0..8개, 중복 불가 */
  preferredCategories: PreferredCategory[];
  arrivalRegionCode: string;
  departureRegionCode: string;
  preferredRegionCodes: string[];
  /** 없으면 null을 명시적으로 보낸다 */
  startPlaceId: string | null;
  endPlaceId: string | null;
  transportModes: PreferenceTransportMode[];
}

export interface TripPreferences {
  preferredCategories: PreferredCategory[];
  arrivalRegionCode: string;
  departureRegionCode: string;
  preferredRegionCodes: string[];
  transportModes: PreferenceTransportMode[];
}

export interface TripPreferencesResponse extends TripMutationEffect {
  preferences: TripPreferences;
}

/**
 * 여행 조건 전체 교체. `If-Match` 필수.
 *
 * 오류 code: INVALID_REQUEST (400), TRIP_NOT_FOUND / PLACE_NOT_FOUND (404),
 * TRIP_VERSION_CONFLICT / TRIP_TERMINAL_STATE_CONFLICT (409),
 * PREFERENCE_CONSTRAINT_VIOLATION (422), TRIP_DATA_UNAVAILABLE (503).
 */
export const replaceTripPreferences = (
  tripId: string,
  body: TripPreferencesRequest,
  etag: string,
): Promise<ApiResponse<TripPreferencesResponse>> =>
  request<TripPreferencesResponse>({
    method: 'PUT',
    path: `/trips/${encodeURIComponent(tripId)}/preferences`,
    auth: 'required',
    body,
    headers: { 'If-Match': etag },
  });

/** 꼭 가는 곳 / 피하는 곳 */
export type PlacePreferenceType = 'must_visit' | 'avoid';

export interface TripPlacePreference {
  placeId: string;
  type: PlacePreferenceType;
  /** 1..30, 며칠째에 갈지. 없으면 null */
  targetDayNo: number | null;
  /** 0..100 */
  priority: number;
}

export interface TripPlacePreferencesResponse extends TripMutationEffect {
  items: TripPlacePreference[];
}

/**
 * 장소 선호 전체 교체. `If-Match` 필수이고 0..100개다.
 *
 * **넣으려는 장소를 먼저 찜해야 한다.** 서버가 내 `saved_places`를 조인해서 확인하므로,
 * 찜하지 않은 placeId를 보내면 그 장소가 실제로 존재해도 404 PLACE_NOT_FOUND다.
 * `createSavedPlace(placeId)` → 이 호출 순서로 쓴다.
 *
 * 부분 수정이 아니라 전체 교체이므로, 하나만 지우려면 나머지를 다 실어 보낸다.
 * 빈 배열을 보내면 전부 지운다.
 *
 * 오류 code: INVALID_REQUEST (400), TRIP_NOT_FOUND / PLACE_NOT_FOUND (404),
 * TRIP_VERSION_CONFLICT / TRIP_TERMINAL_STATE_CONFLICT (409),
 * PLACE_PREFERENCE_CONSTRAINT_VIOLATION (422), TRIP_DATA_UNAVAILABLE (503).
 */
export const replaceTripPlacePreferences = (
  tripId: string,
  items: TripPlacePreference[],
  etag: string,
): Promise<ApiResponse<TripPlacePreferencesResponse>> =>
  request<TripPlacePreferencesResponse>({
    method: 'PUT',
    path: `/trips/${encodeURIComponent(tripId)}/place-preferences`,
    auth: 'required',
    body: { items },
    headers: { 'If-Match': etag },
  });

export type DayActivityWindowsRequest =
  components['schemas']['ReplaceTripDayActivityWindowsRequest'];
export type DayActivityWindowsResponse =
  components['schemas']['TripDayActivityWindowsResponse'];

/** 전체 Day 시간을 교체한다. 불확실한 응답 재시도는 원본 body·ETag·키를 유지한다. */
export const replaceDayActivityWindows = (
  tripId: string,
  body: DayActivityWindowsRequest,
  etag: string,
  idempotencyKey: string,
): Promise<ApiResponse<DayActivityWindowsResponse>> =>
  request<DayActivityWindowsResponse>({
    method: 'PUT',
    path: `/trips/${encodeURIComponent(tripId)}/day-activity-windows`,
    auth: 'required',
    body,
    headers: { 'If-Match': etag, 'Idempotency-Key': idempotencyKey },
  });
