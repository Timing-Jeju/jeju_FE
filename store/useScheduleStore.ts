import { create } from 'zustand';
import { requireCanonicalPlaceId } from '@/services/canonicalId';

import type { BusTagColor } from '@/components/ui';
import type { Coord } from '@/services/naverApi';
import { unsupportedPlannerAction } from '@/services/plannerAvailability';
import { rechainLegs, recheckReview } from '@/utils/schedule';
import type { VisitType } from './useFavoriteStore';

/** 일정 검토 결과의 위험도 */
export type RiskStatus = 'positive' | 'cautionary' | 'warning';

/** 일정 생성 방법 (직접 입력 / AI 제안) */
export type ScheduleMode = 'manual' | 'ai';

/** Day에 담아둔 방문 예정 장소 */
export interface SchedulePlace {
  /** 서버 일정 항목의 opaque ID. 로컬 초안에는 아직 없을 수 있다. */
  itemId?: string;
  /** 서버의 canonical 장소 ID */
  placeId: string | null;
  itemType?:
    | 'place_visit'
    | 'meal'
    | 'accommodation'
    | 'arrival'
    | 'departure'
    | 'free_time'
    | 'custom';
  name: string;
  /** 관광지 / 식당 / 카페 … */
  category: string;
  address: string;
  visitType: VisitType | null;
  /** 체류 시간 (분) */
  stayMinutes: number;
  coord: Coord | null;
  plannedStartAt?: string;
  plannedEndAt?: string;
  bufferAfterMinutes?: number;
  required?: boolean;
  memo?: string | null;
  progressStatus?:
    | 'planned'
    | 'active'
    | 'arrived'
    | 'completed'
    | 'skipped'
    | 'missed';
}

export interface RouteBus {
  text: string;
  color: BusTagColor;
}

/** 구간을 펼쳤을 때 보여주는 경유 지점 */
export interface RouteStep {
  /** place: 장소, stop: 정류장 */
  kind: 'place' | 'stop';
  name: string;
  /** 다음 지점까지의 안내 문구 (40분 체류 / 도보 800m 10분 …) */
  detail: string | null;
  /** 다음 지점까지 타는 버스 */
  buses: RouteBus[];
  /** 환승 여유가 빠듯한 지점 */
  caution: boolean;
}

/** 장소와 장소 사이의 이동 구간 — 일정 검토 / 실시간 지도의 기본 단위 */
export interface RouteLeg {
  id: string;
  from: string;
  to: string;
  /** 지도에 그릴 출발 / 도착 좌표 (모르면 null) */
  fromCoord: Coord | null;
  toCoord: Coord | null;
  status: RiskStatus;
  /** 'H:MM' */
  startTime: string;
  endTime: string;
  /** 서버가 제공하지 않은 요금은 null이며 0원으로 합성하지 않는다. */
  cost: number | null;
  distanceText: string;
  /** 위험 / 주의 사유 (안전한 구간은 null) */
  reason: string | null;
  steps: RouteStep[];
  /** 출발 장소에서 머무는 시간 (분) — 재검사할 때 시간을 다시 배분하는 데 쓴다 */
  departStayMinutes: number;
  /** 도착 후 다음 일정 전까지 남는 여유 시간 (분) */
  slackMinutes: number;
  /** 접힌 카드에 노출하는 대표 버스 */
  buses: RouteBus[];
}

export interface DayReview {
  mode: ScheduleMode;
  /** AI 총평 */
  summary: string;
  legs: RouteLeg[];
  /** 생성 이후 손을 대서 다시 검사해야 하는지 */
  dirty: boolean;
  /** 확정하기를 누른 뒤인지 */
  confirmed: boolean;
  /** Spring schedule API에서 조회한 검토 데이터인지 여부 */
  serverBacked?: boolean;
}

/** 검토 결과 전체의 위험도 (가장 나쁜 구간을 따른다) */
export const worstStatus = (legs: RouteLeg[]): RiskStatus => {
  if (legs.some((leg) => leg.status === 'warning')) return 'warning';
  if (legs.some((leg) => leg.status === 'cautionary')) return 'cautionary';
  return 'positive';
};

const DAY_ORDINALS = ['첫째', '둘째', '셋째', '넷째'];

/** 화면 제목용 Day 표기 (여행 "첫째" 날) */
export const dayOrdinal = (day: number) =>
  DAY_ORDINALS[day - 1] ?? `${day}번째`;

