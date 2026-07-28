import { create } from 'zustand';

import type { Coord } from '@/services/naverApi';
import type { VisitType } from './useFavoriteStore';

/** 출발지 / 도착지는 AI 일정 생성 시 자동으로 붙는 항목이다 */
export type ScheduleItemType = 'departure' | 'visit' | 'arrival';

export interface ScheduleItem {
  /** Day 안에서 항목을 구분하는 키 */
  name: string;
  type: ScheduleItemType;
  /** 공항 / 숙소 / 카페 / 식당 … (타임라인 아이콘 선택에 쓴다) */
  category: string;
  /** 방문 장소만 갖는 방문 유형 */
  visitType: VisitType | null;
  /** 체류 시간 (분) — 출발지 / 도착지는 null */
  stayMinutes: number | null;
  /** HH:MM — AI 일정 생성 전에는 null */
  time: string | null;
  coord: Coord | null;
}

/** 타임라인에 노출되는 방문 유형 문구 */
export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  필수방문: '필수 방문',
  선택방문: '선택 방문',
};

const DAY_ORDINALS = ['첫째', '둘째', '셋째', '넷째'];

/** 화면 제목용 Day 표기 (여행 "첫째" 날) */
export const dayOrdinal = (day: number) =>
  DAY_ORDINALS[day - 1] ?? `${day}번째`;

interface ScheduleState {
  /** Day(1부터 시작)별 일정 항목 */
  schedules: Record<number, ScheduleItem[]>;
  /** 이미 담긴 장소는 건너뛰고 뒤에 이어 붙인다 */
  addItems: (day: number, items: ScheduleItem[]) => void;
  /** AI 일정 생성 결과로 해당 Day 전체를 교체한다 */
  setItems: (day: number, items: ScheduleItem[]) => void;
  updateStayMinutes: (day: number, name: string, stayMinutes: number) => void;
  moveItem: (day: number, from: number, to: number) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  schedules: {},
  addItems: (day, items) =>
    set((state) => {
      const current = state.schedules[day] ?? [];
      const added = items.filter(
        (item) => !current.some((place) => place.name === item.name),
      );
      return {
        schedules: { ...state.schedules, [day]: [...current, ...added] },
      };
    }),
  setItems: (day, items) =>
    set((state) => ({ schedules: { ...state.schedules, [day]: items } })),
  updateStayMinutes: (day, name, stayMinutes) =>
    set((state) => ({
      schedules: {
        ...state.schedules,
        [day]: (state.schedules[day] ?? []).map((item) =>
          item.name === name ? { ...item, stayMinutes } : item,
        ),
      },
    })),
  moveItem: (day, from, to) =>
    set((state) => {
      const current = state.schedules[day] ?? [];
      if (from === to || from < 0 || from >= current.length) return state;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { schedules: { ...state.schedules, [day]: next } };
    }),
}));
