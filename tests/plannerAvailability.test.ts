import { useScheduleStore } from '@/store/useScheduleStore';
import {
  buildDayReview,
  recheckReview,
  buildAlternatives,
  buildFillSuggestions,
} from '@/utils/schedule';
import type { DayReview, RouteLeg } from '@/store/useScheduleStore';

test('서버 없는 생성은 시간과 요금을 만들지 않는다', () => {
  const point = { name: '계획 장소', time: '09:00', coord: null };
  expect(() => buildDayReview([], point, point, 'ai')).toThrow('지원하지');
});

test('서버 없는 재평가·대체 경로·빈시간 추천은 성공하지 않는다', () => {
  const review: DayReview = {
    mode: 'ai',
    summary: '',
    legs: [],
    dirty: true,
    confirmed: false,
  };
  expect(() => recheckReview(review)).toThrow('지원하지');
  expect(buildAlternatives({} as RouteLeg)).toEqual([]);
  expect(buildFillSuggestions({} as RouteLeg)).toEqual([]);
});

test('로컬 확정은 기존 후보를 적용 상태로 바꾸지 않는다', () => {
  const review: DayReview = {
    mode: 'ai',
    summary: '',
    legs: [],
    dirty: false,
    confirmed: false,
  };
  useScheduleStore.setState({ reviews: { 1: review } });
  expect(() => useScheduleStore.getState().confirmDay(1)).toThrow('지원하지');
  expect(useScheduleStore.getState().reviews[1].confirmed).toBe(false);
});
