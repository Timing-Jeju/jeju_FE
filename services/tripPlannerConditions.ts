import type { PlannerConditions, Trip } from '@/services/api/trips';
import type { TripConditions } from '@/store/useTripStore';

const STYLE_CODES: Record<string, PlannerConditions['styleCodes'][number]> = {
  맛집투어: 'restaurant',
  카페투어: 'cafe',
  액티비티: 'leisure',
  '예술/전시': 'cultural_facility',
  '힐링/휴식': 'relaxed',
  '핫플/트렌디': 'trendy',
  '로컬/현지': 'local',
};
const CANONICAL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const restorePlannerStyles = (codes: PlannerConditions['styleCodes']) =>
  Object.entries(STYLE_CODES)
    .filter(([, code]) => codes.includes(code))
    .map(([label]) => label);

/** 표시용 이름·주소·좌표를 제외하고 저장된 Day에 canonical 숙소만 연결한다. */
export const toPlannerConditions = (
  conditions: Pick<
    TripConditions,
    'lodgingMode' | 'lodging' | 'dailyLodgings' | 'styles'
  >,
  trip: { days: Pick<Trip['days'][number], 'dayId' | 'dayNo' | 'date'>[] },
): PlannerConditions => ({
  dayAnchors: trip.days.flatMap((day) => {
    const selected =
      conditions.lodgingMode === 'daily'
        ? conditions.dailyLodgings[day.date]
        : conditions.lodgingMode === 'single'
          ? conditions.lodging
          : null;
    if (!selected) return [];
    if (
      !selected.placeId ||
      !CANONICAL_UUID.test(selected.placeId) ||
      !CANONICAL_UUID.test(day.dayId)
    ) {
      throw new Error('저장할 숙소와 여행 날짜를 다시 선택해 주세요.');
    }
    return [{ dayId: day.dayId, lodgingPlaceId: selected.placeId }];
  }),
  styleCodes: [
    ...new Set(
      conditions.styles.map((label) => {
        const code = STYLE_CODES[label];
        if (!code) throw new Error('여행 스타일을 다시 선택해 주세요.');
        return code;
      }),
    ),
  ],
});
