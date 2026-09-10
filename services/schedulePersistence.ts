import {
  createScheduleItem,
  deleteScheduleItem,
  moveScheduleItem,
  reorderSchedule,
  updateScheduleItem,
  type ScheduleItemPatchRequest,
} from '@/services/api/scheduleItems';
import { fetchSchedule, type TripSchedule } from '@/services/api/schedule';
import { createIdempotencyKey } from '@/services/api/idempotency';
import { hasCode, isApiError } from '@/services/api/problem';
import { fetchTrip } from '@/services/api/trips';
import { useScheduleStore, type SchedulePlace } from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';
import { useUserStore } from '@/store/useUserStore';

const STRONG_TRIP_ETAG = /^"[A-Za-z0-9._:-]{1,128}"$/;
const TERMINAL_STATUSES = new Set(['completed', 'skipped', 'missed']);

const CATEGORY_BY_TYPE: Record<
  NonNullable<SchedulePlace['itemType']>,
  string
> = {
  place_visit: '장소',
  meal: '식사',
  accommodation: '숙소',
  arrival: '도착',
  departure: '출발',
  free_time: '자유시간',
  custom: '일정',
};

export class SchedulePersistenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchedulePersistenceValidationError';
  }
}

export class ScheduleSessionChangedError extends Error {
  constructor() {
    super('로그인 사용자가 변경되어 이전 일정 요청 결과를 적용하지 않았어요.');
    this.name = 'ScheduleSessionChangedError';
  }
}

/** 서버 순서와 opaque item ID를 그대로 유지하며 기존 카드 모델로 옮긴다. */
export const scheduleToPlaces = (
  schedule: TripSchedule,
  previous: Record<number, SchedulePlace[]> = {},
): Record<number, SchedulePlace[]> =>
  Object.fromEntries(
    schedule.days.map((day) => [
      day.dayNo,
      [...day.items]
        .sort((left, right) => left.sequenceNo - right.sequenceNo)
        .map((item) => {
          const known = (previous[day.dayNo] ?? []).find(
            (place) => place.placeId && place.placeId === item.placeId,
          );
          return {
            itemId: item.itemId,
            placeId: item.placeId,
            itemType: item.itemType,
            name: item.title,
            category: known?.category ?? CATEGORY_BY_TYPE[item.itemType],
            address: known?.address ?? '',
            visitType: known?.visitType ?? null,
            stayMinutes: item.stayMinutes,
            coord: known?.coord ?? null,
            plannedStartAt: item.plannedStartAt,
            plannedEndAt: item.plannedEndAt,
            bufferAfterMinutes: item.bufferAfterMinutes,
            required: item.required,
            memo: item.memo,
            progressStatus: item.progress?.status,
          } satisfies SchedulePlace;
        }),
    ]),
  );

interface Scope {
  userId: string | null;
}

const captureScope = (): Scope => ({ userId: useUserStore.getState().userId });
const assertScope = (scope: Scope) => {
  if (scope.userId !== useUserStore.getState().userId) {
    throw new ScheduleSessionChangedError();
  }
};

const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : '일정 요청을 완료하지 못했습니다. 다시 시도해 주세요.';

const requireContext = () => {
  const trip = useTripStore.getState();
  const schedule = useScheduleStore.getState();
  if (!trip.tripId || !trip.etag || !STRONG_TRIP_ETAG.test(trip.etag)) {
    throw new SchedulePersistenceValidationError(
      '최신 여행 정보를 다시 불러와 주세요.',
    );
  }
  if (!schedule.activeVersionId) {
    throw new SchedulePersistenceValidationError(
      '활성 일정을 먼저 불러와 주세요.',
    );
  }
  return {
    tripId: trip.tripId,
    locks: {
      etag: trip.etag,
      expectedActiveScheduleVersionId: schedule.activeVersionId,
    },
  };
};

const findItem = (itemId: string) => {
  for (const [day, items] of Object.entries(
    useScheduleStore.getState().places,
  )) {
    const item = items.find((candidate) => candidate.itemId === itemId);
    if (item) return { dayNo: Number(day), item };
  }
  throw new SchedulePersistenceValidationError(
    '편집할 일정 항목을 다시 불러와 주세요.',
  );
};

const assertEditable = (itemId: string) => {
  const found = findItem(itemId);
  if (
    found.item.progressStatus &&
    TERMINAL_STATUSES.has(found.item.progressStatus)
  ) {
    throw new SchedulePersistenceValidationError(
      '완료된 일정 항목은 변경할 수 없어요.',
    );
  }
  return found;
};

