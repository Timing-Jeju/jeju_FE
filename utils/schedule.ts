/** 서버 결과 없이 시간·거리·요금·위험도를 만드는 이전 모의 계산을 제거했다. */
import type { Coord } from '@/services/naverApi';
import { unsupportedPlannerAction } from '@/services/plannerAvailability';
import type {
  DayReview,
  RouteBus,
  RouteLeg,
  ScheduleMode,
  SchedulePlace,
} from '@/store/useScheduleStore';

export interface DayEndpoint {
  name: string;
  /** 'H:MM' */
  time: string;
  coord: Coord | null;
}

export interface FillSuggestion {
  id: string;
  name: string;
  /** 도보 / 버스 */
  transportLabel: string;
  startTime: string;
  endTime: string;
  distanceText: string;
}

export interface RouteAlternative {
  id: string;
  from: string;
  to: string;
  bus: RouteBus | null;
  startTime: string;
  endTime: string;
  cost: number;
  note: string;
}

// 이전 화면의 함수 서명은 API adapter 전환 전까지 유지하되 결과를 합성하지 않는다.
export const buildDayReview: (
  places: SchedulePlace[],
  start: DayEndpoint,
  end: DayEndpoint,
  mode: ScheduleMode,
) => DayReview = unsupportedPlannerAction;
export const rechainLegs: (legs: RouteLeg[]) => RouteLeg[] =
  unsupportedPlannerAction;
export const insertPlacesBeforeEnd: (
  legs: RouteLeg[],
  places: SchedulePlace[],
) => RouteLeg[] = unsupportedPlannerAction;
export const recheckReview: (review: DayReview) => DayReview =
  unsupportedPlannerAction;
export const buildFillSuggestions = (_leg: RouteLeg): FillSuggestion[] => [];
export const buildAlternatives = (_leg: RouteLeg): RouteAlternative[] => [];

export const activeReview = (reviews: Record<number, DayReview>) =>
  Object.values(reviews).find((review) => review.confirmed) ?? null;