interface ScheduleState {
  /** Day(1부터 시작)별 방문 예정 장소 */
  places: Record<number, SchedulePlace[]>;
  /** Day별 일정 검토 결과 */
  reviews: Record<number, DayReview>;
  activeVersionId: string | null;
  versionNo: number | null;
  loading: boolean;
  mutating: boolean;
  pendingMutationRecovery: boolean;
  error: string | null;
  /** 이미 담긴 장소는 건너뛰고 뒤에 이어 붙인다 */
  addPlaces: (day: number, places: SchedulePlace[]) => void;
  removePlace: (day: number, placeId: string) => void;
  movePlace: (day: number, from: number, to: number) => void;
  updateStayMinutes: (
    day: number,
    placeId: string,
    stayMinutes: number,
  ) => void;
  setReview: (day: number, review: DayReview) => void;
  /** 검토 화면에서 구간 순서를 바꾸거나 대체 경로를 반영한다 */
  setLegs: (day: number, legs: RouteLeg[]) => void;
  removeLegs: (day: number, ids: string[]) => void;
  /** 남은 구간으로 시간 / 위험도를 다시 계산한다 */
  recheck: (day: number) => void;
  confirmDay: (day: number) => void;
}

/**
 * 바뀐 구간을 반영하면서 Day 장소 목록도 같이 맞춘다.
 * 구간에서 빠진 장소는 더 이상 그 날 일정이 아니므로 목록에서도 지운다.
 */
const applyLegs = (
  state: ScheduleState,
  day: number,
  review: DayReview,
  legs: RouteLeg[],
): Pick<ScheduleState, 'places' | 'reviews'> => {
  // 구간의 표시 이름으로 canonical 장소 목록을 변경하지 않는다.
  return {
    places: state.places,
    reviews: {
      ...state.reviews,
      [day]: { ...review, legs, dirty: true, confirmed: false },
    },
  };
};

export const useScheduleStore = create<ScheduleState>((set) => ({
  places: {},
  reviews: {},
  activeVersionId: null,
  versionNo: null,
  loading: false,
  mutating: false,
  pendingMutationRecovery: false,
  error: null,
  addPlaces: (day, places) => {
    places.forEach((place) => requireCanonicalPlaceId(place.placeId));
    set((state) => {
      const current = state.places[day] ?? [];
      const seen = new Set(current.map((place) => place.placeId));
      const added = places.filter((place) => {
        if (seen.has(place.placeId)) return false;
        seen.add(place.placeId);
        return true;
      });
      return { places: { ...state.places, [day]: [...current, ...added] } };
    });
  },
  removePlace: (day, placeId) =>
    set((state) => ({
      places: {
        ...state.places,
        [day]: (state.places[day] ?? []).filter(
          (place) => place.placeId !== placeId,
        ),
      },
    })),
  movePlace: (day, from, to) =>
    set((state) => {
      const current = state.places[day] ?? [];
      if (from === to || from < 0 || from >= current.length) return state;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { places: { ...state.places, [day]: next } };
    }),
  updateStayMinutes: (day, placeId, stayMinutes) =>
    set((state) => ({
      places: {
        ...state.places,
        [day]: (state.places[day] ?? []).map((place) =>
          place.placeId === placeId ? { ...place, stayMinutes } : place,
        ),
      },
    })),
  setReview: (day, review) =>
    set((state) => ({ reviews: { ...state.reviews, [day]: review } })),
  setLegs: (day, legs) =>
    set((state) => {
      const review = state.reviews[day];
      if (!review) return state;
      // 구간이 바뀌면 다시 검사해야 하므로 확정 상태를 푼다
      return applyLegs(state, day, review, legs);
    }),
  removeLegs: (day, ids) =>
    set((state) => {
      const review = state.reviews[day];
      if (!review) return state;
      // 가운데를 지우면 경유지가 끊기므로 남은 구간을 다시 이어 붙인다
      return applyLegs(
        state,
        day,
        review,
        rechainLegs(review.legs.filter((leg) => !ids.includes(leg.id))),
      );
    }),
  recheck: (day) =>
    set((state) => {
      const review = state.reviews[day];
      if (!review) return state;
      return {
        reviews: { ...state.reviews, [day]: recheckReview(review) },
      };
    }),
  confirmDay: unsupportedPlannerAction,
}));
