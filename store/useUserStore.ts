import { create } from 'zustand';

interface UserState {
  isLoggedIn: boolean;
  userName: string | null;
  login: (name: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  isLoggedIn: false,
  userName: null,
  login: (name: string) => set({ isLoggedIn: true, userName: name }),
  logout: () => set({ isLoggedIn: false, userName: null }),
}));
