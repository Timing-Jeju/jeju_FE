import {
  createScheduleItem,
  deleteScheduleItem,
  moveScheduleItem,
  reorderSchedule,
  updateScheduleItem,
  type ScheduleItemPatchRequest,
} from '@/services/api/scheduleItems';
import { fetchSchedule, type TripSchedule } from '@/services/api/schedule';
import {
  captureAuthScope,
  isCurrentAuthScope,
  type AuthScope,
} from '@/services/authScope';
import { createIdempotencyKey } from '@/services/api/idempotency';
import { hasCode, isApiError } from '@/services/api/problem';
import { fetchTrip } from '@/services/api/trips';
import {
  clearScheduleMutationJournal,
  loadScheduleMutationJournal,
  saveScheduleMutationJournal,
  type ScheduleMutationCompletion,
  type ScheduleMutationJournal,
  type ScheduleMutationLocks,
} from '@/services/scheduleMutationJournal';
import {
  useScheduleStore,
  type DayReview,
  type RouteLeg,
  type SchedulePlace,
} from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';

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

export class SchedulePendingMutationError extends Error {
  constructor() {
    super(
      '이전 일정 저장 결과가 불명확해요. 서버 일정을 확인하거나 보류 기록을 해제해 주세요.',
    );
    this.name = 'SchedulePendingMutationError';
  }
}

