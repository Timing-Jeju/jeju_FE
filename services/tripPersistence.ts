import {
  createAccommodation as createAccommodationApi,
  deleteAccommodation as deleteAccommodationApi,
  updateAccommodation as updateAccommodationApi,
  type AccommodationCreateRequest,
  type AccommodationPatchRequest,
  type Accommodation,
} from './api/accommodations';
import { createIdempotencyKey } from './api/idempotency';
import { hydrateTripConditions } from './tripHydration';
import { ApiError, hasCode, isApiError } from './api/problem';
import type { ApiResponse } from './api/http';
import { toDayActivityWindows } from './tripActivityWindows';
import { toPlannerConditions } from './tripPlannerConditions';
import {
  deleteTransportEvent as deleteTransportEventApi,
  putTransportEvent as putTransportEventApi,
  type TransportEventRequest,
  type TransportEventMutation,
  type TransportEventType,
} from './api/transportEvents';
import {
  createTrip,
  deleteTrip as deleteTripApi,
  fetchTrip,
  fetchTrips,
  updateTrip,
  replaceDayActivityWindows,
  replacePlannerConditions,
  type TripCreateResponse,
  type Trip,
  type TripCreateRequest,
  type TripPatchRequest,
  type TripTransportMode as ApiTransportMode,
} from './api/trips';
import {
  useTripStore,
  type TripConditions,
  type TripState,
  type TripTransportDrafts,
} from '@/store/useTripStore';
import { useUserStore } from '@/store/useUserStore';

const DEFAULT_TITLE = '제주 여행';
const STRONG_TRIP_ETAG = /^"trip-[0-9a-f-]{36}-r[1-9][0-9]*"$/;

export class TripPersistenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TripPersistenceValidationError';
  }
}

export class TripSessionChangedError extends Error {
  constructor() {
    super(
      '로그인 사용자나 선택한 여행이 변경되어 이전 요청 결과를 적용하지 않았어요.',
    );
    this.name = 'TripSessionChangedError';
  }
}

export class TripReadChangedError extends Error {
  constructor() {
    super('입력이나 저장 상태가 변경되어 이전 조회 결과를 적용하지 않았어요.');
    this.name = 'TripReadChangedError';
  }
}

let tripContentGeneration = 0;
let tripReadSequence = 0;
const tripReadFields: (keyof TripState)[] = [
  'startDate',
  'endDate',
  'dayTimes',
  'arrivalTime',
  'arrivalTransport',
  'departureTime',
  'departureTransport',
  'lodging',
  'lodgingMode',
  'dailyLodgings',
  'styles',
  'transport',
  'serverTrip',
  'etag',
  'pendingTripCreate',
  'pendingDayActivityWindows',
  'pendingPlannerConditions',
  'pendingTransportEvents',
  'pendingAccommodationCreate',
];
useTripStore.subscribe((state, previous) => {
  if (tripReadFields.some((key) => state[key] !== previous[key]))
    tripContentGeneration += 1;
});

let authGeneration = 0;
let authUserId = useUserStore.getState().userId;
useUserStore.subscribe((state) => {
  if (state.userId !== authUserId) {
    authUserId = state.userId;
    authGeneration += 1;
  }
});

let tripSelectionGeneration = 0;
let selectedTripId = useTripStore.getState().tripId;
useTripStore.subscribe((state) => {
  if (state.tripId !== selectedTripId) {
    selectedTripId = state.tripId;
    tripSelectionGeneration += 1;
  }
});

interface AuthScope {
  tripGeneration: number;
  generation: number;
  userId: string | null;
}

const captureAuthScope = (): AuthScope => ({
  generation: authGeneration,
  tripGeneration: tripSelectionGeneration,
  userId: useUserStore.getState().userId,
});

const isCurrentAuthScope = (scope: AuthScope) =>
  scope.generation === authGeneration &&
  scope.tripGeneration === tripSelectionGeneration &&
  scope.userId === useUserStore.getState().userId;

const assertCurrentAuthScope = (scope: AuthScope) => {
  if (!isCurrentAuthScope(scope)) throw new TripSessionChangedError();
};

