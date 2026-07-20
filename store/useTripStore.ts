import { create } from 'zustand';

export type TripTransportMode = 'bus' | 'taxi' | 'walk';
export type ArrivalTransport = '비행기' | '선박';

export interface TripLodging {
  name: string;
  address: string;
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
  lodging: TripLodging | null;
  styles: string[];
  transport: TripTransportMode | null;
}

interface TripState extends TripConditions {
  saved: boolean;
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
  lodging: null,
  styles: [],
  transport: null,
  saved: false,
  saveConditions: (conditions) => set({ ...conditions, saved: true }),
}));
