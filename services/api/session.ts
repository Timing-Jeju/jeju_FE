/**
 * 세션은 최신 main의 Supabase 인증 계층이 소유한다.
 * API wrapper는 토큰을 저장하지 않고 요청 시점마다 읽는다.
 */
export { getAccessToken } from '../auth';