const requireDates = (conditions: TripConditions) => {
  if (!conditions.startDate || !conditions.endDate) {
    throw new TripPersistenceValidationError('여행 날짜를 확인해 주세요.');
  }
  const dateValue = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
      ? timestamp
      : Number.NaN;
  };
  const start = dateValue(conditions.startDate);
  const end = dateValue(conditions.endDate);
  const days = (end - start) / 86_400_000 + 1;
  if (!Number.isFinite(days) || days < 1 || days > 30) {
    throw new TripPersistenceValidationError(
      '여행 기간은 1일부터 30일까지 설정해 주세요.',
    );
  }
  return { startDate: conditions.startDate, endDate: conditions.endDate };
};

const toTransportModes = (conditions: TripConditions): ApiTransportMode[] => {
  const modes = conditions.transport.map((mode) =>
    mode === 'bus' ? ('public_transit' as const) : mode,
  );
  if (!modes.length) {
    throw new TripPersistenceValidationError('주요 이동 수단을 선택해 주세요.');
  }
  return modes.map((mode, index) => ({
    mode,
    priority: index + 1,
    primary: index === 0,
  }));
};

export const toTripCreateRequest = (
  conditions: TripConditions,
): TripCreateRequest => ({
  title: DEFAULT_TITLE,
  ...requireDates(conditions),
  timezone: 'Asia/Seoul',
  userPace: 'normal',
  transportModes: toTransportModes(conditions),
});

export const toTripPatchRequest = (
  conditions: TripConditions,
): TripPatchRequest => ({
  ...requireDates(conditions),
  timezone: 'Asia/Seoul',
  userPace: 'normal',
  transportModes: toTransportModes(conditions),
});

const requireEtag = (etag: string | null): string => {
  if (!etag || !STRONG_TRIP_ETAG.test(etag)) {
    throw new TripPersistenceValidationError(
      '최신 여행 정보를 다시 불러와 주세요.',
    );
  }
  return etag;
};

const fingerprint = (value: unknown) => JSON.stringify(value);

const uiTransport = (trip: Trip): TripConditions['transport'] =>
  trip.transportModes.flatMap(({ mode }) => {
    if (mode === 'public_transit') return ['bus' as const];
    if (mode === 'taxi') return ['taxi' as const];
    if (mode === 'walk') return ['walk' as const];
    return [];
  });

const setServerTrip = (
  trip: Trip,
  etag: string,
  hydrate: boolean,
  scope: AuthScope,
  saved = true,
) => {
  assertCurrentAuthScope(scope);
  useTripStore.setState((state) => ({
    ...(hydrate
      ? {
          startDate: trip.startDate,
          endDate: trip.endDate,
          transport: uiTransport(trip),
          ...hydrateTripConditions(trip),
          pendingTripCreate: null,
          pendingAccommodationCreate: null,
          pendingDayActivityWindows: null,
          pendingPlannerConditions: null,
          pendingTransportEvents: null,
        }
      : {}),
    tripId: trip.tripId,
    etag,
    serverTrip: trip,
    saved,
    loading: !saved,
    serverError: null,
    trips: state.trips.some((item) => item.tripId === trip.tripId)
      ? state.trips.map((item) => (item.tripId === trip.tripId ? trip : item))
      : [trip, ...state.trips],
  }));
  // 이 요청이 성공해서 선택한 여행은 같은 저장 흐름의 후속 요청에 이어 쓴다.
  scope.tripGeneration = tripSelectionGeneration;
};

const setFailure = (error: unknown, scope: AuthScope) => {
  assertCurrentAuthScope(scope);
  useTripStore.setState({
    loading: false,
    serverError:
      error instanceof Error
        ? error.message
        : '요청을 완료하지 못했습니다. 다시 시도해 주세요.',
  });
};

const refreshVersionWithoutHydratingDraft = async (
  tripId: string,
  scope: AuthScope,
) => {
  assertCurrentAuthScope(scope);
  const response = await fetchTrip(tripId);
  assertCurrentAuthScope(scope);
  const etag = requireEtag(response.etag);
  useTripStore.setState({
    tripId,
    etag,
    serverTrip: response.data,
    loading: false,
  });
};

