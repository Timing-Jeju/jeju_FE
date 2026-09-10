import { create } from 'zustand';

import {
  categoryLabel,
  createSavedPlace,
  deleteSavedPlace,
  fetchAllPlaces,
  fetchAllSavedPlaces,
  hasCode,
  isApiError,
  readSavedPlaceEtag,
  updateSavedPlace,
  type PlaceListItem,
  type SavedPlace,
} from '@/services/api';
import type { Coord } from '@/services/naverApi';

export type VisitType = '필수방문' | '선택방문';

export interface FavoritePlace {
  /** 백엔드 관심 장소 키 — 화면에서도 이 값으로 항목을 구분한다 */
  placeId: string;
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
  /** 사용자가 붙인 태그 (서버 값 그대로) */
  tags: string[];
  /** 여행 며칠째에 갈지 (1..365, 정하지 않았으면 null) */
  targetDay: number | null;
  /** 수정에 쓸 If-Match 값. 목록만 불러온 직후에는 null이다 */
  etag: string | null;
}

/*
 * '카페'는 대응하는 TourAPI 분류 코드가 없어 서버가 절대 내려주지 않는다.
 * 항상 빈 목록이 되는 칩이라 빼 둔다. (분류 정보가 생기면 다시 넣는다)
 */
export const FAVORITE_FILTERS = [
  '전체',
  '관광지',
  '식당',
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
      return place.category !== '식당';
    case '식당':
      return place.category === filter;
    case '필수방문':
    case '선택방문':
      return place.visitType === filter;
  }
};

/*
 * ---------------------------------------------------------------------------
 * 서버 값 <-> 화면 값 매핑
 *
 * 관심 장소 API에 없는 화면 값이 두 개 있어서 아래 규칙으로 메운다.
 * ---------------------------------------------------------------------------
 */

/**
 * visitType은 서버 `priority`(0..5)에 싣는다.
 *
 * "필수/선택 방문"은 사용자가 붙이는 이름표가 아니라 우선순위 진술이므로
 * 자유 입력인 `tags`가 아니라 `priority`가 맞다. tags는 사용자 태그로 남겨 둔다.
 * (덤으로 서버 `sort=priority_desc`가 필수방문을 앞으로 올려 준다.)
 */
const REQUIRED_PRIORITY = 5;
const OPTIONAL_PRIORITY = 0;
/** 이 값 이상이면 필수방문으로 본다 */
const REQUIRED_PRIORITY_MIN = 3;

const priorityOf = (visitType: VisitType) =>
  visitType === '필수방문' ? REQUIRED_PRIORITY : OPTIONAL_PRIORITY;

const visitTypeOf = (priority: number): VisitType =>
  priority >= REQUIRED_PRIORITY_MIN ? '필수방문' : '선택방문';

/**
 * direction은 서버에 없어서 좌표로 계산한다.
 *
 * 제주 여행은 보통 동부 / 서부로 나눠 다니므로 섬 중앙 경도를 기준으로 가른다.
 * (한라산이 126.53, 섬은 126.15~126.98이라 126.55가 대략 가운데다.)
 * 기존 화면 데이터와도 맞는다 — 함덕·성산은 동쪽, 새별오름은 서쪽이다.
 *
 * 좌표를 모르면 방향을 지어내지 않고 지역명을 그대로 쓴다.
 */
const JEJU_MID_LONGITUDE = 126.55;

const directionOf = (
  coord: Coord | null,
  regionLabel: string | null,
): string => {
  if (!coord) return regionLabel ?? '';
  return coord.longitude >= JEJU_MID_LONGITUDE ? '동쪽' : '서쪽';
};

/** 추천 체류 시간이 없는 장소에 쓰는 기본값 (분) */
const DEFAULT_STAY_MINUTES = 60;

/** 서버는 memo가 없으면 null, 화면은 빈 문자열을 쓴다 */
const toServerMemo = (memo: string) => (memo.trim().length > 0 ? memo : null);

/** 찜 목록 항목 + (있으면) 장소 목록 항목을 화면 값으로 합친다 */
const toFavoritePlace = (
  saved: SavedPlace,
  place: PlaceListItem | undefined,
  etag: string | null,
): FavoritePlace => {
  const coord = place
    ? { latitude: place.location.lat, longitude: place.location.lng }
    : null;

  return {
    placeId: saved.placeId,
    name: saved.name,
    category: categoryLabel(saved.category),
    address: place?.address ?? saved.regionLabel ?? '',
    visitType: visitTypeOf(saved.priority),
    memo: saved.memo ?? '',
    stayMinutes: saved.recommendedStayMinutes ?? DEFAULT_STAY_MINUTES,
    direction: directionOf(coord, saved.regionLabel),
    coord,
    tags: saved.tags,
    targetDay: saved.targetDay,
    etag,
  };
};

/** 현재 저장돼 있는 값 — ETag를 다시 읽을 때 그대로 되돌려 보낸다 */
const toServerPayload = (place: FavoritePlace) => ({
  placeId: place.placeId,
  memo: toServerMemo(place.memo),
  tags: place.tags,
  priority: priorityOf(place.visitType),
  targetDay: place.targetDay,
});

const messageOf = (error: unknown) =>
  isApiError(error) ? error.detail : '요청을 처리하지 못했습니다.';

