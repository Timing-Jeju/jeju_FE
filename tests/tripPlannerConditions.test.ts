import { toPlannerConditions } from '@/services/tripPlannerConditions';
import { hydrateTripConditions } from '@/services/tripHydration';
import type { TripConditions } from '@/store/useTripStore';

const placeId = '53000000-0000-4000-8000-000000000001';
const dayId = '53000000-0000-4000-8000-000000000002';
const conditions: TripConditions = {
  startDate: '2026-10-01',
  endDate: '2026-10-01',
  arrivalTransport: '비행기',
  departureTransport: '비행기',
  arrivalTime: '09:00',
  departureTime: '18:00',
  dayTimes: {},
  lodgingMode: 'single',
  dailyLodgings: {},
  lodging: {
    placeId,
    name: '원문 숙소 이름',
    address: '원문 주소',
    coord: { latitude: 33, longitude: 126 },
  },
  styles: [
    '맛집투어',
    '카페투어',
    '액티비티',
    '예술/전시',
    '힐링/휴식',
    '핫플/트렌디',
    '로컬/현지',
  ],
  transport: ['walk'],
};
const trip = { days: [{ dayId, dayNo: 1, date: '2026-10-01' }] };

test('숙소와 스타일은 서버 Day ID와 닫힌 코드로 변환하고 원문과 좌표를 보내지 않는다', () => {
  expect(toPlannerConditions(conditions, trip)).toEqual({
    dayAnchors: [{ dayId, lodgingPlaceId: placeId }],
    styleCodes: [
      'restaurant',
      'cafe',
      'leisure',
      'cultural_facility',
      'relaxed',
      'trendy',
      'local',
    ],
  });
});

test('미선택 숙소는 비우고 비정규 장소 ID는 서버 호출 전에 거부한다', () => {
  expect(
    toPlannerConditions(
      { ...conditions, lodgingMode: null, lodging: null },
      trip,
    ).dayAnchors,
  ).toEqual([]);
  expect(() =>
    toPlannerConditions(
      {
        ...conditions,
        lodging: { ...conditions.lodging!, placeId: 'search-result' },
      },
      trip,
    ),
  ).toThrow();
});

test('날짜별 숙소를 날짜에 맞는 서버 Day로 저장한다', () => {
  const other = '53000000-0000-4000-8000-000000000003';
  expect(
    toPlannerConditions(
      {
        ...conditions,
        lodgingMode: 'daily',
        dailyLodgings: {
          '2026-10-01': { ...conditions.lodging!, placeId: other },
        },
      },
      trip,
    ).dayAnchors,
  ).toEqual([{ dayId, lodgingPlaceId: other }]);
});

test('재조회는 planner 기준점과 스타일을 복원하고 이름이나 좌표를 만들지 않는다', () => {
  const restored = hydrateTripConditions({
    ...trip,
    days: [{ ...trip.days[0], activityStartTime: null, activityEndTime: null }],
    accommodations: [],
    transportEvents: { arrival: null, departure: null },
    plannerConditions: {
      dayAnchors: [{ dayId, lodgingPlaceId: placeId }],
      styleCodes: ['restaurant', 'relaxed'],
    },
  });
  expect(restored.lodging?.placeId).toBe(placeId);
  expect(restored.lodging?.coord).toBeNull();
  expect(restored.styles).toEqual(['맛집투어', '힐링/휴식']);
});

test('명시적으로 비운 planner 기준점은 과거 숙소 행을 다시 선택하지 않는다', () => {
  const accommodation = {
    accommodationId: '53000000-0000-4000-8000-000000000004',
    placeId,
    customName: null,
    name: '과거 숙소',
    checkInDate: '2026-10-01',
    checkOutDate: '2026-10-02',
    checkInTime: '16:00',
    checkOutTime: '10:00',
    sequenceNo: 1,
  };
  const restored = hydrateTripConditions({
    days: [{ ...trip.days[0], activityStartTime: null, activityEndTime: null }],
    accommodations: [accommodation],
    transportEvents: { arrival: null, departure: null },
    plannerConditions: { dayAnchors: [], styleCodes: [] },
  });
  expect(restored.lodgingMode).toBeNull();
  expect(restored.lodging).toBeNull();
  expect(restored.dailyLodgings).toEqual({});
  // 일반 숙소 기록은 삭제하지 않고 AI 입력 선택과 분리한다.
  expect(restored.accommodations[accommodation.accommodationId]).toEqual(
    accommodation,
  );
});