const refreshOnConflict = async (
  error: unknown,
  tripId: string,
  scope: AuthScope,
) => {
  assertCurrentAuthScope(scope);
  if (hasCode(error, 'TRIP_VERSION_CONFLICT', 'PRECONDITION_FAILED')) {
    try {
      await refreshVersionWithoutHydratingDraft(tripId, scope);
    } catch {
      // 원래 mutation 오류를 보존한다. 다음 명시적 조회에서 다시 복구할 수 있다.
    }
  }
};

const exactAccommodationRequest = (
  body: AccommodationCreateRequest,
): AccommodationCreateRequest => ({
  placeId: body.placeId,
  customName: body.customName,
  checkInDate: body.checkInDate,
  checkOutDate: body.checkOutDate,
  checkInTime: body.checkInTime,
  checkOutTime: body.checkOutTime,
});

const exactAccommodationPatch = (
  body: AccommodationPatchRequest,
): AccommodationPatchRequest => ({
  ...(body.placeId !== undefined ? { placeId: body.placeId } : {}),
  ...(body.customName !== undefined ? { customName: body.customName } : {}),
  ...(body.checkInDate !== undefined ? { checkInDate: body.checkInDate } : {}),
  ...(body.checkOutDate !== undefined
    ? { checkOutDate: body.checkOutDate }
    : {}),
  ...(body.checkInTime !== undefined ? { checkInTime: body.checkInTime } : {}),
  ...(body.checkOutTime !== undefined
    ? { checkOutTime: body.checkOutTime }
    : {}),
});

const failAccommodation = () => {
  throw new TripPersistenceValidationError(
    '숙소 날짜의 공백이나 중복을 확인해 주세요.',
  );
};

const validateAccommodationIdentity = (
  placeId: string | null,
  customName: string | null,
) => {
  if (!!placeId === !!customName?.trim()) {
    throw new TripPersistenceValidationError(
      '숙소는 검색 장소와 직접 입력 이름 중 하나만 필요해요.',
    );
  }
};

const validateAccommodationSet = (items: Accommodation[]) => {
  const trip = useTripStore.getState().serverTrip;
  if (!trip) failAccommodation();
  const ordered = [...items].sort((left, right) =>
    left.checkInDate.localeCompare(right.checkInDate),
  );
  ordered.forEach((item) => {
    validateAccommodationIdentity(item.placeId, item.customName);
    if (
      item.checkInDate >= item.checkOutDate ||
      item.checkInDate < trip!.startDate ||
      item.checkOutDate > trip!.endDate ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.checkInTime) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.checkOutTime)
    ) {
      failAccommodation();
    }
  });
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].checkOutDate !== ordered[index].checkInDate) {
      failAccommodation();
    }
  }
};

const candidateAccommodation = (
  id: string,
  body: AccommodationCreateRequest,
): Accommodation => ({
  accommodationId: id,
  name: body.customName?.trim() ?? '',
  sequenceNo: 1,
  ...body,
});

const exactTransportEvent = (
  body: TransportEventRequest,
): TransportEventRequest => ({
  eventType: body.eventType,
  transportType: body.transportType,
  terminalPlaceId: body.terminalPlaceId,
  customTerminalName: body.customTerminalName,
  scheduledAt: body.scheduledAt,
  transportNumber: body.transportNumber,
  note: body.note,
});

const validateTransportEvent = (body: TransportEventRequest) => {
  const unresolved =
    body.terminalPlaceId === null && body.customTerminalName === null;
  if (
    !unresolved &&
    !!body.terminalPlaceId === !!body.customTerminalName?.trim()
  ) {
    throw new TripPersistenceValidationError(
      '터미널은 검색 장소와 직접 입력 이름 중 하나만 필요해요.',
    );
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\+09:00$/.test(
      body.scheduledAt,
    )
  ) {
    throw new TripPersistenceValidationError(
      '교통편 시간은 제주 시간(+09:00)으로 입력해 주세요.',
    );
  }
  const state = useTripStore.getState();
  const date = body.scheduledAt.slice(0, 10);
  if (
    !state.serverTrip ||
    date < state.serverTrip.startDate ||
    date > state.serverTrip.endDate
  ) {
    throw new TripPersistenceValidationError(
      '교통편 시간은 여행 기간 안에 있어야 해요.',
    );
  }
  const other =
    body.eventType === 'arrival'
      ? state.transportEvents.departure
      : state.transportEvents.arrival;
  const arrival = body.eventType === 'arrival' ? body : other;
  const departure = body.eventType === 'departure' ? body : other;
  if (arrival && departure && arrival.scheduledAt >= departure.scheduledAt) {
    throw new TripPersistenceValidationError(
      '도착 시간은 출발 시간보다 빨라야 해요.',
    );
  }
};

