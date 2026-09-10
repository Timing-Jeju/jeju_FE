import type {
  DayReview,
  RouteLeg,
  SchedulePlace,
} from '@/store/useScheduleStore';
import { toMinutes } from '@/utils/date';
import {
  activeReview,
  buildAlternatives,
  buildDayReview,
  buildFillSuggestions,
  insertPlacesBeforeEnd,
  rechainLegs,
  recheckReview,
  type DayEndpoint,
} from '@/utils/schedule';

const place = (name: string, stayMinutes = 60): SchedulePlace => ({
  name,
  category: '관광지',
  address: `${name} 주소`,
  visitType: '선택방문',
  stayMinutes,
  coord: { latitude: 33.5, longitude: 126.5 },
});

const AIRPORT: DayEndpoint = {
  name: '제주국제공항',
  time: '9:00',
  coord: { latitude: 33.5066, longitude: 126.4931 },
};
const LODGING: DayEndpoint = { name: '숙소', time: '21:00', coord: null };

/** 구간이 끊김 없이 이어지고, 다음 구간은 "앞 구간 도착 + 출발지 체류" 시각에 떠난다 */
const expectChained = (legs: RouteLeg[]) => {
  legs.slice(1).forEach((leg, index) => {
    const previous = legs[index];
    expect(leg.from).toBe(previous.to);
    expect(toMinutes(leg.startTime)).toBe(
      toMinutes(previous.endTime) + leg.departStayMinutes,
    );
  });
};

describe('buildDayReview', () => {
  it('출발지 → 장소들 → 도착지 순서로 구간을 만든다', () => {
    const review = buildDayReview(
      [place('A', 45), place('B', 90)],
      AIRPORT,
      LODGING,
      'manual',
    );

    expect(review.legs.map((leg) => [leg.from, leg.to])).toEqual([
      ['제주국제공항', 'A'],
      ['A', 'B'],
      ['B', '숙소'],
    ]);
    expect(review.mode).toBe('manual');
    expect(review.dirty).toBe(false);
    expect(review.confirmed).toBe(false);
    expect(review.summary.length).toBeGreaterThan(0);
  });

  it('첫 구간은 출발 시각에 떠나고, 직접 입력 모드는 장소의 체류 시간을 쓴다', () => {
    const { legs } = buildDayReview(
      [place('A', 45), place('B', 90)],
      AIRPORT,
      LODGING,
      'manual',
    );

    expect(legs[0].startTime).toBe('9:00');
    expect(legs[0].departStayMinutes).toBe(0);
    expect(legs[1].departStayMinutes).toBe(45);
    expect(legs[2].departStayMinutes).toBe(90);
    expectChained(legs);
  });

  it('AI 모드는 모든 장소에 60분 체류를 제안한다', () => {
    const { legs } = buildDayReview(
      [place('A', 45), place('B', 90)],
      AIRPORT,
      LODGING,
      'ai',
    );
    expect(legs[1].departStayMinutes).toBe(60);
    expect(legs[2].departStayMinutes).toBe(60);
  });

  it('좌표와 경유 지점(장소 → 정류장 → 정류장 → 장소)을 채운다', () => {
    const { legs } = buildDayReview([place('A')], AIRPORT, LODGING, 'ai');

    expect(legs[0].fromCoord).toEqual(AIRPORT.coord);
    expect(legs[0].toCoord).toEqual(place('A').coord);
    expect(legs[1].toCoord).toBeNull();
    legs.forEach((leg) => {
      expect(leg.steps.map((step) => step.kind)).toEqual([
        'place',
        'stop',
        'stop',
        'place',
      ]);
      expect(leg.steps[0].name).toBe(leg.from);
      expect(leg.steps[3].name).toBe(leg.to);
      // 안전한 구간에만 사유가 없다
      expect(leg.reason === null).toBe(leg.status === 'positive');
    });
  });

  it('장소가 없으면 출발지 → 도착지 한 구간만 만든다', () => {
    const { legs } = buildDayReview([], AIRPORT, LODGING, 'ai');
    expect(legs).toHaveLength(1);
    expect(legs[0].id).toBe('제주국제공항→숙소');
  });

  it('같은 입력이면 같은 결과를 낸다 (화면을 다시 그려도 흔들리지 않는다)', () => {
    const first = buildDayReview(
      [place('A'), place('B')],
      AIRPORT,
      LODGING,
      'ai',
    );
    const second = buildDayReview(
      [place('A'), place('B')],
      AIRPORT,
      LODGING,
      'ai',
    );
    expect(second).toEqual(first);
  });
});

