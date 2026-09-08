// 계약·저장 허용·호환 BE/AI staging 검증이 완료되기 전 활성화하지 않는다.
export const PLANNER_AVAILABLE = false;
export const PLANNER_UNAVAILABLE_MESSAGE =
  '일정 생성·평가·적용은 아직 지원하지 않아요. 서비스 연결을 준비 중이에요.';

export function unsupportedPlannerAction(): never {
  throw new Error(PLANNER_UNAVAILABLE_MESSAGE);
}