const currentAggregate = () => {
  const { tripId, etag } = useTripStore.getState();
  if (!tripId) {
    throw new TripPersistenceValidationError(
      '저장된 여행을 먼저 선택해 주세요.',
    );
  }
  return { tripId, etag: requireEtag(etag) };
};

const isLatestTrip = (trip: TripCreateResponse): trip is Trip =>
  'transportEvents' in trip &&
  'accommodations' in trip &&
  trip.days.every(
    (day) => 'activityStartTime' in day && 'activityEndTime' in day,
  );

const latestMutationTrip = async (
  response: ApiResponse<TripCreateResponse>,
  scope: AuthScope,
): Promise<ApiResponse<Trip>> => {
  assertCurrentAuthScope(scope);
  if (response.idempotencyReplayed || !isLatestTrip(response.data)) {
    const latest = await fetchTrip(response.data.tripId);
    assertCurrentAuthScope(scope);
    return latest;
  }
  return { ...response, data: response.data };
};

const draftFingerprint = (state: TripConditions) =>
  fingerprint({
    root: toTripPatchRequest(state),
    dayTimes: state.dayTimes,
    lodgingMode: state.lodgingMode,
    lodgingPlaceId: state.lodging?.placeId ?? null,
    dailyLodgings: Object.entries(state.dailyLodgings)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, lodging]) => [date, lodging.placeId]),
    styles: state.styles,
    arrivalTransport: state.arrivalTransport,
    arrivalTime: state.arrivalTime,
    departureTransport: state.departureTransport,
    departureTime: state.departureTime,
  });

const currentDraftMatches = (expected: string) => {
  try {
    const state = useTripStore.getState();
    return draftFingerprint(state) === expected;
  } catch {
    return false;
  }
};

let saveInFlight: AuthScope | null = null;

