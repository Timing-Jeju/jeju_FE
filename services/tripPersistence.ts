import {
  createAccommodation as createAccommodationApi,
  deleteAccommodation as deleteAccommodationApi,
  updateAccommodation as updateAccommodationApi,
  type AccommodationCreateRequest,
  type AccommodationPatchRequest,
  type Accommodation,
} from './api/accommodations';
import { createIdempotencyKey } from './api/idempotency';
import { hasCode } from './api/problem';
import {
  deleteTransportEvent as deleteTransportEventApi,
  putTransportEvent as putTransportEventApi,
  type TransportEventRequest,
  type TransportEventType,
} from './api/transportEvents';
import {
  createTrip,
  deleteTrip as deleteTripApi,
  fetchTrip,
  fetchTrips,
  updateTrip,
  type Trip,
  type TripCreateRequest,
  type TripPatchRequest,
  type TripTransportMode as ApiTransportMode,
} from './api/trips';
import { useTripStore, type TripConditions } from '@/store/useTripStore';
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
    super('로그인 사용자가 변경되어 이전 요청 결과를 적용하지 않았어요.');
    this.name = 'TripSessionChangedError';
  }
}

let authGeneration = 0;
let authUserId = useUserStore.getState().userId;
useUserStore.subscribe((state) => {
  if (state.userId !== authUserId) {
    authUserId = state.userId;
    authGeneration += 1;
  }
});

interface AuthScope {
  generation: number;
  userId: string | null;
}

const captureAuthScope = (): AuthScope => ({
  generation: authGeneration,
  userId: useUserStore.getState().userId,
});

const isCurrentAuthScope = (scope: AuthScope) =>
  scope.generation === authGeneration &&
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
  if (conditions.transport.includes('walk')) {
    throw new TripPersistenceValidationError(
      '도보 이동 수단은 아직 서버에 저장할 수 없어요.',
    );
  }
  const modes = conditions.transport.map((mode) =>
    mode === 'bus' ? ('public_transit' as const) : ('taxi' as const),
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
    return [];
  });

const setServerTrip = (
  trip: Trip,
  etag: string,
  hydrate: boolean,
  scope: AuthScope,
) => {
  assertCurrentAuthScope(scope);
  useTripStore.setState((state) => ({
    ...(hydrate
      ? {
          startDate: trip.startDate,
          endDate: trip.endDate,
          transport: uiTransport(trip),
        }
      : {}),
    tripId: trip.tripId,
    etag,
    serverTrip: trip,
    saved: true,
    loading: false,
    serverError: null,
    trips: state.trips.some((item) => item.tripId === trip.tripId)
      ? state.trips.map((item) => (item.tripId === trip.tripId ? trip : item))
      : [trip, ...state.trips],
  }));
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
  if (!!body.terminalPlaceId === !!body.customTerminalName?.trim()) {
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

export function createTripPersistenceActions() {
  const saveTrip = async (conditions: TripConditions) => {
    const scope = captureAuthScope();
    useTripStore.getState().saveConditions(conditions);
    useTripStore.setState({ loading: true });
    const state = useTripStore.getState();
    try {
      if (!state.tripId) {
        const body = toTripCreateRequest(conditions);
        const bodyFingerprint = fingerprint(body);
        const attempt =
          state.pendingTripCreate?.fingerprint === bodyFingerprint
            ? state.pendingTripCreate
            : { fingerprint: bodyFingerprint, key: createIdempotencyKey() };
        useTripStore.setState({ pendingTripCreate: attempt });
        const response = await createTrip(body, attempt.key);
        assertCurrentAuthScope(scope);
        setServerTrip(response.data, requireEtag(response.etag), false, scope);
        useTripStore.setState({ pendingTripCreate: null });
        return response.data;
      }
      const response = await updateTrip(
        state.tripId,
        toTripPatchRequest(conditions),
        requireEtag(state.etag),
      );
      assertCurrentAuthScope(scope);
      setServerTrip(response.data, requireEtag(response.etag), false, scope);
      return response.data;
    } catch (error) {
      assertCurrentAuthScope(scope);
      if (state.tripId) await refreshOnConflict(error, state.tripId, scope);
      setFailure(error, scope);
      throw error;
    }
  };

  const hydrateLatestTrip = async () => {
    const scope = captureAuthScope();
    useTripStore.setState({ loading: true, serverError: null });
    try {
      const list = await fetchTrips({ size: 20 });
      assertCurrentAuthScope(scope);
      useTripStore.setState({ trips: list.items });
      if (!list.items.length) {
        useTripStore.setState({ loading: false });
        return null;
      }
      const response = await fetchTrip(list.items[0].tripId);
      assertCurrentAuthScope(scope);
      setServerTrip(response.data, requireEtag(response.etag), true, scope);
      return response.data;
    } catch (error) {
      assertCurrentAuthScope(scope);
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
