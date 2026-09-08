import { requestData } from './http';

/**
 * 소셜 로그인 관련 공개 endpoint 2개.
 *
 * Spring에는 로그인 시작 / callback / token 발급 API가 없다.
 * 실제 로그인은 Supabase Auth SDK의 `signInWithOAuth`가 담당하고,
 * 여기서는 "어떤 공급자를 띄울지"와 "Naver 프로필 조회"만 가져온다.
 */

/** Supabase `signInWithOAuth`에 그대로 넘기는 provider 값 */
export type SocialProviderId = 'google' | 'kakao' | 'custom:naver';

export interface SocialProvider {
  id: SocialProviderId;
  displayName: string;
}

export interface SocialProvidersResponse {
  providers: SocialProvider[];
}

/**
 * 로그인 화면에 노출할 소셜 공급자 목록. 인증 없음.
 *
 * 반환 순서는 google, kakao, custom:naver 고정이며 환경에서 켠 항목만 들어온다.
 * 다만 이 목록은 "프론트가 구현할 수 있는 지원 목록"이지
 * Supabase Dashboard에서 실제로 활성화됐다는 뜻은 아니다.
 */
export const fetchSocialProviders = () =>
  requestData<SocialProvidersResponse>({
    method: 'GET',
    path: '/auth/social/providers',
    auth: 'none',
  });

/** 값이 있을 때만 key가 존재하는 필드가 섞여 있다 */
export interface NaverUserInfo {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
}

/**
 * Naver 프로필 조회.
 *
 * 이 endpoint만 Authorization이 Supabase JWT가 아니라
 * **Naver provider access token**이다. (최대 256자)
 *
 * 오류 code: SOCIAL_NAVER_TOKEN_INVALID / SOCIAL_NAVER_UPSTREAM_UNAUTHORIZED (401),
 * SOCIAL_NAVER_UPSTREAM_FORBIDDEN (403), SOCIAL_NAVER_EMAIL_REQUIRED (422),
 * SOCIAL_NAVER_RATE_LIMITED (429) 등.
 */
export const fetchNaverUserInfo = (naverAccessToken: string) =>
  requestData<NaverUserInfo>({
    method: 'GET',
    path: '/auth/social/naver/userinfo',
    auth: 'naver',
    naverAccessToken,
  });
