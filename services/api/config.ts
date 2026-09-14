import { serverOrigin } from '../environment';

/**
 * Timing Jeju 백엔드 (Spring API) 접속 설정.
 *
 * .env 예시:
 *   EXPO_PUBLIC_API_BASE_URL=http://localhost:18080   (기본 live Compose)
 *
 * 명세상 host/port를 코드에 고정하지 않고 배포 환경별로 주입한다.
 * - Spring 직접 실행(bootRun) : http://localhost:8080
 * - 기본 live Compose        : http://localhost:18080
 * - showcase Compose         : http://localhost:18082
 *
 * 값이 없으면 앱은 뜨되 서버 호출만 실패한다.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/** 모든 경로가 공유하는 API 버전 접두사 */
export const API_PREFIX = '/api/v1';

/** 서버 주소가 주입됐는지 — 주입 전에는 API 호출을 시도하지 않는다 */
export const isApiConfigured = () => {
  try {
    serverOrigin(API_BASE_URL);
    return true;
  } catch {
    return false;
  }
};

/** 응답을 기다리는 최대 시간 (ms) */
export const API_TIMEOUT_MS = 10000;
