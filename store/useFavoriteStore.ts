import { create } from 'zustand';

export type VisitType = '필수방문' | '선택방문';

export interface FavoritePlace {
  name: string;
  /** 카페 / 바다 / 산 / 식당 등 장소 분류 */
  category: string;
  visitType: VisitType;
  memo: string;
  /** 추천 체류 시간 (분) */
  stayMinutes: number;
  /** 제주 기준 방향 (동쪽 / 서쪽 …) */
  direction: string;
}

// TODO: 찜 목록 API 연동 전 임시 데이터
const MOCK_FAVORITES: FavoritePlace[] = [
  {
    name: '소심한 브런치',
    category: '카페',
    visitType: '선택방문',
    memo: '연어 샐러드 꼭 먹기!!!',
    stayMinutes: 90,
    direction: '동쪽',
  },
  {
    name: '함덕해수욕장',
    category: '바다',
    visitType: '필수방문',
    memo: '바다 수영하기',
    stayMinutes: 180,
    direction: '동쪽',
  },
  {
    name: '성산일출봉',
    category: '산',
    visitType: '필수방문',
    memo: '',
    stayMinutes: 60,
    direction: '동쪽',
  },
];

interface FavoriteState {
  favorites: FavoritePlace[];
  isFavorite: (name: string) => boolean;
  addFavorite: (place: FavoritePlace) => void;
  updateFavorite: (name: string, visitType: VisitType, memo: string) => void;
  removeFavorite: (name: string) => void;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: MOCK_FAVORITES,
  isFavorite: (name) => get().favorites.some((place) => place.name === name),
  addFavorite: (place) =>
    set((state) => ({
      favorites: [
        ...state.favorites.filter((item) => item.name !== place.name),
        place,
      ],
    })),
  updateFavorite: (name, visitType, memo) =>
    set((state) => ({
      favorites: state.favorites.map((place) =>
        place.name === name ? { ...place, visitType, memo } : place,
      ),
    })),
  removeFavorite: (name) =>
    set((state) => ({
      favorites: state.favorites.filter((place) => place.name !== name),
    })),
}));
