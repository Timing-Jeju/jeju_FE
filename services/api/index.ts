/**
 * Timing Jeju 백엔드 API.
 *
 * 현재 서버에서 쓸 수 있는 공개 operation을 도메인별로 감싼다.
 * 화면과 store는 이 barrel만 import하면 된다.
 *
 * - 오류는 전부 ApiError로 정규화된다. `hasCode(error, 'PLACE_NOT_FOUND')`처럼
 *   HTTP status가 아니라 안정적인 code로 분기한다.
 * - 인증은 services/api/session의 공급자에서 access token을 읽는다.
 */
export { API_BASE_URL, isApiConfigured } from './config';
export {
  ApiError,
  hasCode,
  isApiError,
  isAuthError,
  type ProblemDetails,
  type ProblemFieldError,
} from './problem';
export { setAccessTokenProvider, withAccessToken } from './session';
export { createIdempotencyKey, isCanonicalUuid } from './idempotency';
export { collectPages } from './pagination';
export type { ApiResponse, AuthMode } from './http';
export type {
  CursorPage,
  CursorPageResponse,
  DataFreshness,
  GeoLocation,
  ScheduleEffect,
  TripMutationEffect,
} from './types';

export * from './authSocial';
export * from './profile';
export * from './legal';
export * from './places';
export * from './savedPlaces';
export * from './trips';
export * from './weather';
export * from './push';
export * from './accommodations';
export * from './transportEvents';
export * from './scheduleItems';
export * from './profileImage';
export {
  categoryLabel,
  FILTER_CODES,
  isAttractionLabel,
  isCafeName,
  type PlaceFilter,
} from './category';