const setSchedule = (value: TripSchedule, scope: Scope) => {
  assertScope(scope);
  useScheduleStore.setState((state) => ({
    places: scheduleToPlaces(value, state.places),
    activeVersionId: value.scheduleVersion.scheduleVersionId,
    versionNo: value.scheduleVersion.versionNo,
    loading: false,
    mutating: false,
    error: null,
  }));
};

const refreshSchedule = async (tripId: string, scope: Scope) => {
  const value = await fetchSchedule(tripId);
  setSchedule(value, scope);
  return value;
};

const refreshConflict = async (
  error: unknown,
  tripId: string,
  scope: Scope,
) => {
  if (
    !hasCode(
      error,
      'ACTIVE_SCHEDULE_VERSION_CONFLICT',
      'TRIP_VERSION_CONFLICT',
      'PRECONDITION_FAILED',
      'CONFLICT',
    )
  ) {
    return;
  }
  try {
    const latestTrip = await fetchTrip(tripId);
    assertScope(scope);
    if (!latestTrip.etag || !STRONG_TRIP_ETAG.test(latestTrip.etag)) return;
    useTripStore.setState({
      etag: latestTrip.etag,
      serverTrip: latestTrip.data,
    });
    await refreshSchedule(tripId, scope);
  } catch {
    // 원래 mutation 오류를 유지한다. 사용자가 명시적으로 다시 조회할 수 있다.
  }
};

const plannedStartForAppend = (dayNo: number) => {
  const places = useScheduleStore.getState().places[dayNo] ?? [];
  const last = places.at(-1);
  if (last?.plannedEndAt) {
    const end = Date.parse(last.plannedEndAt);
    if (Number.isFinite(end)) {
      const jeju = new Date(
        end + (last.bufferAfterMinutes ?? 0) * 60_000 + 9 * 60 * 60_000,
      );
      return `${jeju.toISOString().slice(0, 19)}+09:00`;
    }
  }
  const trip = useTripStore.getState();
  const date = trip.serverTrip?.days.find((day) => day.dayNo === dayNo)?.date;
  const time = date ? trip.dayTimes[date]?.start : undefined;
  if (!date || !time || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new SchedulePersistenceValidationError(
      '해당 날짜의 활동 시작 시간을 먼저 설정해 주세요.',
    );
  }
  return `${date}T${time}:00+09:00`;
};

