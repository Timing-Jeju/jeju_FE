import { create } from 'zustand';
import { requireCanonicalPlaceId } from '@/services/canonicalId';

import type { Coord } from '@/services/naverApi';

export type VisitType = '필수방문' | '선택방문';

export interface FavoritePlace {
  placeId: string;
  name: string;
  /** 카페 / 바다 / 산 / 식당 등 장소 분류 */
  category: string;
  address: string;
  visitType: VisitType;
  memo: string;
  /** 사용자가 변경할 수 있는 일정 초안 체류 시간 (분) */
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
      return place.category === '관광지';
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
  isFavorite: (placeId: string) => boolean;
  addFavorite: (place: FavoritePlace) => void;
  updateFavorite: (placeId: string, visitType: VisitType, memo: string) => void;
  removeFavorite: (placeId: string) => void;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  isFavorite: (placeId) =>
    get().favorites.some((place) => place.placeId === placeId),
  addFavorite: (place) => {
    requireCanonicalPlaceId(place.placeId);
    set((state) => ({
      favorites: [
        ...state.favorites.filter((item) => item.placeId !== place.placeId),
        place,
      ],
    }));
  },
  updateFavorite: (placeId, visitType, memo) =>
    set((state) => ({
      favorites: state.favorites.map((place) =>
        place.placeId === placeId ? { ...place, visitType, memo } : place,
      ),
    })),
  removeFavorite: (placeId) =>
    set((state) => ({
      favorites: state.favorites.filter((place) => place.placeId !== placeId),
    })),
}));
