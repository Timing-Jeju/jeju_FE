import { create } from 'zustand';

import {
  fetchProfile,
  setAccessTokenProvider,
  type Profile,
} from '@/services/api';
import type { AuthSession } from '@/services/auth';

interface UserState {
  isLoggedIn: boolean;
  /** Supabase 사용자 식별자 (JWT sub) */
  userId: string | null;
  /** 화면에 노출되는 닉네임 (프로필 조회 API에서 내려준다) */
  userName: string | null;
  /** 로그인에 쓴 이메일 */
  email: string | null;
  /**
   * Supabase Auth가 발급한 access token.
   * 백엔드 호출의 Authorization 헤더에 쓰이며 로그나 리포트에 남기지 않는다.
   */
  accessToken: string | null;
  /** GET /api/v1/me 결과 */
  profile: Profile | null;
  /**
   * Supabase 세션을 그대로 반영한다.
   * 로그인 / 로그아웃뿐 아니라 token 자동 갱신 때도 호출된다. (hooks/useAuthSession)
   */
  applySession: (session: AuthSession | null) => void;
  logout: () => void;
  /** 로그인 직후 프로필을 받아온다. 실패하면 null을 돌려준다. */
  loadProfile: () => Promise<Profile | null>;
}

export const useUserStore = create<UserState>((set, get) => ({
  isLoggedIn: false,
  userId: null,
  userName: null,
  email: null,
  accessToken: null,
  profile: null,
  applySession: (session) =>
    set(
      session
        ? {
            isLoggedIn: true,
            userId: session.userId,
            email: session.email,
            accessToken: session.accessToken,
          }
        : {
            isLoggedIn: false,
            userId: null,
            userName: null,
            email: null,
            accessToken: null,
            profile: null,
          },
    ),
  logout: () =>
    set({
      isLoggedIn: false,
      userId: null,
      userName: null,
      email: null,
      accessToken: null,
      profile: null,
    }),
  loadProfile: async () => {
    try {
      const profile = await fetchProfile();
      // 닉네임은 서버 값을 따르고, 로그인 아이디는 로그인 때 받은 값을 유지한다
      set({ profile, userName: profile.nickname ?? get().userName });
      return profile;
    } catch {
      // 프로필 조회 실패로 로그인 상태까지 풀지는 않는다
      return null;
    }
  },
}));

/*
 * 백엔드 호출부(services/api)가 토큰을 읽어갈 곳을 알려준다.
 * store가 토큰의 단일 출처이므로 여기서 한 번만 등록한다.
 */
setAccessTokenProvider(() => useUserStore.getState().accessToken);
