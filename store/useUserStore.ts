import { create } from 'zustand';

interface UserState {
  authReady: boolean;
  isLoggedIn: boolean;
  /** 인증 서버가 확인한 사용자 식별자 */
  userId: string | null;
  /** BE 프로필 응답에서만 설정한다. */
  userName: string | null;
}

// Token과 비밀번호는 Zustand에 복제하거나 persist하지 않는다.
export const useUserStore = create<UserState>(() => ({
  authReady: false,
  isLoggedIn: false,
  userId: null,
  userName: null,
}));
