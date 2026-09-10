import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { requireCanonicalPlaceId } from '@/services/canonicalId';
import {
  createSavedPlace,
  deleteSavedPlace,
  fetchAllSavedPlaces,
  updateSavedPlace,
  type SavedPlace,
  type SavedPlaceCreateRequest,
} from '@/services/api/savedPlaces';
import { createIdempotencyKey } from '@/services/api/idempotency';
import { ApiError, isApiError } from '@/services/api/problem';
import { useUserStore } from './useUserStore';

import type { Coord } from '@/services/naverApi';

export type VisitType = '필수방문' | '선택방문';

export interface FavoritePlace {
  placeId: string;
  /** 서버 목록/변경 응답에서 받은 strong ETag */
  etag?: string;
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
  ownerId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  notice: string | null;
  conflictDrafts: Record<
    string,
    { visitType: VisitType; memo: string } | undefined
  >;
  hydrate: (ownerId: string) => Promise<void>;
  reset: () => void;
  clearNotice: () => void;
  isFavorite: (placeId: string) => boolean;
  addFavorite: (place: FavoritePlace) => Promise<void>;
  updateFavorite: (
    placeId: string,
    visitType: VisitType,
    memo: string,
  ) => Promise<void>;
  removeFavorite: (placeId: string) => Promise<void>;
}

const categoryLabel = (place: SavedPlace) => {
  if (place.tags.includes('카페')) return '카페';
  const labels: Record<string, string> = {
    'content-type:12': '관광지',
    'content-type:32': '숙소',
    'content-type:39': '식당',
  };
  return labels[place.category] ?? '장소';
};

const strongEtag = (etag: string) => {
  if (!/^"sp-[0-9a-f]{32}"$/.test(etag))
    throw new ApiError({ status: 0, code: 'INVALID_ETAG' });
  return etag;
};

const fromServer = (place: SavedPlace): FavoritePlace => {
  requireCanonicalPlaceId(place.placeId);
  return {
    placeId: place.placeId,
    etag: strongEtag(place.etag),
    name: place.name,
    category: categoryLabel(place),
    address: place.regionLabel ?? '미제공',
    visitType: place.priority === 5 ? '필수방문' : '선택방문',
    memo: place.memo ?? '',
    stayMinutes: place.recommendedStayMinutes ?? 60,
    direction: '',
    // 저장 장소 계약에는 좌표가 없으며 GPS/간접 위치를 Spring에 전달하지 않는다.
    coord: null,
  };
};

const createBody = (place: FavoritePlace): SavedPlaceCreateRequest => ({
  placeId: place.placeId,
  memo: place.memo,
  priority: place.visitType === '필수방문' ? 5 : 0,
});

interface DurableCreate {
  body: SavedPlaceCreateRequest;
  key: string;
}

const durableKeyName = (ownerId: string, placeId: string) =>
  `timing-jeju:saved-place-create:v1:${ownerId}:${placeId}`;

const sameBody = (
  left: SavedPlaceCreateRequest,
  right: SavedPlaceCreateRequest,
) => JSON.stringify(left) === JSON.stringify(right);

async function durableCreate(
  ownerId: string,
  body: SavedPlaceCreateRequest,
): Promise<{ storageKey: string; value: DurableCreate }> {
  const storageKey = durableKeyName(ownerId, body.placeId);
  let stored: DurableCreate | null = null;
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) stored = JSON.parse(raw) as DurableCreate;
  } catch {
    stored = null;
  }
  const value =
    stored && typeof stored.key === 'string' && sameBody(stored.body, body)
      ? stored
      : { body, key: createIdempotencyKey() };
  await AsyncStorage.setItem(storageKey, JSON.stringify(value));
  return { storageKey, value };
}

let generation = 0;
let hydration: {
  ownerId: string;
  authGeneration: number;
  promise: Promise<void>;
} | null = null;

