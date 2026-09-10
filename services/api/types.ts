/** 여러 도메인이 함께 쓰는 응답 조각 */

/**
 * cursor pagination.
 *
 * `nextCursor`는 opaque하다. 해석하거나 조합하지 말고 다음 요청의 `cursor`에 그대로 넣는다.
 * cursor를 받은 뒤 filter/sort/size를 바꾸면 400 CURSOR_CONTEXT_MISMATCH,
 * 훼손된 cursor는 400 INVALID_CURSOR다.
 */
export interface CursorPage {
  size: number;
  hasNext: boolean;
  /** 필드는 항상 있고, hasNext가 false면 null이다 */
  nextCursor: string | null;
}

export interface CursorPageResponse<T> {
  items: T[];
  page: CursorPage;
}

/** 위경도 (제주 범위: lat 33..34, lng 126..127) */
export interface GeoLocation {
  lat: number;
  lng: number;
}

/** 외부 제공 데이터의 신선도 */
export interface DataFreshness {
  provider: 'TOUR_API' | 'TIMING_JEJU';
  observedAt: string;
  expiresAt: string | null;
  stale: boolean;
}

/**
 * 여행을 바꾸는 호출이 "이 변경이 확정 일정에 무슨 영향을 줬는지" 알려주는 값.
 *
 * - `none` — 확정 일정이 없어서 영향도 없다
 * - `maintained` — 일정은 그대로 유효하다
 * - `invalidated` — 일정이 무효가 됐다. `regenerationRequired`가 같이 true로 온다
 */
export type ScheduleEffect = 'none' | 'maintained' | 'invalidated';

/**
 * 여행 하위 리소스(숙소 / 교통편 / 여행 조건)를 바꾼 응답이 공통으로 싣는 부분.
 *
 * 화면은 `regenerationRequired`가 true면 "일정을 다시 만들어야 한다"고 안내한다.
 */
export interface TripMutationEffect {
  tripId: string;
  scheduleEffect: ScheduleEffect;
  regenerationRequired: boolean;
  /** 필드는 항상 있고 값이 null일 수 있다 */
  activeScheduleVersionId: string | null;
  tripStatus: string;
  updatedAt: string;
}
