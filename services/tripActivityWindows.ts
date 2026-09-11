import type { Trip } from '@/services/api/trips';
import type { TripConditions } from '@/store/useTripStore';

const DAY_MILLISECONDS = 86_400_000;
const CANONICAL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const invalidDays = (): never => {
  throw new Error('저장된 여행 날짜를 다시 확인해 주세요.');
};

const dateTimestamp = (date: string | null): number => {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return invalidDays();
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date
  ) {
    return invalidDays();
  }
  return timestamp;
};

const clock = (value: string): string => {
  if (!/^(?:[0-9]|[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
    throw new Error('활동 시간을 시:분 형식으로 확인해 주세요.');
  }
  return value.padStart(5, '0');
};

/** 서버가 반환한 현재 Day 집합에 사용자 입력만 연결한다. 기본 시간은 만들지 않는다. */
export const toDayActivityWindows = (
  conditions: Pick<TripConditions, 'startDate' | 'endDate' | 'dayTimes'>,
  trip: Pick<Trip, 'startDate' | 'endDate' | 'days'>,
) => {
  const start = dateTimestamp(conditions.startDate);
  const end = dateTimestamp(conditions.endDate);
  const dayCount = (end - start) / DAY_MILLISECONDS + 1;
  if (
    dayCount < 1 ||
    dayCount > 30 ||
    trip.startDate !== conditions.startDate ||
    trip.endDate !== conditions.endDate ||
    trip.days.length !== dayCount ||
    new Set(trip.days.map((day) => day.dayId)).size !== dayCount
  ) {
    return invalidDays();
  }
  const days = [...trip.days].sort((left, right) => left.dayNo - right.dayNo);
  return {
    days: days.map((day, index) => {
      const expectedDate = new Date(start + index * DAY_MILLISECONDS)
        .toISOString()
        .slice(0, 10);
      if (
        day.dayNo !== index + 1 ||
        day.date !== expectedDate ||
        !CANONICAL_UUID.test(day.dayId)
      ) {
        return invalidDays();
      }
      const input = conditions.dayTimes[day.date];
      if (!input) {
        throw new Error('모든 날짜의 활동 시간을 입력해 주세요.');
      }
      const startTime = clock(input.start);
      const endTime = clock(input.end);
      if (startTime >= endTime) {
        throw new Error('활동 종료 시간은 시작 시간보다 늦어야 해요.');
      }
      return { dayId: day.dayId, startTime, endTime };
    }),
  };
};