const currentAuth = () => {
  const { userId: ownerId, authGeneration } = useUserStore.getState();
  if (!ownerId)
    throw new ApiError({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
  return { ownerId, authGeneration };
};

const authContext = (ownerId: string, authGeneration: number) => () => {
  const current = useUserStore.getState();
  return (
    current.userId === ownerId && current.authGeneration === authGeneration
  );
};

const isConflict = (error: unknown) =>
  isApiError(error) && (error.status === 409 || error.status === 412);

const conflictNotice =
  '다른 곳에서 변경된 최신 내용을 불러왔어요. 입력한 내용을 확인한 뒤 다시 저장해 주세요.';

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  ownerId: null,
  status: 'idle',
  notice: null,
  conflictDrafts: {},
  hydrate: async (ownerId) => {
    const active = currentAuth();
    if (active.ownerId !== ownerId)
      throw new ApiError({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
    const { authGeneration } = active;
    if (
      hydration?.ownerId === ownerId &&
      hydration.authGeneration === authGeneration &&
      get().ownerId === ownerId &&
      get().status === 'loading'
    )
      return hydration.promise;

    const currentGeneration = ++generation;
    set((state) => ({
      ownerId,
      status: 'loading',
      ...(state.ownerId === ownerId
        ? {}
        : { favorites: [], conflictDrafts: {}, notice: null }),
    }));
    const authContextIsCurrent = authContext(ownerId, authGeneration);
    const promise = fetchAllSavedPlaces({}, authContextIsCurrent)
      .then((places) => {
        if (
          currentGeneration === generation &&
          get().ownerId === ownerId &&
          authContextIsCurrent()
        )
          set({ favorites: places.map(fromServer), status: 'ready' });
      })
      .catch((error) => {
        if (
          currentGeneration === generation &&
          get().ownerId === ownerId &&
          authContextIsCurrent()
        )
          set({ status: 'error' });
        throw error;
      })
      .finally(() => {
        if (hydration?.promise === promise) hydration = null;
      });
    hydration = { ownerId, authGeneration, promise };
    return promise;
  },
  reset: () => {
    generation += 1;
    hydration = null;
    set({
      favorites: [],
      ownerId: null,
      status: 'idle',
      notice: null,
      conflictDrafts: {},
    });
  },
  clearNotice: () => set({ notice: null }),
  isFavorite: (placeId) =>
    get().favorites.some((place) => place.placeId === placeId),
  addFavorite: async (place) => {
    requireCanonicalPlaceId(place.placeId);
    const { ownerId, authGeneration } = currentAuth();
    const authContextIsCurrent = authContext(ownerId, authGeneration);
    const body = createBody(place);
    const pending = await durableCreate(ownerId, body);
    try {
      const response = await createSavedPlace(
        body,
        pending.value.key,
        authContextIsCurrent,
      );
      if (response.etag && response.etag !== response.data.etag)
        throw new ApiError({ status: 0, code: 'INVALID_ETAG' });
      await AsyncStorage.removeItem(pending.storageKey);
      if (!authContextIsCurrent()) return;
      set((state) => ({
        ownerId,
        status: 'ready',
        favorites: [
          ...state.favorites.filter((item) => item.placeId !== place.placeId),
          fromServer(response.data),
        ],
      }));
    } catch (error) {
      if (isApiError(error) && error.status > 0 && error.status < 500)
        await AsyncStorage.removeItem(pending.storageKey);
      if (isConflict(error) && authContextIsCurrent()) {
        await get().hydrate(ownerId);
        set({ notice: conflictNotice });
      }
      throw error;
    }
  },
  updateFavorite: async (placeId, visitType, memo) => {
    const { ownerId, authGeneration } = currentAuth();
    const authContextIsCurrent = authContext(ownerId, authGeneration);
    const current = get().favorites.find((place) => place.placeId === placeId);
    if (!current?.etag) throw new ApiError({ status: 0, code: 'INVALID_ETAG' });
    try {
      const response = await updateSavedPlace(
        placeId,
        { memo, priority: visitType === '필수방문' ? 5 : 0 },
        current.etag,
        authContextIsCurrent,
      );
      if (response.etag && response.etag !== response.data.etag)
        throw new ApiError({ status: 0, code: 'INVALID_ETAG' });
      if (!authContextIsCurrent()) return;
      set((state) => ({
        favorites: state.favorites.map((place) =>
          place.placeId === placeId ? fromServer(response.data) : place,
        ),
        conflictDrafts: { ...state.conflictDrafts, [placeId]: undefined },
      }));
    } catch (error) {
      if (isConflict(error) && authContextIsCurrent()) {
        await get().hydrate(ownerId);
        set((state) => ({
          notice: conflictNotice,
          conflictDrafts: {
            ...state.conflictDrafts,
            [placeId]: { visitType, memo },
          },
        }));
      }
      throw error;
    }
  },
  removeFavorite: async (placeId) => {
    const { ownerId, authGeneration } = currentAuth();
    const authContextIsCurrent = authContext(ownerId, authGeneration);
    const current = get().favorites.find((place) => place.placeId === placeId);
    if (!current?.etag) throw new ApiError({ status: 0, code: 'INVALID_ETAG' });
    try {
      await deleteSavedPlace(placeId, authContextIsCurrent);
      if (!authContextIsCurrent()) return;
      set((state) => ({
        favorites: state.favorites.filter((place) => place.placeId !== placeId),
      }));
    } catch (error) {
      if (isConflict(error) && authContextIsCurrent()) {
        await get().hydrate(ownerId);
        set({ notice: conflictNotice });
      }
      throw error;
    }
  },
}));