const toTransportDrafts = (conditions: TripConditions): TripTransportDrafts => {
  const event = (
    eventType: TransportEventType,
  ): TransportEventRequest | null => {
    const kind =
      eventType === 'arrival'
        ? conditions.arrivalTransport
        : conditions.departureTransport;
    const time =
      eventType === 'arrival'
        ? conditions.arrivalTime
        : conditions.departureTime;
    if (kind === null && time === null) return null;
    if (
      !kind ||
      !time ||
      !['비행기', '선박'].includes(kind) ||
      !/^(?:[0-9]|[01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)
    ) {
      throw new TripPersistenceValidationError(
        '입도·출도 이동수단과 시간을 함께 확인해 주세요.',
      );
    }
    const date =
      eventType === 'arrival' ? conditions.startDate : conditions.endDate;
    return {
      eventType,
      transportType: kind === '비행기' ? 'flight' : 'ferry',
      terminalPlaceId: null,
      customTerminalName: null,
      scheduledAt: `${date}T${time.padStart(5, '0')}:00+09:00`,
      transportNumber: null,
      note: null,
    };
  };
  const drafts = { arrival: event('arrival'), departure: event('departure') };
  if (
    drafts.arrival &&
    drafts.departure &&
    drafts.arrival.scheduledAt >= drafts.departure.scheduledAt
  ) {
    throw new TripPersistenceValidationError(
      '도착 시간은 출발 시간보다 빨라야 해요.',
    );
  }
  return drafts;
};

/** 조건 화면이 편집하지 않는 기존 필드는 유지한다. 수단 변경 때만 터미널·편명을 비운다. */
const preserveTransportDetails = (
  desired: TransportEventRequest | null,
  previous: TransportEventRequest | null,
): TransportEventRequest | null => {
  if (!desired) return null;
  const sameKind = previous?.transportType === desired.transportType;
  return {
    ...desired,
    terminalPlaceId: sameKind ? previous.terminalPlaceId : null,
    customTerminalName: sameKind ? previous.customTerminalName : null,
    transportNumber: sameKind ? previous.transportNumber : null,
    note: previous?.note ?? null,
  };
};

export function createTripPersistenceActions() {
  const saveTrip = async (conditions: TripConditions) => {
    const scope = captureAuthScope();
    if (saveInFlight && isCurrentAuthScope(saveInFlight)) {
      throw new TripPersistenceValidationError(
        '저장이 진행 중이에요. 잠시 기다려 주세요.',
      );
    }
    saveInFlight = scope;
    tripContentGeneration += 1;
    useTripStore.getState().saveConditions(conditions);
    useTripStore.setState({ loading: true });
    try {
      const inputFingerprint = draftFingerprint(conditions);
      const transportDrafts = toTransportDrafts(conditions);
      const finishTransport = async (saved = true) => {
        let attempt = useTripStore.getState().pendingTransportEvents;
        if (!attempt || attempt.tripId !== useTripStore.getState().tripId) {
          throw new TripPersistenceValidationError(
            '저장할 교통편을 다시 확인해 주세요.',
          );
        }
        while (attempt.remaining.length) {
          assertCurrentAuthScope(scope);
          const step: NonNullable<
            TripState['pendingTransportEvents']
          >['remaining'][number] = attempt.remaining[0];
          const response: ApiResponse<TransportEventMutation> = step.body
            ? await putTransportEventApi(
                attempt.tripId,
                step.body,
                attempt.etag,
                step.key,
              )
            : await deleteTransportEventApi(
                attempt.tripId,
                step.eventType,
                attempt.etag,
                step.key,
              );
          assertCurrentAuthScope(scope);
          if (
            response.data.tripId !== attempt.tripId ||
            response.data.eventType !== step.eventType ||
            response.data.deleted !== (step.body === null)
          ) {
            throw new TripPersistenceValidationError(
              '교통편 저장 응답을 다시 확인해 주세요.',
            );
          }
          attempt = {
            ...attempt,
            etag: requireEtag(response.etag),
            remaining: attempt.remaining.slice(1),
          };
          useTripStore.setState({
            pendingTransportEvents: attempt,
            etag: attempt.etag,
          });
        }
        // 모든 변경이 확인돼도 최종 조회 전에는 저장 완료로 알리지 않는다.
        const latest = await fetchTrip(attempt.tripId);
        assertCurrentAuthScope(scope);
        setServerTrip(
          latest.data,
          requireEtag(latest.etag),
          false,
          scope,
          saved &&
            latest.etag === attempt.etag &&
            currentDraftMatches(attempt.fingerprint),
        );
        useTripStore.setState({
          pendingTransportEvents: null,
          loading: false,
          transportEvents: {
            ...(latest.data.transportEvents.arrival
              ? { arrival: latest.data.transportEvents.arrival }
              : {}),
            ...(latest.data.transportEvents.departure
              ? { departure: latest.data.transportEvents.departure }
              : {}),
          },
        });
        return latest.data;
      };
      const finishPlanner = async (saved = true) => {
        const attempt = useTripStore.getState().pendingPlannerConditions;
        if (!attempt || attempt.tripId !== useTripStore.getState().tripId) {
          throw new TripPersistenceValidationError(
            '저장할 여행을 다시 확인해 주세요.',
          );
        }
        const response = await replacePlannerConditions(
          attempt.tripId,
          attempt.body,
          attempt.etag,
          attempt.key,
        );
        assertCurrentAuthScope(scope);
        // 재조회가 실패해도 같은 PUT receipt를 확인할 수 있게 journal은 유지한다.
        const latest = await fetchTrip(attempt.tripId);
        assertCurrentAuthScope(scope);
        if (requireEtag(response.etag) !== requireEtag(latest.etag)) {
          throw new ApiError({ status: 409, code: 'TRIP_VERSION_CONFLICT' });
        }
        setServerTrip(
          latest.data,
          requireEtag(latest.etag),
          false,
          scope,
          false,
        );
        useTripStore.setState({
          pendingPlannerConditions: null,
          pendingTransportEvents: {
            tripId: attempt.tripId,
            etag: requireEtag(latest.etag),
            fingerprint: attempt.fingerprint,
            remaining: (['arrival', 'departure'] as const)
              .filter(
                (eventType) =>
                  attempt.transportDrafts[eventType] !== null ||
                  latest.data.transportEvents[eventType] !== null,
              )
              .map((eventType) => ({
                eventType,
                body: preserveTransportDetails(
                  attempt.transportDrafts[eventType],
                  latest.data.transportEvents[eventType],
                ),
                key: createIdempotencyKey(),
              })),
          },
        });
        return finishTransport(saved);
      };
      const finishPending = async (saved = true) => {
        const attempt = useTripStore.getState().pendingDayActivityWindows;
        if (!attempt || attempt.tripId !== useTripStore.getState().tripId) {
          throw new TripPersistenceValidationError(
            '저장할 여행을 다시 확인해 주세요.',
          );
        }
        const response = await replaceDayActivityWindows(
          attempt.tripId,
          attempt.body,
          attempt.etag,
          attempt.key,
        );
        assertCurrentAuthScope(scope);
        const latest = await latestMutationTrip(response, scope);
        setServerTrip(
          latest.data,
          requireEtag(latest.etag),
          false,
          scope,
          false,
        );
        useTripStore.setState({
          pendingDayActivityWindows: null,
          pendingPlannerConditions: {
            tripId: attempt.tripId,
            body: attempt.plannerConditions,
            etag: requireEtag(latest.etag),
            key: createIdempotencyKey(),
            fingerprint: attempt.fingerprint,
            transportDrafts: attempt.transportDrafts,
          },
        });
        return finishPlanner(saved);
      };
      const pendingTransport = useTripStore.getState().pendingTransportEvents;
      if (
        pendingTransport &&
        pendingTransport.tripId === useTripStore.getState().tripId
      ) {
        const saved = await finishTransport(
          pendingTransport.fingerprint === inputFingerprint,
        );
        if (pendingTransport.fingerprint === inputFingerprint) return saved;
        useTripStore.setState({ saved: false, loading: true });
      }
      const pendingPlanner = useTripStore.getState().pendingPlannerConditions;
      if (
        pendingPlanner &&
        pendingPlanner.tripId === useTripStore.getState().tripId
      ) {
        const saved = await finishPlanner(
          pendingPlanner.fingerprint === inputFingerprint,
        );
        if (pendingPlanner.fingerprint === inputFingerprint) return saved;
        useTripStore.setState({ saved: false, loading: true });
      }
      const pending = useTripStore.getState().pendingDayActivityWindows;
      if (pending && pending.tripId === useTripStore.getState().tripId) {
        const saved = await finishPending(
          pending.fingerprint === inputFingerprint,
        );
        if (pending.fingerprint === inputFingerprint) return saved;
        useTripStore.setState({ saved: false, loading: true });
      }
      const state = useTripStore.getState();
      let response: ApiResponse<TripCreateResponse>;
      if (!state.tripId) {
        const body = toTripCreateRequest(conditions);
        const bodyFingerprint = fingerprint(body);
        const attempt =
          state.pendingTripCreate?.fingerprint === bodyFingerprint
            ? state.pendingTripCreate
            : { fingerprint: bodyFingerprint, key: createIdempotencyKey() };
        useTripStore.setState({ pendingTripCreate: attempt });
        response = await createTrip(body, attempt.key);
        assertCurrentAuthScope(scope);
      } else {
        response = await updateTrip(
          state.tripId,
          toTripPatchRequest(conditions),
          requireEtag(state.etag),
        );
        assertCurrentAuthScope(scope);
      }
      const latest = await latestMutationTrip(response, scope);
      setServerTrip(latest.data, requireEtag(latest.etag), false, scope, false);
      useTripStore.setState({
        saved: false,
        loading: true,
        pendingTripCreate: null,
      });
      const body = toDayActivityWindows(conditions, latest.data);
      useTripStore.setState({
        pendingDayActivityWindows: {
          tripId: latest.data.tripId,
          body,
          etag: requireEtag(latest.etag),
          key: createIdempotencyKey(),
          fingerprint: inputFingerprint,
          plannerConditions: toPlannerConditions(conditions, latest.data),
          transportDrafts,
        },
      });
      return await finishPending();
    } catch (error) {
      assertCurrentAuthScope(scope);
      if (
        isApiError(error) &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429 &&
        !hasCode(error, 'IDEMPOTENCY_KEY_REUSED')
      ) {
        useTripStore.setState({
          pendingDayActivityWindows: null,
          pendingPlannerConditions: null,
          pendingTransportEvents: null,
        });
      }
      const tripId = useTripStore.getState().tripId;
      if (tripId) await refreshOnConflict(error, tripId, scope);
      assertCurrentAuthScope(scope);
      useTripStore.setState({ saved: false });
      setFailure(error, scope);
      throw error;
    } finally {
      if (saveInFlight === scope) saveInFlight = null;
    }
  };

  const hydrateLatestTrip = async () => {
    const scope = captureAuthScope();
    if (saveInFlight && isCurrentAuthScope(saveInFlight)) {
      throw new TripPersistenceValidationError(
        '저장이 끝난 뒤 여행을 다시 조회해 주세요.',
      );
    }
    const readSequence = ++tripReadSequence;
    const readGeneration = tripContentGeneration;
    const isCurrentRead = () =>
      readSequence === tripReadSequence &&
      readGeneration === tripContentGeneration;
    const assertCurrentRead = () => {
      assertCurrentAuthScope(scope);
      if (!isCurrentRead()) throw new TripReadChangedError();
    };
    useTripStore.setState({ loading: true, serverError: null });
    try {
      const list = await fetchTrips({ size: 20 });
      assertCurrentRead();
      useTripStore.setState({ trips: list.items });
      if (!list.items.length) {
        useTripStore.setState(useTripStore.getInitialState(), true);
        return null;
      }
      const response = await fetchTrip(list.items[0].tripId);
      assertCurrentRead();
      setServerTrip(response.data, requireEtag(response.etag), true, scope);
      return response.data;
    } catch (error) {
      assertCurrentAuthScope(scope);
      if (!isCurrentRead()) {
        if (
          readSequence === tripReadSequence &&
          !(saveInFlight && isCurrentAuthScope(saveInFlight))
        ) {
          useTripStore.setState({ loading: false });
        }
        throw new TripReadChangedError();
      }
      setFailure(error, scope);
      throw error;
    }
  };

  const removeTrip = async () => {
    const scope = captureAuthScope();
    const { tripId } = currentAggregate();
    useTripStore.setState({ loading: true, serverError: null });
    try {
      await deleteTripApi(tripId);
      assertCurrentAuthScope(scope);
      useTripStore.setState(useTripStore.getInitialState(), true);
    } catch (error) {
      assertCurrentAuthScope(scope);
      setFailure(error, scope);
      throw error;
    }
  };

  const createAccommodation = async (input: AccommodationCreateRequest) => {
    const scope = captureAuthScope();
    const { tripId, etag } = currentAggregate();
    const body = exactAccommodationRequest(input);
    validateAccommodationSet([
      ...Object.values(useTripStore.getState().accommodations),
      candidateAccommodation('pending', body),
    ]);
    const bodyFingerprint = fingerprint({ tripId, body });
    const state = useTripStore.getState();
    const attempt =
      state.pendingAccommodationCreate?.fingerprint === bodyFingerprint
        ? state.pendingAccommodationCreate
        : { fingerprint: bodyFingerprint, key: createIdempotencyKey() };
    useTripStore.setState({ pendingAccommodationCreate: attempt });
    try {
      const response = await createAccommodationApi(
        tripId,
        body,
        etag,
        attempt.key,
      );
      assertCurrentAuthScope(scope);
      const nextEtag = requireEtag(response.etag);
      useTripStore.setState((current) => ({
        etag: nextEtag,
        pendingAccommodationCreate: null,
        accommodations: {
          ...current.accommodations,
          [response.data.accommodationId]: response.data.accommodation,
        },
      }));
      return response.data;
    } catch (error) {
      assertCurrentAuthScope(scope);
      await refreshOnConflict(error, tripId, scope);
      setFailure(error, scope);
      throw error;
    }
  };

  const updateAccommodation = async (
    accommodationId: string,
    body: AccommodationPatchRequest,
  ) => {
    const scope = captureAuthScope();
    const { tripId, etag } = currentAggregate();
    const exactBody = exactAccommodationPatch(body);
    const current = useTripStore.getState().accommodations[accommodationId];
    if (!current) {
      throw new TripPersistenceValidationError(
        '수정할 숙소를 다시 불러와 주세요.',
      );
    }
    validateAccommodationSet([
      ...Object.values(useTripStore.getState().accommodations).filter(
        (item) => item.accommodationId !== accommodationId,
      ),
      { ...current, ...exactBody },
    ]);
    try {
      const response = await updateAccommodationApi(
        tripId,
        accommodationId,
        exactBody,
        etag,
      );
      assertCurrentAuthScope(scope);
      const nextEtag = requireEtag(response.etag);
      useTripStore.setState((state) => ({
        etag: nextEtag,
        accommodations: {
          ...state.accommodations,
          [response.data.accommodationId]: response.data.accommodation,
        },
      }));
      return response.data;
    } catch (error) {
      assertCurrentAuthScope(scope);
      await refreshOnConflict(error, tripId, scope);
      setFailure(error, scope);
      throw error;
    }
  };

  const deleteAccommodation = async (accommodationId: string) => {
    const scope = captureAuthScope();
    const { tripId, etag } = currentAggregate();
    try {
      await deleteAccommodationApi(tripId, accommodationId, etag);
      assertCurrentAuthScope(scope);
      await refreshVersionWithoutHydratingDraft(tripId, scope);
      assertCurrentAuthScope(scope);
      useTripStore.setState((state) => {
        const next = { ...state.accommodations };
        delete next[accommodationId];
        return { accommodations: next };
      });
    } catch (error) {
      assertCurrentAuthScope(scope);
      await refreshOnConflict(error, tripId, scope);
      setFailure(error, scope);
      throw error;
    }
  };

  const putTransportEvent = async (input: TransportEventRequest) => {
    const scope = captureAuthScope();
    const { tripId, etag } = currentAggregate();
    const body = exactTransportEvent(input);
    validateTransportEvent(body);
    try {
      const response = await putTransportEventApi(tripId, body, etag);
      assertCurrentAuthScope(scope);
      const nextEtag = requireEtag(response.etag);
      if (!response.data.event) {
        throw new TripPersistenceValidationError(
          '교통편 저장 응답을 확인할 수 없어요.',
        );
      }
      useTripStore.setState((state) => ({
        etag: nextEtag,
        transportEvents: {
          ...state.transportEvents,
          [response.data.eventType]: response.data.event!,
        },
      }));
      return response.data;
    } catch (error) {
      assertCurrentAuthScope(scope);
      await refreshOnConflict(error, tripId, scope);
      setFailure(error, scope);
      throw error;
    }
  };

  const deleteTransportEvent = async (eventType: TransportEventType) => {
    const scope = captureAuthScope();
    const { tripId, etag } = currentAggregate();
    try {
      const response = await deleteTransportEventApi(tripId, eventType, etag);
      assertCurrentAuthScope(scope);
      const nextEtag = requireEtag(response.etag);
      useTripStore.setState((state) => {
        const next = { ...state.transportEvents };
        delete next[eventType];
        return { etag: nextEtag, transportEvents: next };
      });
      return response.data;
    } catch (error) {
      assertCurrentAuthScope(scope);
      await refreshOnConflict(error, tripId, scope);
      setFailure(error, scope);
      throw error;
    }
  };

  return {
    saveTrip,
    hydrateLatestTrip,
    deleteTrip: removeTrip,
    createAccommodation,
    updateAccommodation,
    deleteAccommodation,
    putTransportEvent,
    deleteTransportEvent,
  };
}
