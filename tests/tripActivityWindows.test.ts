import { toDayActivityWindows } from '@/services/tripActivityWindows';

const firstId = '44000000-0000-4000-8000-000000000041';
const secondId = '44000000-0000-4000-8000-000000000042';
const root = {
  startDate: '2026-09-10',
  endDate: '2026-09-11',
  days: [
    {
      dayId: secondId,
      dayNo: 2,
      date: '2026-09-11',
      activityStartTime: null,
      activityEndTime: null,
    },
    {
      dayId: firstId,
      dayNo: 1,
      date: '2026-09-10',
      activityStartTime: null,
      activityEndTime: null,
    },
  ],
};
const conditions = {
  startDate: root.startDate,
  endDate: root.endDate,
  dayTimes: {
    '2026-09-10': { start: '9:00', end: '18:30' },
    '2026-09-11': { start: '10:15', end: '17:00' },
  },
};

test('서버의 실제 Day ID에 날짜별 입력을 연결하고 HH:mm으로 정규화한다', () => {
  expect(toDayActivityWindows(conditions, root)).toEqual({
    days: [
      { dayId: firstId, startTime: '09:00', endTime: '18:30' },
      { dayId: secondId, startTime: '10:15', endTime: '17:00' },
    ],
  });
});

test('입력하지 않은 날짜를 임의 기본 시간으로 채우지 않는다', () => {
  expect(() =>
    toDayActivityWindows({ ...conditions, dayTimes: {} }, root),
  ).toThrow('모든 날짜의 활동 시간을 입력해 주세요.');
});

test.each([
  { start: '24:00', end: '25:00' },
  { start: '09:60', end: '18:00' },
  { start: '09:00:00', end: '18:00' },
  { start: '18:00', end: '09:00' },
  { start: '09:00', end: '09:00' },
])('잘못된 시각 또는 시작 이후가 아닌 종료 시각을 거부한다: %j', (invalid) => {
  expect(() =>
    toDayActivityWindows(
      {
        ...conditions,
        dayTimes: { ...conditions.dayTimes, '2026-09-10': invalid },
      },
      root,
    ),
  ).toThrow();
});

test.each([
  { ...root, startDate: '2026-09-09' },
  { ...root, days: [root.days[0]] },
  { ...root, days: [root.days[0], root.days[0]] },
  { ...root, days: [{ ...root.days[0], dayId: 'local-day-1' }, root.days[1]] },
])(
  '저장된 여행 기간과 Day 집합이 입력과 다르면 요청을 만들지 않는다',
  (invalid) => {
    expect(() => toDayActivityWindows(conditions, invalid)).toThrow(
      '저장된 여행 날짜를 다시 확인해 주세요.',
    );
  },
);
