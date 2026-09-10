import {
  isLodgingComplete,
  lodgingOf,
  useTripStore,
  type TripConditions,
  type TripLodging,
} from '@/store/useTripStore';

const hotel: TripLodging = { name: '호텔', address: '', coord: null };
const pension: TripLodging = { name: '펜션', address: '', coord: null };
const dates = ['2026-06-12', '2026-06-13'];

describe('lodgingOf', () => {
  it('단일 숙소면 날짜와 무관하게 그 숙소다', () => {
    const conditions = {
      lodgingMode: 'single' as const,
      lodging: hotel,
      dailyLodgings: {},
    };
    expect(lodgingOf(conditions, '2026-06-12')).toBe(hotel);
    expect(lodgingOf(conditions, undefined)).toBe(hotel);
  });

  it('일자별 숙소면 그 날의 숙소를 돌려주고 없으면 null 이다', () => {
    const conditions = {
      lodgingMode: 'daily' as const,
      lodging: hotel,
      dailyLodgings: { '2026-06-12': pension },
    };
    expect(lodgingOf(conditions, '2026-06-12')).toBe(pension);
    expect(lodgingOf(conditions, '2026-06-13')).toBeNull();
    expect(lodgingOf(conditions, undefined)).toBeNull();
  });

  it('숙소 형태를 고르기 전에는 단일 숙소 값을 따른다', () => {
    expect(
      lodgingOf(
        { lodgingMode: null, lodging: null, dailyLodgings: {} },
        dates[0],
      ),
    ).toBeNull();
  });
});

describe('isLodgingComplete', () => {
  it('단일 숙소는 한 곳만 있으면 된다', () => {
    expect(
      isLodgingComplete(
        { lodgingMode: 'single', lodging: hotel, dailyLodgings: {} },
        dates,
      ),
    ).toBe(true);
    expect(
      isLodgingComplete(
        { lodgingMode: 'single', lodging: null, dailyLodgings: {} },
        dates,
      ),
    ).toBe(false);
  });

  it('일자별 숙소는 모든 날이 채워져야 한다', () => {
    const partial = {
      lodgingMode: 'daily' as const,
      lodging: null,
      dailyLodgings: { [dates[0]]: hotel },
    };
    const full = {
      ...partial,
      dailyLodgings: { [dates[0]]: hotel, [dates[1]]: pension },
    };

    expect(isLodgingComplete(partial, dates)).toBe(false);
    expect(isLodgingComplete(full, dates)).toBe(true);
    // 날짜가 정해지지 않았으면 채웠다고 볼 수 없다
    expect(isLodgingComplete(full, [])).toBe(false);
  });

  it('형태를 고르지 않았으면 미완성이다', () => {
    expect(
      isLodgingComplete(
        { lodgingMode: null, lodging: hotel, dailyLodgings: {} },
        dates,
      ),
    ).toBe(false);
  });
});

describe('useTripStore', () => {
  it('saveConditions 는 조건을 통째로 반영하고 saved 를 올린다', () => {
    const conditions: TripConditions = {
      startDate: dates[0],
      endDate: dates[1],
      arrivalTransport: '비행기',
      arrivalTime: '10:00',
      departureTransport: '선박',
      departureTime: '18:00',
      dayTimes: { [dates[0]]: { start: '9:00', end: '21:00' } },
      lodgingMode: 'single',
      lodging: hotel,
      dailyLodgings: {},
      styles: ['맛집투어'],
      transport: ['bus'],
    };

    expect(useTripStore.getState().saved).toBe(false);
    useTripStore.getState().saveConditions(conditions);

    expect(useTripStore.getState()).toMatchObject({
      ...conditions,
      saved: true,
    });
  });
});
