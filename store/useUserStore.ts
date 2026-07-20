import { create } from 'zustand';

interface UserState {
  isLoggedIn: boolean;
  /** 로그인 아이디 */
  userId: string | null;
  /** 화면에 노출되는 닉네임 (프로필 조회 API에서 내려준다) */
  userName: string | null;
  login: (user: { id: string; name?: string }) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  isLoggedIn: false,
  userId: null,
  userName: null,
  login: ({ id, name }) =>
    set({ isLoggedIn: true, userId: id, userName: name ?? null }),
  logout: () => set({ isLoggedIn: false, userId: null, userName: null }),
}));
