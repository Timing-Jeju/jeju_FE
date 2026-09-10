import { create } from 'zustand';
import { isCanonicalPlaceId } from '@/services/canonicalId';

import type { Coord } from '@/services/naverApi';
import type { Accommodation } from '@/services/api/accommodations';
import type { TransportEvent } from '@/services/api/transportEvents';
import type { Trip, TripListItem } from '@/services/api/trips';

export type TripTransportMode = 'bus' | 'taxi' | 'walk';
export type ArrivalTransport = '비행기' | '선박';
/** single: 여행 내내 한 숙소 / daily: 일자별로 숙소가 달라짐 */
export type LodgingMode = 'single' | 'daily';

export interface TripLodging {
  placeId: string;
  name: string;
  address: string;
  coord: Coord | null;
}

export interface DayTime {
  start: string;
  end: string;
}

export interface TripConditions {
  /** ISO 날짜 문자열 (YYYY-MM-DD) */
  startDate: string | null;
  endDate: string | null;
  arrivalTransport: ArrivalTransport | null;
  arrivalTime: string | null;
  departureTransport: ArrivalTransport | null;
  departureTime: string | null;
  /** 날짜(YYYY-MM-DD)별 활동 시간 */
  dayTimes: Record<string, DayTime>;
  lodgingMode: LodgingMode | null;
  /** lodgingMode === 'single'일 때의 숙소 */
  lodging: TripLodging | null;
  /** lodgingMode === 'daily'일 때 날짜(YYYY-MM-DD)별 숙소 */
  dailyLodgings: Record<string, TripLodging>;
  styles: string[];
  /** 주요 이동 수단 (중복 선택 가능) */
  transport: TripTransportMode[];
}

export interface TripState extends TripConditions {
  /** 서버 trip root 저장 여부. BE가 제공하지 않는 하위 aggregate 조회 여부와는 별개다. */
  saved: boolean;
  draftSaved: boolean;
  tripId: string | null;
  etag: string | null;
  serverTrip: Trip | null;
  trips: TripListItem[];
  accommodations: Record<string, Accommodation>;
  transportEvents: Partial<Record<'arrival' | 'departure', TransportEvent>>;
  loading: boolean;
  serverError: string | null;
  pendingTripCreate: { fingerprint: string; key: string } | null;
  pendingAccommodationCreate: { fingerprint: string; key: string } | null;
  saveConditions: (conditions: TripConditions) => void;
}

export const useTripStore = create<TripState>((set) => ({
  startDate: null,
  endDate: null,
  arrivalTransport: null,
  arrivalTime: null,
  departureTransport: null,
  departureTime: null,
  dayTimes: {},
  lodgingMode: null,
  lodging: null,
  dailyLodgings: {},
  styles: [],
  transport: [],
  saved: false,
  draftSaved: false,
  tripId: null,
  etag: null,
  serverTrip: null,
  trips: [],
  accommodations: {},
  transportEvents: {},
  loading: false,
  serverError: null,
  pendingTripCreate: null,
  pendingAccommodationCreate: null,
  saveConditions: (conditions) =>
    set({ ...conditions, draftSaved: true, saved: false, serverError: null }),
}));

type LodgingFields = Pick<
  TripConditions,
  'lodgingMode' | 'lodging' | 'dailyLodgings'
>;

/** 해당 날짜에 머무는 숙소 (일자별 숙소를 쓰면 그 날의 숙소를 돌려준다) */
export const lodgingOf = (
  conditions: LodgingFields,
  date: string | undefined,
): TripLodging | null => {
  if (conditions.lodgingMode === 'daily') {
    return (date ? conditions.dailyLodgings[date] : null) ?? null;
  }
  return conditions.lodging;
};

/** 숙소 입력이 끝났는지 (단일 숙소는 1곳, 일자별이면 모든 날) */
export const isLodgingComplete = (
  conditions: LodgingFields,
  dates: string[],
) => {
  if (conditions.lodgingMode === 'single')
    return isCanonicalPlaceId(conditions.lodging?.placeId);
  if (conditions.lodgingMode === 'daily') {
    return (
      dates.length > 0 &&
      dates.every((date) =>
        isCanonicalPlaceId(conditions.dailyLodgings[date]?.placeId),
      )
    );
  }
  return false;
};
