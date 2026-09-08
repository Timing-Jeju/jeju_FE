import { create } from 'zustand';

import type { Coord } from '@/services/naverApi';

export type VisitType = '필수방문' | '선택방문';

export interface FavoritePlace {
  name: string;
  /** 카페 / 바다 / 산 / 식당 등 장소 분류 */
  category: string;
  address: string;
  visitType: VisitType;
  memo: string;
  /** 추천 체류 시간 (분) */
  stayMinutes: number;
  /** 제주 기준 방향 (동쪽 / 서쪽 …) */
  direction: string;
  /** 일정에 담았을 때 지도에 마커를 찍으려면 필요하다 (모르면 null) */
  coord: Coord | null;
}

export const FAVORITE_FILTERS = [
  '전체',
  '관광지',
  '식당',
  '카페',
  '필수방문',
  '선택방문',
] as const;

export type FavoriteFilter = (typeof FAVORITE_FILTERS)[number];

export const matchesFavoriteFilter = (
  place: FavoritePlace,
  filter: FavoriteFilter,
) => {
  switch (filter) {
    case '전체':
      return true;
    case '관광지':
      return place.category !== '식당' && place.category !== '카페';
    case '식당':
    case '카페':
      return place.category === filter;
    case '필수방문':
    case '선택방문':
      return place.visitType === filter;
  }
};

interface FavoriteState {
  favorites: FavoritePlace[];
  isFavorite: (name: string) => boolean;
  addFavorite: (place: FavoritePlace) => void;
  updateFavorite: (name: string, visitType: VisitType, memo: string) => void;
  removeFavorite: (name: string) => void;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
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
