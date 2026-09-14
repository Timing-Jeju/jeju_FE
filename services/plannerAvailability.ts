// 서버 기반 일정 생성·후보 조회·적용을 활성화한다. 입력·인증 검증은 유지한다.
export const PLANNER_AVAILABLE = true;
// 실시간 위치 기반 안내는 서버 일정 생성과 별도로 연동하기 전까지 비활성이다.
export const LIVE_GUIDANCE_AVAILABLE = false;
export const PLANNER_UNAVAILABLE_MESSAGE =
  '일정 생성·평가·적용은 아직 지원하지 않아요. 서비스 연결을 준비 중이에요.';

export function unsupportedPlannerAction(): never {
  throw new Error(PLANNER_UNAVAILABLE_MESSAGE);
}
