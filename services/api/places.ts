import { requestData } from './http';
import { collectPages } from './pagination';
import type { CursorPageResponse, DataFreshness, GeoLocation } from './types';

/**
 * 장소 목록 / 상세. 둘 다 인증 선택이다.
 * 익명으로 호출하면 개인화 필드가 비어서 내려온다.
 * (목록: saved=false, memo=null, tags=[] / 상세: saved.value=false …)
 */

/** 추천 체류 시간이 어디서 나왔는지 */
export type RecommendedStaySource = string;

/** 목록과 상세가 공유하는 장소 기본 정보 */
interface PlaceBase {
  placeId: string;
  contentId: string;
  name: string;
  /** `^(?:[A-Z]{2}|content-type:[0-9]{1,10})$` — 예: `content-type:12` */
  category: string;
  regionCode: string;
  regionLabel: string | null;
  address: string | null;
  location: GeoLocation;
  thumbnailUrl: string | null;
  recommendedStayMinutes: number | null;
  recommendedStaySource: RecommendedStaySource | null;
  recommendedStayPolicyVersion: string | null;
  recommendedStayEffectiveAt: string | null;
  recommendedStayUpdatedAt: string | null;
  operationsSummary: string | null;
}

export interface PlaceListItem extends PlaceBase {
  /** 좌표로 검색했을 때만 값이 있다 */
  distanceMeters: number | null;
  dataFreshness: DataFreshness;
  /** 내가 찜했는지 (익명이면 false) */
  saved: boolean;
  memo: string | null;
  tags: string[];
}

export type PlacesListResponse = CursorPageResponse<PlaceListItem>;

/**
 * 장소 목록 조회 query. 모두 optional이고 null은 보내지 않는다.
 * lat / lng는 반드시 쌍으로 쓴다 (한쪽만 보내면 400 INVALID_GEO_FILTER).
 */
export interface PlacesListQuery {
  /** trim 후 1..100자 */
  query?: string;
  /** `content-type:12` 형식 */
  category?: string;
  regionCode?: string;
  /** 33..34 */
  lat?: number;
  /** 126..127 */
  lng?: number;
  /** 100..50000, 좌표가 있을 때만 의미가 있고 기본 10000 */
  radiusMeters?: number;
  /** 이전 응답의 page.nextCursor를 그대로 넣는다 */
  cursor?: string;
  /** 1..100, 기본 20 */
  size?: number;
  /** 찜한 장소만 (익명 호출에서 true면 401) */
  savedOnly?: boolean;
}

/**
 * 장소 목록 조회. 인증 선택.
 *
 * 정렬은 좌표 검색이면 `distanceMeters ASC NULLS LAST, name ASC, placeId ASC`,
 * 그 외에는 `name ASC, placeId ASC`다.
 *
 * 오류 code: INVALID_QUERY_PARAMETER / INVALID_GEO_FILTER /
 * CURSOR_CONTEXT_MISMATCH / INVALID_CURSOR (400),
 * AUTHENTICATION_REQUIRED / INVALID_ACCESS_TOKEN (401),
 * PLACE_QUERY_CONSTRAINT_VIOLATION (422), PLACE_DATA_UNAVAILABLE (503).
 */
export const fetchPlaces = (query: PlacesListQuery = {}) =>
  requestData<PlacesListResponse>({
    method: 'GET',
    path: '/places',
    auth: 'optional',
    params: { ...query },
  });

/**
 * 목록을 끝까지 모아 온다.
 *
 * `savedOnly: true`로 부르면 찜한 장소를 한 번에 받을 수 있고,
 * 찜 목록 API에 없는 `address`와 `location`(좌표)까지 함께 들어온다.
 */
export const fetchAllPlaces = (query: PlacesListQuery = {}) =>
  collectPages<PlaceListItem>((cursor) =>
    fetchPlaces({ ...query, size: query.size ?? 100, cursor }),
  );

/** 상세에서의 개인화 정보 */
export interface SavedPlaceState {
  value: boolean;
  memo: string | null;
  tags: string[];
}

export interface PlaceContact {
  phone: string | null;
  homepageUrl: string | null;
}

export interface PlaceOperations {
  operatingHoursText: string | null;
  closedDaysText: string | null;
  parkingText: string | null;
  admissionFeeText: string | null;
}

export interface PlaceImage {
  url: string;
  thumbnailUrl: string | null;
  provider: 'TOUR_API' | 'TIMING_JEJU';
  observedAt: string;
  expiresAt: string | null;
  stale: boolean;
}

export interface NearbyStop {
  stopId: string;
  stopName: string;
  distanceMeters: number;
  walkMinutes: number | null;
  linkMethod: 'spatial_radius' | 'fixture' | 'manual' | 'api_nearby';
  provider: string;
  observedAt: string;
  expiresAt: string;
  stale: boolean;
}

export interface PlaceDetail extends PlaceBase {
  saved: SavedPlaceState;
  overview: string | null;
  contact: PlaceContact;
  operations: PlaceOperations;
  /** 최대 20개 */
  images: PlaceImage[];
  /** 최대 5개, 없으면 빈 배열 */
  nearbyStops: NearbyStop[];
}

/**
 * 장소 상세 조회. 인증 선택.
 *
 * 오류 code: INVALID_QUERY_PARAMETER (400), INVALID_ACCESS_TOKEN (401),
 * PLACE_NOT_FOUND (404), PLACE_DATA_UNAVAILABLE (503).
 */
export const fetchPlace = (placeId: string) =>
  requestData<PlaceDetail>({
    method: 'GET',
    path: `/places/${placeId}`,
    auth: 'optional',
  });
