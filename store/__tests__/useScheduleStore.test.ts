import {
  dayOrdinal,
  useScheduleStore,
  worstStatus,
  type RouteLeg,
  type SchedulePlace,
} from '@/store/useScheduleStore';
import { buildDayReview, type DayEndpoint } from '@/utils/schedule';

const place = (name: string, stayMinutes = 60): SchedulePlace => ({
  name,
  category: '관광지',
  address: '',
  visitType: '선택방문',
  stayMinutes,
  coord: null,
});

const AIRPORT: DayEndpoint = {
  name: '제주국제공항',
  time: '9:00',
  coord: null,
};
const LODGING: DayEndpoint = { name: '숙소', time: '21:00', coord: null };

const store = () => useScheduleStore.getState();

/** Day 1 에 장소를 담고 검토 결과까지 만들어 둔다 */
const seedReview = (places: SchedulePlace[]) => {
  store().addPlaces(1, places);
  store().setReview(1, buildDayReview(places, AIRPORT, LODGING, 'manual'));
  return store().reviews[1];
};

beforeEach(() => {
  useScheduleStore.setState({ places: {}, reviews: {} });
});

describe('장소 목록', () => {
  it('addPlaces 는 이름이 같은 장소를 건너뛰고 뒤에 이어 붙인다', () => {
    store().addPlaces(1, [place('A'), place('B')]);
    store().addPlaces(1, [place('B', 30), place('C')]);

    expect(store().places[1].map((item) => item.name)).toEqual(['A', 'B', 'C']);
    // 먼저 담긴 B 의 체류 시간이 유지된다
    expect(store().places[1][1].stayMinutes).toBe(60);
  });

  it('removePlace 는 해당 Day 에서만 지운다', () => {
    store().addPlaces(1, [place('A'), place('B')]);
    store().addPlaces(2, [place('A')]);

    store().removePlace(1, 'A');

    expect(store().places[1].map((item) => item.name)).toEqual(['B']);
    expect(store().places[2].map((item) => item.name)).toEqual(['A']);
  });

  it('reorderPlaces 는 넘긴 이름 순서대로 다시 배열한다', () => {
    store().addPlaces(1, [place('A'), place('B'), place('C'), place('D')]);

    store().reorderPlaces(1, ['C', 'A', 'D', 'B']);

    expect(store().places[1].map((item) => item.name)).toEqual([
      'C',
      'A',
      'D',
      'B',
    ]);
  });

  it('reorderPlaces 는 모르는 이름과 중복은 무시하고 빠진 장소는 뒤에 남긴다', () => {
    store().addPlaces(1, [place('A'), place('B'), place('C')]);

    store().reorderPlaces(1, ['C', '없는곳', 'C']);

    expect(store().places[1].map((item) => item.name)).toEqual(['C', 'A', 'B']);
  });

  it('updateStayMinutes 는 이름이 같은 장소의 체류 시간만 바꾼다', () => {
    store().addPlaces(1, [place('A'), place('B')]);

    store().updateStayMinutes(1, 'A', 120);

    expect(store().places[1].map((item) => item.stayMinutes)).toEqual([
      120, 60,
    ]);
  });
});

describe('검토 결과', () => {
  it('검토 결과가 없는 Day 는 setLegs · removeLegs · recheck · confirmDay 가 아무 일도 하지 않는다', () => {
    const before = store();
    store().setLegs(3, []);
    store().removeLegs(3, ['x']);
    store().recheck(3);
    store().confirmDay(3);
    expect(store().reviews).toBe(before.reviews);
  });

  it('setLegs 는 구간을 바꾸면 dirty 를 올리고 확정을 풀며, 빠진 장소를 목록에서 지운다', () => {
    const review = seedReview([place('A'), place('B')]);
    store().confirmDay(1);

    const withoutB: RouteLeg[] = review.legs.filter(
      (leg) => leg.from !== 'B' && leg.to !== 'B',
    );
    store().setLegs(1, withoutB);

    expect(store().reviews[1]).toMatchObject({ dirty: true, confirmed: false });
    expect(store().reviews[1].legs).toBe(withoutB);
    expect(store().places[1].map((item) => item.name)).toEqual(['A']);
  });

  it('removeLegs 는 남은 구간을 다시 이으면서 각 장소의 체류 시간을 지킨다', () => {
    const review = seedReview([place('A', 45), place('B', 90), place('C', 30)]);
    const toDelete = review.legs.find((leg) => leg.id === 'A→B')!;

    store().removeLegs(1, [toDelete.id]);

    const { legs } = store().reviews[1];
    expect(legs.map((leg) => [leg.from, leg.to])).toEqual([
      ['제주국제공항', 'A'],
      ['A', 'C'],
      ['C', '숙소'],
    ]);
    expect(legs[1].departStayMinutes).toBe(45);
    expect(legs[0].startTime).toBe('9:00');
    expect(store().places[1].map((item) => item.name)).toEqual(['A', 'C']);
    expect(store().reviews[1].dirty).toBe(true);
  });

  it('recheck 는 dirty 를 내리고 확정 상태는 건드리지 않는다', () => {
    const review = seedReview([place('A')]);
    store().setLegs(1, review.legs);
    expect(store().reviews[1].dirty).toBe(true);

    store().recheck(1);

    expect(store().reviews[1].dirty).toBe(false);
    expect(store().reviews[1].legs).toEqual(review.legs);
  });

  it('confirmDay 는 해당 Day 만 확정한다', () => {
    seedReview([place('A')]);
    store().setReview(2, buildDayReview([], AIRPORT, LODGING, 'ai'));

    store().confirmDay(1);

    expect(store().reviews[1].confirmed).toBe(true);
    expect(store().reviews[2].confirmed).toBe(false);
  });
});

describe('표시 도우미', () => {
  const leg = (status: RouteLeg['status']): RouteLeg => ({
    ...buildDayReview([], AIRPORT, LODGING, 'ai').legs[0],
    status,
  });

  it('worstStatus 는 가장 나쁜 구간을 따른다', () => {
    expect(worstStatus([])).toBe('positive');
    expect(worstStatus([leg('positive'), leg('cautionary')])).toBe(
      'cautionary',
    );
    expect(
      worstStatus([leg('cautionary'), leg('warning'), leg('positive')]),
    ).toBe('warning');
  });

  it('dayOrdinal 은 넷째까지는 한글 서수, 그 뒤는 N번째다', () => {
    expect(dayOrdinal(1)).toBe('첫째');
    expect(dayOrdinal(4)).toBe('넷째');
    expect(dayOrdinal(5)).toBe('5번째');
  });
});
