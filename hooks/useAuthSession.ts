import { useEffect } from 'react';

import { subscribeAuthSession } from '@/services/auth';
import { useUserStore } from '@/store/useUserStore';

/**
 * 앱 전역에서 한 번만 쓰는 로그인 세션 훅 (app/_layout.tsx).
 *
 * Supabase 세션을 store에 그대로 반영한다. 로그인 / 로그아웃뿐 아니라
 * access token이 자동 갱신될 때도 새 토큰이 들어오므로,
 * 백엔드 호출은 항상 유효한 토큰을 쓰게 된다.
 *
 * 로그인되면 이어서 프로필(GET /api/v1/me)을 받아온다.
 * 이 호출이 서버 쪽 profile을 만들어 주기도 한다.
 */
export function useAuthSession() {
  const applySession = useUserStore((state) => state.applySession);
  const loadProfile = useUserStore((state) => state.loadProfile);

  useEffect(
    () =>
      subscribeAuthSession((session) => {
        applySession(session);
        if (session) loadProfile();
      }),
    [applySession, loadProfile],
  );
}