export const scheduleToPlaces = (
  schedule: TripSchedule,
  previous: Record<number, SchedulePlace[]> = {},
): Record<number, SchedulePlace[]> =>
  Object.fromEntries(
    schedule.days.map((day) => [
      day.dayNo,
      [...day.items]
        .sort((a, b) => a.sequenceNo - b.sequenceNo)
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

const timePart = (value: string) => value.slice(11, 16);
const formatDistance = (meters: number | null) =>
  meters === null
    ? '거리 정보 없음'
    : meters >= 1000
      ? `${(meters / 1000).toFixed(1)}km`
      : `${meters}m`;

/** 서버가 계산한 구간만 기존 검토/상세 화면 모델로 옮긴다. */
export const scheduleToReviews = (
  schedule: TripSchedule,
  places: Record<number, SchedulePlace[]>,
): Record<number, DayReview> =>
  Object.fromEntries(
    schedule.days.map((day) => {
      const byId = new Map(
        (places[day.dayNo] ?? []).map((item) => [item.itemId, item]),
      );
      const legs: RouteLeg[] = [...day.legs]
        .sort((a, b) => a.sequenceNo - b.sequenceNo)
        .map((leg) => {
          const from = byId.get(leg.fromItemId);
          const to = byId.get(leg.toItemId);
          return {
            id: leg.legId,
            from: from?.name ?? '출발지 정보 없음',
            to: to?.name ?? '도착지 정보 없음',
            fromCoord: from?.coord ?? null,
            toCoord: to?.coord ?? null,
            status: 'cautionary',
            startTime: timePart(leg.plannedDepartureAt),
            endTime: timePart(leg.plannedArrivalAt),
            cost: leg.estimatedFareKrw,
            distanceText: formatDistance(leg.distanceMeters),
            reason:
              leg.riskScore === null
                ? '위험도 정보 미제공'
                : `서버 위험도 점수 ${leg.riskScore}`,
            steps: [
              {
                kind: 'place',
                name: from?.name ?? '출발지 정보 없음',
                detail: `${leg.transportMode} · ${leg.durationMinutes}분`,
                buses: [],
                caution: false,
              },
              {
                kind: 'place',
                name: to?.name ?? '도착지 정보 없음',
                detail: null,
                buses: [],
                caution: false,
              },
            ],
            departStayMinutes: from?.stayMinutes ?? 0,
            slackMinutes: leg.bufferMinutes,
            buses: [],
          };
        });
      return [
        day.dayNo,
        {
          mode: 'manual',
          summary: `서버 일정 버전 ${schedule.scheduleVersion.versionNo}`,
          legs,
          dirty: schedule.scheduleVersion.feasibilityStale,
          confirmed: false,
          serverBacked: true,
        } satisfies DayReview,
      ];
    }),
  );

const assertScope = (scope: AuthScope) => {
  if (!isCurrentAuthScope(scope)) throw new ScheduleSessionChangedError();
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

let requestRevision = 0;
let mutationInFlight = false;

const setSchedule = (
  value: TripSchedule,
  scope: AuthScope,
  revision: number,
) => {
  assertScope(scope);
  if (revision !== requestRevision) return false;
  useScheduleStore.setState((state) => {
    const places = scheduleToPlaces(value, state.places);
    return {
      places,
      reviews: scheduleToReviews(value, places),
      activeVersionId: value.scheduleVersion.scheduleVersionId,
      versionNo: value.scheduleVersion.versionNo,
      loading: false,
      mutating: false,
      error: null,
    };
  });
  return true;
};

const refreshSchedule = async (
  tripId: string,
  scope: AuthScope,
  revision: number,
) => {
  const value = await fetchSchedule(tripId);
  setSchedule(value, scope, revision);
  return value;
};

const refreshConflict = async (
  error: unknown,
  tripId: string,
  scope: AuthScope,
  revision: number,
) => {
  if (
    !hasCode(
      error,
      'ACTIVE_SCHEDULE_VERSION_CONFLICT',
      'TRIP_VERSION_CONFLICT',
      'PRECONDITION_FAILED',
      'CONFLICT',
    )
  )
    return;
  try {
    const latestTrip = await fetchTrip(tripId);
    assertScope(scope);
    if (!latestTrip.etag || !STRONG_TRIP_ETAG.test(latestTrip.etag)) return;
    useTripStore.setState({
      etag: latestTrip.etag,
      serverTrip: latestTrip.data,
    });
    await refreshSchedule(tripId, scope, revision);
  } catch {
    // 원래 mutation 오류를 유지한다.
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
  const match = time?.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!date || !match) {
    throw new SchedulePersistenceValidationError(
      '해당 날짜의 활동 시작 시간을 먼저 설정해 주세요.',
    );
  }
  return `${date}T${match[1].padStart(2, '0')}:${match[2]}:00+09:00`;
};

const allowedPatch = (
  body: ScheduleItemPatchRequest,
): ScheduleItemPatchRequest => {
  const next: ScheduleItemPatchRequest = {};
  const keys: (keyof ScheduleItemPatchRequest)[] = [
    'placeId',
    'accommodationId',
    'transportEventId',
    'title',
    'plannedStartAt',
    'stayMinutes',
    'bufferAfterMinutes',
    'required',
    'memo',
  ];
  keys.forEach((key) => {
    if (body[key] !== undefined) Object.assign(next, { [key]: body[key] });
  });
  return next;
};

type MutationResponse = {
  data: { activeScheduleVersionId: string; etag: string; versionNo: number };
  etag: string | null;
};

const applyCompletion = (
  completion: ScheduleMutationCompletion,
  scope: AuthScope,
) => {
  assertScope(scope);
  useTripStore.setState({ etag: completion.etag });
  useTripStore.setState((state) => ({
    serverTrip: state.serverTrip
      ? {
          ...state.serverTrip,
          activeScheduleVersionId: completion.activeScheduleVersionId,
        }
      : null,
  }));
  useScheduleStore.setState({
    activeVersionId: completion.activeScheduleVersionId,
    versionNo: completion.versionNo,
  });
};

const pendingCreateExists = (
  journal: ScheduleMutationJournal,
  schedule: TripSchedule,
) => {
  if (
    journal.operation !== 'create' ||
    !journal.request ||
    typeof journal.request !== 'object'
  ) {
    return false;
  }
  const request = journal.request as {
    dayNo?: number;
    sequenceNo?: number;
    itemType?: string;
    placeId?: string;
    plannedStartAt?: string;
    stayMinutes?: number;
  };
  return Boolean(
    schedule.days
      .find((day) => day.dayNo === request.dayNo)
      ?.items.some(
        (item) =>
          item.sequenceNo === request.sequenceNo &&
          item.itemType === request.itemType &&
          item.placeId === request.placeId &&
          item.plannedStartAt === request.plannedStartAt &&
          item.stayMinutes === request.stayMinutes,
      ),
  );
};

export function createSchedulePersistenceActions() {
  const hydrateSchedule = async () => {
    if (mutationInFlight) {
      throw new SchedulePersistenceValidationError(
        '일정을 저장 중이에요. 저장이 끝난 뒤 다시 불러와 주세요.',
      );
    }
    const scope = captureAuthScope();
    const tripId = useTripStore.getState().tripId;
    if (!tripId)
      throw new SchedulePersistenceValidationError(
        '저장된 여행을 먼저 선택해 주세요.',
      );
    const revision = ++requestRevision;
    useScheduleStore.setState({ loading: true, error: null });
    try {
      const journal = await loadScheduleMutationJournal();
      assertScope(scope);
      const completedHere =
        journal?.userId === scope.userId &&
        journal.tripId === tripId &&
        journal.completion
          ? journal
          : null;
      if (completedHere?.completion) {
        applyCompletion(completedHere.completion, scope);
      }
      const value = await refreshSchedule(tripId, scope, revision);
      if (completedHere) {
        await clearScheduleMutationJournal();
      } else if (
        journal?.userId === scope.userId &&
        journal.tripId === tripId &&
        !journal.completion &&
        pendingCreateExists(journal, value)
      ) {
        const latestTrip = await fetchTrip(tripId);
        assertScope(scope);
        if (!latestTrip.etag || !STRONG_TRIP_ETAG.test(latestTrip.etag)) {
          throw new SchedulePersistenceValidationError(
            '서버에서 확인한 일정의 여행 버전을 읽을 수 없어요.',
          );
        }
        useTripStore.setState({
          etag: latestTrip.etag,
          serverTrip: latestTrip.data,
        });
        await clearScheduleMutationJournal();
      }
      return value;
    } catch (error) {
      if (!isCurrentAuthScope(scope)) {
        useScheduleStore.setState({ loading: false });
        throw new ScheduleSessionChangedError();
      }
      if (revision === requestRevision) {
        useScheduleStore.setState({ loading: false, error: messageOf(error) });
      }
      throw error;
    }
  };

  const mutate = async <TRequest>(
    operationKind: ScheduleMutationJournal['operation'],
    fingerprint: string,
    request: TRequest,
    operation: (
      tripId: string,
      request: TRequest,
      locks: ScheduleMutationLocks,
      key: string,
    ) => Promise<MutationResponse>,
  ) => {
    if (mutationInFlight) {
      throw new SchedulePersistenceValidationError(
        '다른 일정을 저장 중이에요. 잠시 후 다시 시도해 주세요.',
      );
    }
    const context = requireContext();
    mutationInFlight = true;
    const revision = ++requestRevision;
    const scope = captureAuthScope();
    let journal: ScheduleMutationJournal | null = null;
    useScheduleStore.setState({ mutating: true, loading: false, error: null });
    try {
      const existing = await loadScheduleMutationJournal();
      assertScope(scope);
      if (
        existing &&
        (existing.userId !== scope.userId || existing.tripId !== context.tripId)
      ) {
        await clearScheduleMutationJournal();
      } else if (existing && existing.fingerprint !== fingerprint) {
        throw new SchedulePendingMutationError();
      } else if (existing) {
        journal = existing;
      }

      if (!journal) {
        journal = {
          version: 1,
          userId: scope.userId,
          tripId: context.tripId,
          fingerprint,
          operation: operationKind,
          idempotencyKey: createIdempotencyKey(),
          locks: context.locks,
          request,
          completion: null,
        };
        await saveScheduleMutationJournal(journal);
        assertScope(scope);
      }

      if (!journal.completion) {
        assertScope(scope);
        const response = await operation(
          journal.tripId,
          journal.request as TRequest,
          journal.locks,
          journal.idempotencyKey,
        );
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
        journal = {
          ...journal,
          completion: {
            activeScheduleVersionId: response.data.activeScheduleVersionId,
            etag: nextEtag,
            versionNo: response.data.versionNo,
          },
        };
        await saveScheduleMutationJournal(journal);
      }

      if (!journal.completion) {
        throw new SchedulePersistenceValidationError(
          '일정 저장 결과를 확인할 수 없어요.',
        );
      }
      applyCompletion(journal.completion, scope);
      try {
        const schedule = await refreshSchedule(journal.tripId, scope, revision);
        await clearScheduleMutationJournal();
        return { saved: true as const, refreshed: true as const, schedule };
      } catch (refreshError) {
        assertScope(scope);
        useScheduleStore.setState({
          mutating: false,
          error: `일정은 저장됐지만 최신 내용을 불러오지 못했어요. ${messageOf(refreshError)}`,
        });
        return {
          saved: true as const,
          refreshed: false as const,
          refreshError,
        };
      }
    } catch (error) {
      assertScope(scope);
      if (isApiError(error) && error.status > 0)
        await clearScheduleMutationJournal();
      await refreshConflict(error, context.tripId, scope, revision);
      assertScope(scope);
      useScheduleStore.setState({ mutating: false, error: messageOf(error) });
      throw error;
    } finally {
      mutationInFlight = false;
      useScheduleStore.setState({ mutating: false });
    }
  };

  const createPlace = async (dayNo: number, place: SchedulePlace) => {
    if (!place.placeId)
      throw new SchedulePersistenceValidationError(
        '추가할 장소를 다시 선택해 주세요.',
      );
    const request = {
      dayNo,
      sequenceNo: (useScheduleStore.getState().places[dayNo]?.length ?? 0) + 1,
      itemType: 'place_visit' as const,
      placeId: place.placeId,
      plannedStartAt: plannedStartForAppend(dayNo),
      stayMinutes: place.stayMinutes,
      bufferAfterMinutes: 0,
      required: place.visitType === '필수방문',
      memo: null,
    };
    return mutate(
      'create',
      `create:${JSON.stringify(request)}`,
      request,
      (tripId, body, locks, key) =>
        createScheduleItem(tripId, body, locks, key),
    );
  };

  const updateItem = async (itemId: string, body: ScheduleItemPatchRequest) => {
    assertEditable(itemId);
    const request = allowedPatch(body);
    return mutate(
      'update',
      `update:${itemId}:${JSON.stringify(request)}`,
      request,
      (tripId, patch, locks, key) =>
        updateScheduleItem(tripId, itemId, patch, locks, key),
    );
  };

  const deleteItem = async (itemId: string) => {
    assertEditable(itemId);
    return mutate(
      'delete',
      `delete:${itemId}`,
      {},
      (tripId, _body, locks, key) =>
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
    if (!targetExists)
      throw new SchedulePersistenceValidationError(
        '이동할 날짜를 다시 선택해 주세요.',
      );
    const targetCount =
      useScheduleStore.getState().places[targetDayNo]?.length ?? 0;
    const maxSequence =
      source.dayNo === targetDayNo ? targetCount : targetCount + 1;
    if (targetSequenceNo > maxSequence) {
      throw new SchedulePersistenceValidationError(
        '이동할 순서를 확인해 주세요.',
      );
    }
    const request = { targetDayNo, targetSequenceNo };
    return mutate(
      'move',
      `move:${itemId}:${JSON.stringify(request)}`,
      request,
      (tripId, target, locks, key) =>
        moveScheduleItem(tripId, itemId, target, locks, key),
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
    const request = [{ dayNo, orderedItemIds }];
    return mutate(
      'reorder',
      `reorder:${dayNo}:${orderedItemIds.join(',')}`,
      request,
      (tripId, order, locks, key) => reorderSchedule(tripId, order, locks, key),
    );
  };

  const discardPendingMutation = async () => {
    const scope = captureAuthScope();
    const journal = await loadScheduleMutationJournal();
    assertScope(scope);
    if (journal && journal.userId !== scope.userId) {
      throw new ScheduleSessionChangedError();
    }
    await clearScheduleMutationJournal();
    assertScope(scope);
    useScheduleStore.setState({ error: null });
  };

  return {
    hydrateSchedule,
    createPlace,
    updateItem,
    deleteItem,
    moveItem,
    reorderDay,
    discardPendingMutation,
  };
}
