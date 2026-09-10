import { requestData } from './http';
import type { SocialProviderId } from './authSocial';

/** 내 프로필 — 모든 key가 항상 존재하고 일부만 nullable이다 */
export interface Profile {
  userId: string;
  email: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
  /** 현재 허용값은 ko-KR 하나뿐이다 */
  locale: string;
  /** 연결된 소셜 공급자 (중복 없는 안정 정렬) */
  providers: SocialProviderId[];
  onboardingCompleted: boolean;
  updatedAt: string;
}

/**
 * 내 프로필 조회. 인증 필수.
 *
 * JWT sub 소유 profile이 없으면 서버가 만들어 준 뒤 돌려주므로
 * 로그인 직후 첫 호출로 프로필을 확보할 수 있다.
 *
 * 오류 code: AUTHENTICATION_REQUIRED / INVALID_ACCESS_TOKEN (401),
 * PROFILE_DATA_UNAVAILABLE (503).
 */
export const fetchProfile = () =>
  requestData<Profile>({ method: 'GET', path: '/me', auth: 'required' });

/**
 * 프로필 수정 요청.
 *
 * 최소 한 필드가 필요하다. 생략하면 기존 값을 보존하고,
 * explicit null은 거부하므로 "비우기"는 지원하지 않는다.
 * email / profileImageUrl / providers는 수정할 수 없다.
 */
export interface ProfileUpdateRequest {
  /** trim 후 1..50자 */
  nickname?: string;
  /** 현재 ko-KR만 허용 */
  locale?: string;
}

/**
 * 프로필 수정. 인증 필수.
 *
 * 오류 code: INVALID_PROFILE_LEGAL_REQUEST (400, fieldErrors 참고),
 * PROFILE_CONFLICT (409), PROFILE_DATA_UNAVAILABLE (503).
 */
export const updateProfile = (body: ProfileUpdateRequest) =>
  requestData<Profile>({
    method: 'PATCH',
    path: '/me',
    auth: 'required',
    body,
  });