export function createSchedulePersistenceActions() {
  const pendingKeys = new Map<string, string>();
  const hydrateSchedule = async () => {
    const scope = captureScope();
    const tripId = useTripStore.getState().tripId;
    if (!tripId) {
      throw new SchedulePersistenceValidationError(
        '저장된 여행을 먼저 선택해 주세요.',
      );
    }
    useScheduleStore.setState({ loading: true, error: null });
    try {
      return await refreshSchedule(tripId, scope);
    } catch (error) {
      assertScope(scope);
      useScheduleStore.setState({ loading: false, error: messageOf(error) });
      throw error;
    }
  };

  const mutate = async (
    fingerprint: string,
    operation: (
      tripId: string,
      locks: ReturnType<typeof requireContext>['locks'],
      key: string,
    ) => Promise<{
      data: { activeScheduleVersionId: string; etag: string };
      etag: string | null;
    }>,
  ) => {
    const scope = captureScope();
    const { tripId, locks } = requireContext();
    useScheduleStore.setState({ mutating: true, error: null });
    try {
      const key = pendingKeys.get(fingerprint) ?? createIdempotencyKey();
      pendingKeys.set(fingerprint, key);
      const response = await operation(tripId, locks, key);
      assertScope(scope);
      if (
        response.etag &&
        response.data.etag &&
        response.etag !== response.data.etag
      ) {
        throw new SchedulePersistenceValidationError(
          '일정 저장 응답의 ETag가 일치하지 않아요.',
        );
      }
      const nextEtag = response.etag ?? response.data.etag;
      if (!STRONG_TRIP_ETAG.test(nextEtag)) {
        throw new SchedulePersistenceValidationError(
          '일정 저장 응답의 버전 정보를 확인할 수 없어요.',
        );
      }
      useTripStore.setState({ etag: nextEtag });
      useTripStore.setState((state) => ({
        serverTrip: state.serverTrip
          ? {
              ...state.serverTrip,
              activeScheduleVersionId: response.data.activeScheduleVersionId,
            }
          : null,
      }));
      useScheduleStore.setState({
        activeVersionId: response.data.activeScheduleVersionId,
      });
      const refreshed = await refreshSchedule(tripId, scope);
      pendingKeys.delete(fingerprint);
      return refreshed;
    } catch (error) {
      assertScope(scope);
      if (isApiError(error) && error.status > 0)
        pendingKeys.delete(fingerprint);
      await refreshConflict(error, tripId, scope);
      assertScope(scope);
      useScheduleStore.setState({ mutating: false, error: messageOf(error) });
      throw error;
    }
  };

  const createPlace = async (dayNo: number, place: SchedulePlace) => {
    if (!place.placeId) {
      throw new SchedulePersistenceValidationError(
        '추가할 장소를 다시 선택해 주세요.',
      );
    }
    const sequenceNo =
      (useScheduleStore.getState().places[dayNo]?.length ?? 0) + 1;
    const plannedStartAt = plannedStartForAppend(dayNo);
    return await mutate(
      `create:${dayNo}:${place.placeId}:${sequenceNo}`,
      (tripId, locks, key) =>
        createScheduleItem(
          tripId,
          {
            dayNo,
            sequenceNo,
            itemType: 'place_visit',
            placeId: place.placeId!,
            plannedStartAt,
            stayMinutes: place.stayMinutes,
            bufferAfterMinutes: 0,
            required: place.visitType === '필수방문',
            memo: null,
          },
          locks,
          key,
        ),
    );
  };

  const updateItem = async (itemId: string, body: ScheduleItemPatchRequest) => {
    assertEditable(itemId);
    return await mutate(
      `update:${itemId}:${JSON.stringify(body)}`,
      (tripId, locks, key) =>
        updateScheduleItem(tripId, itemId, body, locks, key),
    );
  };

  const deleteItem = async (itemId: string) => {
    assertEditable(itemId);
    return await mutate(`delete:${itemId}`, (tripId, locks, key) =>
      deleteScheduleItem(tripId, itemId, locks, key),
    );
  };

  const moveItem = async (
    itemId: string,
    targetDayNo: number,
    targetSequenceNo: number,
  ) => {
    const source = assertEditable(itemId);
    const targetExists = useTripStore
      .getState()
      .serverTrip?.days.some((day) => day.dayNo === targetDayNo);
    if (targetDayNo < 1 || targetSequenceNo < 1) {
      throw new SchedulePersistenceValidationError(
        '이동할 날짜와 순서를 확인해 주세요.',
      );
    }
    if (!targetExists) {
      throw new SchedulePersistenceValidationError(
        '이동할 날짜를 다시 선택해 주세요.',
      );
    }
    const targetCount =
      useScheduleStore.getState().places[targetDayNo]?.length ?? 0;
    const maxSequence =
      source.dayNo === targetDayNo ? targetCount : targetCount + 1;
    if (targetSequenceNo > maxSequence) {
      throw new SchedulePersistenceValidationError(
        '이동할 순서를 확인해 주세요.',
      );
    }
    return await mutate(
      `move:${itemId}:${targetDayNo}:${targetSequenceNo}`,
      (tripId, locks, key) =>
        moveScheduleItem(
          tripId,
          itemId,
          { targetDayNo, targetSequenceNo },
          locks,
          key,
        ),
    );
  };

  const reorderDay = async (dayNo: number, orderedItemIds: string[]) => {
    const current = useScheduleStore.getState().places[dayNo] ?? [];
    const expected = current.map((item) => item.itemId);
    if (
      current.length === 0 ||
      expected.some((id) => !id) ||
      orderedItemIds.length !== expected.length ||
      new Set(orderedItemIds).size !== orderedItemIds.length ||
      expected.some((id) => !orderedItemIds.includes(id!))
    ) {
      throw new SchedulePersistenceValidationError(
        '일정 항목을 빠짐없이 한 번씩 정렬해 주세요.',
      );
    }
    orderedItemIds.forEach(assertEditable);
    return await mutate(
      `reorder:${dayNo}:${orderedItemIds.join(',')}`,
      (tripId, locks, key) =>
        reorderSchedule(tripId, [{ dayNo, orderedItemIds }], locks, key),
    );
  };

  return {
    hydrateSchedule,
    createPlace,
    updateItem,
    deleteItem,
    moveItem,
    reorderDay,
  };
}
