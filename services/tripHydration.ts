import type { Trip } from '@/services/api/trips';
import { restorePlannerStyles } from '@/services/tripPlannerConditions';
import type {
  TripConditions,
  TripLodging,
  TripState,
} from '@/store/useTripStore';

const lodging = (item: Trip['accommodations'][number]): TripLodging => ({
  placeId: item.placeId,
  name: item.name,
  address: '',
  coord: null,
});

/** 서버가 제공한 값만 복원한다. 미입력 필드는 이전 여행 값 대신 빈 상태로 덮어쓴다. */
export const hydrateTripConditions = (
  trip: Pick<
    Trip,
    'days' | 'accommodations' | 'transportEvents' | 'plannerConditions'
  >,
): Pick<
  TripState,
  | 'dayTimes'
  | 'accommodations'
  | 'transportEvents'
  | 'arrivalTransport'
  | 'arrivalTime'
  | 'departureTransport'
  | 'departureTime'
  | 'lodgingMode'
  | 'lodging'
  | 'dailyLodgings'
  | 'styles'
> => {
  const dayTimes: TripConditions['dayTimes'] = {};
  for (const day of trip.days) {
    if (day.activityStartTime !== null && day.activityEndTime !== null) {
      dayTimes[day.date] = {
        start: day.activityStartTime,
        end: day.activityEndTime,
      };
    }
  }
  const { arrival, departure } = trip.transportEvents;
  const clock = (event: typeof arrival) =>
    event
      ? new Date(Date.parse(event.scheduledAt) + 9 * 60 * 60 * 1000)
          .toISOString()
          .slice(11, 16)
      : null;
  const kind = (event: typeof arrival): TripConditions['arrivalTransport'] =>
    event ? (event.transportType === 'flight' ? '비행기' : '선박') : null;
  const items = [...trip.accommodations].sort(
    (a, b) => a.sequenceNo - b.sequenceNo,
  );
  const dailyLodgings: TripConditions['dailyLodgings'] = {};
  if (items.length > 1) {
    for (const day of trip.days) {
      const item = items.find(
        (candidate) =>
          candidate.checkInDate <= day.date &&
          day.date < candidate.checkOutDate,
      );
      if (item) dailyLodgings[day.date] = lodging(item);
    }
  }
  let lodgingMode: TripConditions['lodgingMode'] =
    items.length === 0 ? null : items.length === 1 ? 'single' : 'daily';
  let singleLodging = items.length === 1 ? lodging(items[0]) : null;
  const anchors = trip.plannerConditions?.dayAnchors ?? [];
  // 명시적인 빈 planner 조건은 선택 해제다. 과거 숙소 행으로 되살리지 않는다.
  // plannerConditions 자체가 없는 구버전 응답에만 위 숙소 복원을 사용한다.
  if (trip.plannerConditions) {
    for (const date of Object.keys(dailyLodgings)) delete dailyLodgings[date];
    for (const day of trip.days) {
      const anchor = anchors.find((item) => item.dayId === day.dayId);
      if (!anchor) continue;
      const known = items.find(
        (item) => item.placeId === anchor.lodgingPlaceId,
      );
      dailyLodgings[day.date] = known
        ? lodging(known)
        : {
            placeId: anchor.lodgingPlaceId,
            name: '',
            address: '',
            coord: null,
          };
    }
    const selected = Object.values(dailyLodgings);
    const uniform =
      selected.length === trip.days.length &&
      selected.length > 0 &&
      selected.every((item) => item.placeId === selected[0].placeId);
    lodgingMode = selected.length === 0 ? null : uniform ? 'single' : 'daily';
    singleLodging = uniform ? selected[0] : null;
  }
  return {
    dayTimes,
    accommodations: Object.fromEntries(
      items.map((item) => [item.accommodationId, item]),
    ),
    transportEvents: {
      ...(arrival ? { arrival } : {}),
      ...(departure ? { departure } : {}),
    },
    arrivalTransport: kind(arrival),
    arrivalTime: clock(arrival),
    departureTransport: kind(departure),
    departureTime: clock(departure),
    lodgingMode,
    lodging: singleLodging,
    dailyLodgings,
    styles: restorePlannerStyles(trip.plannerConditions?.styleCodes ?? []),
  };
};
