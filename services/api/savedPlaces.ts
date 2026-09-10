import { request, requestData, type ApiResponse } from './http';
import { createIdempotencyKey } from './idempotency';
import { collectPages } from './pagination';
import type { CursorPageResponse } from './types';

/**
 * 관심 장소(찜). 네 개 모두 인증 필수다.
 *
 * 이 도메인만 낙관적 잠금을 쓴다. 목록/POST/PATCH 응답의 ETag를 들고 있다가
 * 다음 PATCH/DELETE의 If-Match에 큰따옴표까지 그대로 넣어야 한다.
 */

export interface SavedPlace {
  placeId: string;
  /** 목록/POST/PATCH body가 주는 owner row의 strong ETag */
  etag: string;
  name: string;
  /** `content-type:12` 형식 */
  category: string;
  regionLabel: string | null;
  thumbnailUrl: string | null;
  recommendedStayMinutes: number | null;
  memo: string | null;
  tags: string[];
  /** 0..5 */
  priority: number;
  /** 1..365, 여행 며칠째에 갈지 */
  targetDay: number | null;
  savedAt: string;
  updatedAt: string;
}

export type SavedPlacesListResponse = CursorPageResponse<SavedPlace>;

export type SavedPlacesSort =
  | 'saved_at_desc'
  | 'priority_desc'
  | 'target_day_asc';

export interface SavedPlacesListQuery {
  tag?: string;
  category?: string;
  regionCode?: string;
  /** 기본 saved_at_desc */
  sort?: SavedPlacesSort;
  cursor?: string;
  /** 1..100, 기본 20 */
  size?: number;
}

/**
 * 찜 목록 조회.
 *
 * 오류 code: INVALID_QUERY_PARAMETER / INVALID_CURSOR /
 * CURSOR_CONTEXT_MISMATCH (400).
 */
export const fetchSavedPlaces = (
  query: SavedPlacesListQuery = {},
  authContextIsCurrent?: () => boolean,
) =>
  requestData<SavedPlacesListResponse>({
    method: 'GET',
    path: '/me/saved-places',
    auth: 'required',
    params: { ...query },
    ...(authContextIsCurrent ? { authContextIsCurrent } : {}),
  });

/**
 * 찜 등록 요청.
 *
 * 생략하거나 null을 보냈을 때의 기본값이 정해져 있다.
 * memo → null, tags → [], priority → 0, targetDay → null.
 */
export interface SavedPlaceCreateRequest {
  placeId: string;
  /** 최대 2000자 */
  memo?: string | null;
  /** 최대 20개, 각 항목 1..50자. 서버가 중복 제거 후 정렬한다 */
  tags?: string[] | null;
  /** 0..5 */
  priority?: number | null;
  /** 1..365 */
  targetDay?: number | null;
}

/**
 * 찜 등록. `Idempotency-Key`가 필수다.
 *
 * 첫 생성은 201, 이미 같은 내용으로 만들어져 있으면 200이다.
 * key를 넘기지 않으면 호출마다 새로 만든다. 다만 timeout 뒤 재시도는
 * **같은 key와 같은 body**로 보내야 중복 생성이 되지 않으므로,
 * 재시도할 계획이라면 호출부에서 key를 만들어 들고 있는다.
 *
 * 오류 code: INVALID_REQUEST (400), PLACE_NOT_FOUND (404),
 * IDEMPOTENCY_PAYLOAD_CONFLICT / SAVED_PLACE_ALREADY_EXISTS (409),
 * SAVED_PLACE_CONSTRAINT_VIOLATION (422).
 */
export const createSavedPlace = (
  body: SavedPlaceCreateRequest,
  idempotencyKey: string = createIdempotencyKey(),
  authContextIsCurrent?: () => boolean,
): Promise<ApiResponse<SavedPlace>> =>
  request<SavedPlace>({
    method: 'POST',
    path: '/me/saved-places',
    auth: 'required',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
    ...(authContextIsCurrent ? { authContextIsCurrent } : {}),
  });

/**
 * 찜 수정 요청.
 *
 * 최소 한 필드가 필요하다. 생략은 보존이고 null의 뜻이 필드마다 다르다.
 * memo/targetDay null → 비우기, tags null → [], priority null → 0.
 * 배열은 부분 수정이 아니라 전체 교체다.
 */
export interface SavedPlaceUpdateRequest {
  memo?: string | null;
  tags?: string[] | null;
  priority?: number | null;
  targetDay?: number | null;
}

/**
 * 찜 수정. 직전 응답의 ETag를 `If-Match`로 그대로 보내야 한다.
 *
 * 오류 code: INVALID_REQUEST (400 — If-Match 누락/형식 오류 포함),
 * SAVED_PLACE_NOT_FOUND (404),
 * SAVED_PLACE_VERSION_CONFLICT (409 — ETag가 낡았으니 다시 조회 후 재시도),
 * SAVED_PLACE_CONSTRAINT_VIOLATION (422).
 */
export const updateSavedPlace = (
  placeId: string,
  body: SavedPlaceUpdateRequest,
  etag: string,
  authContextIsCurrent?: () => boolean,
): Promise<ApiResponse<SavedPlace>> =>
  request<SavedPlace>({
    method: 'PATCH',
    path: `/me/saved-places/${encodeURIComponent(placeId)}`,
    auth: 'required',
    body,
    headers: { 'If-Match': etag },
    ...(authContextIsCurrent ? { authContextIsCurrent } : {}),
  });

/**
 * 찜 삭제. 목록 또는 직전 mutation의 strong ETag를 `If-Match`로 보낸다.
 * body 없는 204만 성공이다. stale ETag는 409, 이미 지웠거나 남의 것이면
 * 404 SAVED_PLACE_NOT_FOUND로 숨긴다.
 */
export const deleteSavedPlace = async (
  placeId: string,
  etag: string,
  authContextIsCurrent?: () => boolean,
): Promise<void> => {
  await request<void>({
    method: 'DELETE',
    path: `/me/saved-places/${encodeURIComponent(placeId)}`,
    auth: 'required',
    headers: { 'If-Match': etag },
    ...(authContextIsCurrent ? { authContextIsCurrent } : {}),
  });
};

/**
 * 찜 목록을 끝까지 모아 온다. 조건은 페이지마다 그대로 유지한다.
 * 목록 화면처럼 전체가 필요할 때 쓴다.
 */
export const fetchAllSavedPlaces = (
  query: SavedPlacesListQuery = {},
  authContextIsCurrent?: () => boolean,
) =>
  collectPages<SavedPlace>((cursor) =>
    fetchSavedPlaces(
      { ...query, size: query.size ?? 100, cursor },
      authContextIsCurrent,
    ),
  );

/**
 * 목록 item이 ETag를 직접 주기 전의 호출부 호환 helper.
 * 신규 화면은 목록 body의 `etag`를 보존하므로 POST readback을 사용하지 않는다.
 */
export const readSavedPlaceEtag = async (
  place: Pick<
    SavedPlace,
    'placeId' | 'etag' | 'memo' | 'tags' | 'priority' | 'targetDay'
  >,
): Promise<string | null> => {
  return place.etag;
};