describe('rechainLegs', () => {
  const build = () =>
    buildDayReview(
      [place('A', 45), place('B', 90), place('C', 30)],
      AIRPORT,
      LODGING,
      'manual',
    ).legs;

  it('끊기지 않은 구간은 그대로 돌려준다', () => {
    const legs = build();
    expect(rechainLegs(legs)).toEqual(legs);
    expect(rechainLegs([])).toEqual([]);
  });

  it('가운데 구간을 지우면 앞뒤를 이어 붙이되 각 장소의 체류 시간은 유지한다', () => {
    const legs = build();
    const remaining = legs.filter((leg) => leg.id !== 'A→B');

    const next = rechainLegs(remaining, legs);

    expect(next.map((leg) => [leg.from, leg.to])).toEqual([
      ['제주국제공항', 'A'],
      ['A', 'C'],
      ['C', '숙소'],
    ]);
    // A 의 체류 시간(45)이 지워진 B 의 값(90)이나 C 의 값(30)으로 바뀌지 않는다
    expect(next[1].departStayMinutes).toBe(45);
    expect(next[2].departStayMinutes).toBe(30);
    expect(next[0].startTime).toBe('9:00');
    expectChained(next);
  });

  it('첫 구간을 지워도 하루의 시작 시각은 그대로다', () => {
    const legs = build();
    const remaining = legs.filter((leg) => leg.id !== '제주국제공항→A');

    const next = rechainLegs(remaining, legs);

    expect(next[0].from).toBe('A');
    // 9:00 에 A 에 도착해 45분 머문 뒤 떠난다
    expect(next[0].startTime).toBe('9:45');
    expect(next[0].departStayMinutes).toBe(45);
    expectChained(next);
  });

  it('순서를 바꾸면 시작 시각을 지키면서 체류 시간이 장소를 따라간다', () => {
    const legs = build();
    const [toA, aToB, bToC, cToEnd] = legs;

    const next = rechainLegs([toA, bToC, aToB, cToEnd], legs);

    expect(next.map((leg) => leg.to)).toEqual(['A', 'C', 'B', '숙소']);
    expect(next.map((leg) => leg.departStayMinutes)).toEqual([0, 45, 30, 90]);
    expect(next[0].startTime).toBe('9:00');
    expectChained(next);
  });

  it('원본이 없으면 남은 구간에서 시작 시각을 읽는다', () => {
    const legs = build();
    const remaining = legs.filter((leg) => leg.id !== '제주국제공항→A');

    const next = rechainLegs(remaining);

    // A→B 구간의 출발 시각에서 A 체류 시간을 뺀 시각이 하루의 시작이 된다
    expect(toMinutes(next[0].startTime)).toBe(
      toMinutes(remaining[0].startTime),
    );
  });
});

describe('insertPlacesBeforeEnd', () => {
  it('마지막 도착지 바로 앞에 장소를 끼워 넣는다', () => {
    const legs = buildDayReview(
      [place('A', 60)],
      AIRPORT,
      LODGING,
      'manual',
    ).legs;

    const next = insertPlacesBeforeEnd(legs, [place('B', 90), place('C', 30)]);

    expect(next.map((leg) => [leg.from, leg.to])).toEqual([
      ['제주국제공항', 'A'],
      ['A', 'B'],
      ['B', 'C'],
      ['C', '숙소'],
    ]);
    expect(next.map((leg) => leg.departStayMinutes)).toEqual([0, 60, 90, 30]);
    expect(next[0].startTime).toBe('9:00');
    expectChained(next);
  });

  it('넣을 장소가 없거나 구간이 없으면 그대로 돌려준다', () => {
    const legs = buildDayReview([place('A')], AIRPORT, LODGING, 'ai').legs;
    expect(insertPlacesBeforeEnd(legs, [])).toBe(legs);
    expect(insertPlacesBeforeEnd([], [place('B')])).toEqual([]);
  });
});

describe('recheckReview', () => {
  it('구간을 다시 잇고 dirty 를 내리며 총평을 되돌린다', () => {
    const review = buildDayReview([place('A')], AIRPORT, LODGING, 'ai');
    const dirty: DayReview = { ...review, dirty: true, summary: '수정됨' };

    const next = recheckReview(dirty);

    expect(next.dirty).toBe(false);
    expect(next.summary).toBe(review.summary);
    expect(next.legs).toEqual(review.legs);
  });
});

describe('activeReview', () => {
  const review = (confirmed: boolean): DayReview => ({
    ...buildDayReview([], AIRPORT, LODGING, 'ai'),
    confirmed,
  });

  it('확정한 Day 를 우선하고, 없으면 첫 Day 를 쓴다', () => {
    const first = review(false);
    const second = review(true);
    expect(activeReview({ 1: first, 2: second })).toBe(second);
    expect(activeReview({ 1: first, 2: review(false) })).toBe(first);
  });

  it('검토 결과가 없으면 null 이다', () => {
    expect(activeReview({})).toBeNull();
  });
});

describe('buildFillSuggestions', () => {
  const leg = buildDayReview([place('A')], AIRPORT, LODGING, 'ai').legs[0];

  it('구간 출발 시각부터 시작하는 후보 3개를 만든다', () => {
    const suggestions = buildFillSuggestions(leg);

    expect(suggestions).toHaveLength(3);
    expect(new Set(suggestions.map((item) => item.id)).size).toBe(3);
    expect(suggestions[0].startTime).toBe(leg.startTime);
    suggestions.forEach((item) => {
      expect(item.id.startsWith(leg.id)).toBe(true);
      expect(toMinutes(item.endTime)).toBeGreaterThan(
        toMinutes(item.startTime),
      );
    });
  });

  it('같은 구간이면 같은 후보를 낸다', () => {
    expect(buildFillSuggestions(leg)).toEqual(buildFillSuggestions(leg));
  });
});

describe('buildAlternatives', () => {
  const leg = buildDayReview([place('A')], AIRPORT, LODGING, 'ai').legs[0];

  it('버스 대안과 택시 대안을 하나씩 낸다', () => {
    const [bus, taxi] = buildAlternatives(leg);

    expect(bus.bus).not.toBeNull();
    expect(taxi.bus).toBeNull();
    expect(bus.from).toBe(`${leg.from} 정류장`);
    expect(bus.to).toBe(`${leg.to} 정류장`);
    expect(taxi.to).toBe(leg.to);
    expect(taxi.cost).toBeGreaterThan(bus.cost);
  });

  it('출발 시각이 자정 직후여도 시각 표기가 깨지지 않는다', () => {
    const early: RouteLeg = { ...leg, startTime: '0:03' };

    buildAlternatives(early).forEach((alternative) => {
      expect(alternative.startTime).toMatch(/^\d{1,2}:\d{2}$/);
      expect(alternative.endTime).toMatch(/^\d{1,2}:\d{2}$/);
    });
  });
});
