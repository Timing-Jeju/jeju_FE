/**
 * TODO: 경로 탐색 / AI 일정 생성 API 연동 전 임시 로직.
 * 장소 목록과 여행 조건만으로 검토용 구간(RouteLeg)을 만들어낸다.
 * 값은 장소 이름 해시에서 뽑아 화면을 다시 그려도 흔들리지 않게 했다.
 */

import type { Coord } from '@/services/naverApi';
import type {
  DayReview,
  RouteBus,
  RouteLeg,
  RouteStep,
  RiskStatus,
  ScheduleMode,
  SchedulePlace,
} from '@/store/useScheduleStore';
import { toMinutes, toTime } from './date';

/** 장소 사이 기본 이동 시간 (분) */
const MOVE_MINUTES = 30;
/** AI가 제안하는 기본 체류 시간 (분) */
const AI_STAY_MINUTES = 60;

const BUS_COLORS = ['green', 'blue', 'sky', 'red'] as const;

const hashOf = (text: string) => {
  let value = 7;
  for (let index = 0; index < text.length; index += 1) {
    value = (value * 31 + text.charCodeAt(index)) % 100003;
  }
  return value;
};

const pick = <T>(items: readonly T[], seed: number) =>
  items[seed % items.length];

const busOf = (seed: number, offset: number): RouteBus => ({
  text: String(((seed >> offset) % 200) + 1),
  color: pick(BUS_COLORS, seed + offset),
});

export interface DayEndpoint {
  name: string;
  /** 'H:MM' */
  time: string;
  coord: Coord | null;
}

const statusOf = (slackMinutes: number): RiskStatus => {
  if (slackMinutes < 15) return 'warning';
  if (slackMinutes < 30) return 'cautionary';
  return 'positive';
};

const REASON: Record<RiskStatus, string | null> = {
  warning:
    '공항 버스 승강장에서 성산 시내 버스로의 이동 사이시간을 줄여야 다음 버스를 탈 수 있어요',
  cautionary: '환승 여유가 5분 남짓이라 버스가 조금만 늦어도 놓칠 수 있어요',
  positive: null,
};

/** 한 구간의 경유 지점 (출발 장소 → 출발 정류장 → 도착 정류장 → 도착 장소) */
const buildSteps = (
  from: string,
  to: string,
  stayMinutes: number,
  seed: number,
  status: RiskStatus,
): RouteStep[] => [
  {
    kind: 'place',
    name: from,
    detail: `${stayMinutes}분 체류`,
    buses: [],
    caution: false,
  },
  {
    kind: 'stop',
    name: `${from} 정류장`,
    detail: null,
    buses: [busOf(seed, 1), busOf(seed, 3)],
    caution: false,
  },
  {
    kind: 'stop',
    name: `${to} 정류장`,
    detail: `도보 ${((seed % 8) + 1) * 100}m ${(seed % 9) + 3}분`,
    buses: [busOf(seed, 5)],
    caution: status !== 'positive',
  },
  {
    kind: 'place',
    name: to,
    detail: null,
    buses: [],
    caution: false,
  },
];

interface Stop {
  name: string;
  coord: Coord | null;
  stayMinutes: number;
}

const buildLeg = (from: Stop, to: Stop, departMinutes: number): RouteLeg => {
  const seed = hashOf(`${from.name}-${to.name}`);
  const moveMinutes = MOVE_MINUTES + (seed % 40);
  const slackMinutes = seed % 45;
  const status = statusOf(slackMinutes);

  return {
    id: `${from.name}→${to.name}`,
    from: from.name,
    to: to.name,
    fromCoord: from.coord,
    toCoord: to.coord,
    status,
    startTime: toTime(departMinutes),
    endTime: toTime(departMinutes + moveMinutes),
    cost: ((seed % 12) + 1) * 500,
    distanceText: `${((seed % 20) + 1) * 100}m`,
    reason: REASON[status],
    steps: buildSteps(from.name, to.name, from.stayMinutes, seed, status),
    departStayMinutes: from.stayMinutes,
    slackMinutes,
    buses: [busOf(seed, 1), busOf(seed, 3)],
  };
};

/** 경유지 순서를 따라가며 체류 시간 + 이동 시간으로 구간을 만든다 */
const buildLegs = (stops: Stop[], startMinutes: number): RouteLeg[] => {
  let cursor = startMinutes;
  const legs: RouteLeg[] = [];

  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];
    // 출발 장소에서 체류한 뒤 다음 장소로 이동한다
    cursor += from.stayMinutes;
    const leg = buildLeg(from, to, cursor);
    legs.push(leg);
    cursor = toMinutes(leg.endTime);
  }

  return legs;
};

const summaryOf = (mode: ScheduleMode) =>
  mode === 'ai'
    ? 'AI가 이동 시간과 체류 시간을 맞춰 동선을 정리했어요 (전체적인 총평)'
    : '공항 버스 승강장에서 성산 시내 버스로의 이동 사이시간을 줄여야 다음 버스를 탈 수 있어요 (전체적인 총평)';