/** 찜하기 화면이 넘겨주는 값 — 나머지는 서버 응답에서 채운다 */
export interface AddFavoriteInput {
  placeId: string;
  visitType: VisitType;
  memo: string;
  /** 장소 화면이 이미 알고 있으면 넘긴다 (없으면 지역명으로 대체한다) */
  address?: string;
  coord?: Coord | null;
}

interface FavoriteState {
  favorites: FavoritePlace[];
  loading: boolean;
  /** 마지막 실패 사유 (사용자에게 그대로 보여줄 수 있는 문구) */
  error: string | null;
  isFavorite: (placeId: string) => boolean;
  /** 찜 목록을 서버에서 다시 불러온다 */
  loadFavorites: () => Promise<void>;
  addFavorite: (input: AddFavoriteInput) => Promise<void>;
  updateFavorite: (
    placeId: string,
    visitType: VisitType,
    memo: string,
  ) => Promise<void>;
  removeFavorite: (placeId: string) => Promise<void>;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  loading: false,
  error: null,

  isFavorite: (placeId) =>
    get().favorites.some((place) => place.placeId === placeId),

  loadFavorites: async () => {
    set({ loading: true, error: null });
    try {
      /*
       * 두 목록을 합쳐 쓴다.
       * - 찜 목록: memo, tags, priority, targetDay (화면 값의 원본)
       * - 장소 목록(savedOnly): address, 좌표 — 찜 목록에는 없다
       * 장소를 건별로 조회하면 N+1이 되므로 목록 두 번으로 끝낸다.
       */
      const [saved, places] = await Promise.all([
        fetchAllSavedPlaces(),
        fetchAllPlaces({ savedOnly: true }),
      ]);

      const placeById = new Map(places.map((place) => [place.placeId, place]));
      // 이미 받아 둔 ETag는 버리지 않는다 (수정할 때 한 번 덜 부른다)
      const etagById = new Map(
        get().favorites.map((place) => [place.placeId, place.etag]),
      );

      set({
        favorites: saved.map((item) =>
          toFavoritePlace(
            item,
            placeById.get(item.placeId),
            etagById.get(item.placeId) ?? null,
          ),
        ),
        loading: false,
      });
    } catch (error) {
      set({ loading: false, error: messageOf(error) });
    }
  },

  addFavorite: async ({ placeId, visitType, memo, address, coord }) => {
    set({ error: null });
    try {
      const response = await createSavedPlace({
        placeId,
        memo: toServerMemo(memo),
        priority: priorityOf(visitType),
      });

      const saved = response.data;
      const created: FavoritePlace = {
        ...toFavoritePlace(saved, undefined, response.etag),
        address: address ?? saved.regionLabel ?? '',
        coord: coord ?? null,
        direction: directionOf(coord ?? null, saved.regionLabel),
      };

      set((state) => ({
        favorites: [
          ...state.favorites.filter((item) => item.placeId !== placeId),
          created,
        ],
      }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  updateFavorite: async (placeId, visitType, memo) => {
    const target = get().favorites.find((place) => place.placeId === placeId);
    if (!target) return;

    set({ error: null });

    const apply = async (place: FavoritePlace) => {
      // 목록만 불러온 직후에는 ETag가 없으므로 현재 값으로 한 번 읽어 온다
      const etag =
        place.etag ?? (await readSavedPlaceEtag(toServerPayload(place)));
      if (!etag) throw new Error('etag-missing');

      const response = await updateSavedPlace(
        placeId,
        { memo: toServerMemo(memo), priority: priorityOf(visitType) },
        etag,
      );

      set((state) => ({
        favorites: state.favorites.map((item) =>
          item.placeId === placeId
            ? {
                ...item,
                memo: response.data.memo ?? '',
                visitType: visitTypeOf(response.data.priority),
                tags: response.data.tags,
                targetDay: response.data.targetDay,
                etag: response.etag,
              }
            : item,
        ),
      }));
    };

    try {
      await apply(target);
    } catch (error) {
      /*
       * 들고 있던 값이 낡으면 ETag 읽기는 409 SAVED_PLACE_ALREADY_EXISTS,
       * 수정은 409 SAVED_PLACE_VERSION_CONFLICT가 난다.
       * 둘 다 "다시 조회한 뒤 재시도"가 정답이라 한 번만 자동으로 처리한다.
       */
      if (
        !hasCode(
          error,
          'SAVED_PLACE_ALREADY_EXISTS',
          'SAVED_PLACE_VERSION_CONFLICT',
        )
      ) {
        set({ error: messageOf(error) });
        return;
      }

      await get().loadFavorites();
      const latest = get().favorites.find((place) => place.placeId === placeId);
      if (!latest) return;

      try {
        // 다시 불러와도 들고 있던 ETag 는 그대로 남으므로, 낡은 값을 버리고 서버의 현재 값으로 다시 읽는다
        await apply({ ...latest, etag: null });
      } catch (retryError) {
        set({ error: messageOf(retryError) });
      }
    }
  },

  removeFavorite: async (placeId) => {
    set({ error: null });
    try {
      await deleteSavedPlace(placeId);
      set((state) => ({
        favorites: state.favorites.filter((place) => place.placeId !== placeId),
      }));
    } catch (error) {
      // 이미 지워졌으면 화면에서도 지우는 게 맞다
      if (hasCode(error, 'SAVED_PLACE_NOT_FOUND')) {
        set((state) => ({
          favorites: state.favorites.filter(
            (place) => place.placeId !== placeId,
          ),
        }));
        return;
      }
      set({ error: messageOf(error) });
    }
  },
}));