/** 장소 목록 + 출발지 / 도착지로 하루치 검토 결과를 만든다 */
export const buildDayReview = (
  places: SchedulePlace[],
  start: DayEndpoint,
  end: DayEndpoint,
  mode: ScheduleMode,
): DayReview => {
  const stops: Stop[] = [
    { name: start.name, coord: start.coord, stayMinutes: 0 },
    ...places.map((place) => ({
      name: place.name,
      coord: place.coord,
      stayMinutes: mode === 'ai' ? AI_STAY_MINUTES : place.stayMinutes,
    })),
    { name: end.name, coord: end.coord, stayMinutes: 0 },
  ];

  return {
    mode,
    summary: summaryOf(mode),
    legs: buildLegs(stops, toMinutes(start.time)),
    dirty: false,
    confirmed: false,
  };
};

/** 구간 목록에서 경유지 순서를 도로 뽑아낸다 */
const stopsOf = (legs: RouteLeg[]): Stop[] => [
  {
    name: legs[0].from,
    coord: legs[0].fromCoord,
    stayMinutes: legs[0].departStayMinutes,
  },
  ...legs.map((leg, index) => ({
    name: leg.to,
    coord: leg.toCoord,
    // 다음 구간의 출발 체류 시간이 곧 이 장소에 머무는 시간이다
    stayMinutes: legs[index + 1]?.departStayMinutes ?? 0,
  })),
];

/** 하루가 시작되는 시각 (첫 구간의 출발 장소에 도착한 시각) */
const startMinutesOf = (legs: RouteLeg[]) =>
  toMinutes(legs[0].startTime) - legs[0].departStayMinutes;

/**
 * 순서를 바꾸거나 중간 구간을 지우면 경유지가 끊기므로 다시 이어 붙인다.
 * 앞 구간의 도착지가 다음 구간의 출발지가 되도록 맞추고 시간도 다시 배분한다.
 */
export const rechainLegs = (legs: RouteLeg[]): RouteLeg[] =>
  legs.length === 0 ? legs : buildLegs(stopsOf(legs), startMinutesOf(legs));

/** 마지막 도착지(숙소 / 공항) 바로 앞에 장소를 끼워 넣는다 */
export const insertPlacesBeforeEnd = (
  legs: RouteLeg[],
  places: SchedulePlace[],
): RouteLeg[] => {
  if (legs.length === 0 || places.length === 0) return legs;

  const stops = stopsOf(legs);
  const end = stops[stops.length - 1];
  const extras: Stop[] = places.map((place) => ({
    name: place.name,
    coord: place.coord,
    stayMinutes: place.stayMinutes,
  }));

  return buildLegs(
    [...stops.slice(0, -1), ...extras, end],
    startMinutesOf(legs),
  );
};

/** 남은 구간으로 시간과 위험도를 처음부터 다시 계산한다 */
export const recheckReview = (review: DayReview): DayReview => ({
  ...review,
  summary: summaryOf(review.mode),
  legs: rechainLegs(review.legs),
  dirty: false,
});

/**
 * 지금 따라가고 있는 하루 일정.
 * TODO: 여행 날짜 판별 API 연동 전에는 확정한 Day를, 없으면 첫 Day를 쓴다.
 */
export const activeReview = (reviews: Record<number, DayReview>) => {
  const all = Object.values(reviews);
  return all.find((review) => review.confirmed) ?? all[0] ?? null;
};

/** 빈 시간 채우기 후보 (여유 시간 안에 다녀올 수 있는 장소) */
export interface FillSuggestion {
  id: string;
  name: string;
  /** 도보 / 버스 */
  transportLabel: string;
  startTime: string;
  endTime: string;
  distanceText: string;
}

const FILL_PLACES = ['제주 당근 카페', '제주 감귤 카페', '제주 바다 카페'];

/** TODO: 주변 장소 추천 API 연동 전 임시 후보 목록 */
export const buildFillSuggestions = (leg: RouteLeg): FillSuggestion[] => {
  const base = toMinutes(leg.startTime);

  return FILL_PLACES.map((name, index) => {
    const seed = hashOf(`${leg.id}-${name}`);
    const offset = index * 8;
    const duration = 30 + (seed % 10);
    return {
      id: `${leg.id}-${name}`,
      name,
      transportLabel: '도보',
      startTime: toTime(base + offset),
      endTime: toTime(base + offset + duration),
      distanceText: `${((seed % 10) + 1) * 10}m`,
    };
  });
};

/** 구간 상세에서 보여주는 대체 경로 후보 */
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

/** TODO: 경로 대안 API 연동 전 임시 후보 목록 */
export const buildAlternatives = (leg: RouteLeg): RouteAlternative[] => {
  const stops = leg.steps.filter((step) => step.kind === 'stop');
  const from = stops[0]?.name ?? leg.from;
  const base = toMinutes(leg.startTime);

  return [0, 1].map((index) => {
    const seed = hashOf(`${leg.id}-alt-${index}`);
    return {
      id: `${leg.id}-alt-${index}`,
      from,
      to: index === 0 ? (stops[1]?.name ?? leg.to) : leg.to,
      bus: index === 0 ? busOf(seed, 2) : null,
      startTime: toTime(base - 7 + index * 4),
      endTime: toTime(base + 32 + index * 6),
      cost: index === 0 ? 2900 : 16400,
      note: '기존보다 높은 비용',
    };
  });
};
