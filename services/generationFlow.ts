import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useTripStore, isLodgingComplete } from '@/store/useTripStore';
import { useUserStore } from '@/store/useUserStore';
import { useScheduleStore, type DayReview } from '@/store/useScheduleStore';
import { captureAuthScope, isCurrentAuthScope } from './authScope';
import {
  createIdempotencyKey,
  isCanonicalUuid,
  isValidIdempotencyKey,
} from './api/idempotency';
import { fetchTrip } from './api/trips';
import { fetchSchedule } from './api/schedule';
import { scheduleToPlaces, scheduleToReviews } from './schedulePersistence';
import {
  PLANNER_AVAILABLE,
  PLANNER_UNAVAILABLE_MESSAGE,
} from './plannerAvailability';
import { ApiError, isApiError } from './api/problem';
import {
  startGeneration,
  getGeneration,
  validateRun,
  getCandidateSchedule,
  applyCandidate,
  type GenerationCommand,
  type GenerationRun,
  type Candidate,
} from './api/generations';

interface Journal {
  version: 1;
  userId: string;
  tripId: string;
  dayNo: number;
  command: GenerationCommand;
  etag: string;
  key: string;
  runId?: string;
  pollUrl?: string;
  commandInputHash?: string;
  apply?: {
    candidateId: string;
    scheduleVersionId: string;
    key: string;
    etag: string;
  };
}
interface GenerationState {
  journal: Journal | null;
  run: GenerationRun | null;
  candidate: Candidate | null;
  review: DayReview | null;
  busy: boolean;
}
const empty = {
  journal: null,
  run: null,
  candidate: null,
  review: null,
  busy: false,
};
export const useGenerationStore = create<GenerationState>(() => empty);
let epoch = 0;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
useGenerationStore.subscribe((state, old) => {
  if (state.run === old.run) return;
  clearTimeout(expiryTimer);
  const candidates = state.run?.result?.candidates ?? [];
  if (!candidates.length) return;
  const remaining = Math.min(
    ...candidates.map(
      (candidate) => Date.parse(candidate.expiresAt) - Date.now(),
    ),
  );
  expiryTimer = setTimeout(
    () => {
      epoch += 1;
      useGenerationStore.setState({
        run: null,
        candidate: null,
        review: null,
        busy: false,
      });
    },
    Math.max(0, Math.min(remaining, 85_800_000)),
  );
});
const reset = () => {
  epoch += 1;
  useGenerationStore.setState(empty);
};
useTripStore.subscribe((state, old) => {
  if (state.tripId !== old.tripId) reset();
});
useUserStore.subscribe((state, old) => {
  if (state.userId !== old.userId) reset();
});
const storageKey = (userId: string, tripId: string, day: number) =>
  `timing-jeju:generation:v1:${userId}:${tripId}:${day}`;
const keyOf = (j: Journal) => storageKey(j.userId, j.tripId, j.dayNo);
const enabled = () => {
  if (!PLANNER_AVAILABLE) throw new Error(PLANNER_UNAVAILABLE_MESSAGE);
};
function validateJournal(
  j: Journal,
  userId: string,
  tripId: string,
  dayNo: number,
): Journal {
  if (
    !j ||
    j.version !== 1 ||
    j.userId !== userId ||
    j.tripId !== tripId ||
    j.dayNo !== dayNo ||
    !isCanonicalUuid(j.command?.targetDayId ?? '') ||
    j.command.candidateCount !== 3 ||
    !(
      j.command.expectedActiveScheduleVersionId === null ||
      isCanonicalUuid(j.command.expectedActiveScheduleVersionId)
    ) ||
    typeof j.key !== 'string' ||
    !isValidIdempotencyKey(j.key) ||
    typeof j.etag !== 'string' ||
    (j.runId !== undefined && !isCanonicalUuid(j.runId)) ||
    (j.apply &&
      (!j.runId ||
        !isCanonicalUuid(j.apply.candidateId) ||
        !isCanonicalUuid(j.apply.scheduleVersionId) ||
        !isValidIdempotencyKey(j.apply.key) ||
        typeof j.apply.etag !== 'string'))
  )
    throw new Error('보류 중인 생성 기록이 올바르지 않아요.');
  // 저장소 객체를 그대로 전송하지 않고 공개 식별자와 잠금 필드만 복원한다.
  return {
    version: 1,
    userId,
    tripId,
    dayNo,
    key: j.key,
    etag: j.etag,
    command: {
      targetDayId: j.command.targetDayId,
      candidateCount: 3,
      expectedActiveScheduleVersionId:
        j.command.expectedActiveScheduleVersionId,
    },
    ...(j.runId
      ? {
          runId: j.runId,
          pollUrl: j.pollUrl,
          commandInputHash: j.commandInputHash,
        }
      : {}),
    ...(j.apply
      ? {
          apply: {
            candidateId: j.apply.candidateId,
            scheduleVersionId: j.apply.scheduleVersionId,
            key: j.apply.key,
            etag: j.apply.etag,
          },
        }
      : {}),
  };
}
const scope = () => {
  const auth = captureAuthScope();
  const generation = epoch;
  const tripId = useTripStore.getState().tripId;
  return () =>
    generation === epoch &&
    isCurrentAuthScope(auth) &&
    tripId === useTripStore.getState().tripId;
};
const assertCurrent = (current: () => boolean) => {
  if (!current()) throw new Error('사용자 또는 여행이 변경됐어요.');
};
const write = async (journal: Journal, current: () => boolean) => {
  assertCurrent(current);
  await AsyncStorage.setItem(keyOf(journal), JSON.stringify(journal));
  assertCurrent(current);
  useGenerationStore.setState({ journal });
};

/** 화면의 현재 선택을 서버 저장 상태와 대조하며 5일 초과·선박은 접수하지 않는다. */
export function generationBlockReason(dayNo: number): string | null {
  const trip = useTripStore.getState();
  if (!trip.saved || !trip.serverTrip || !trip.etag || !trip.tripId)
    return '여행 조건을 먼저 저장해 주세요.';
  if (trip.serverTrip.days.length > 5)
    return 'AI 일정은 최대 5일까지 생성할 수 있어요.';
  if (
    trip.arrivalTransport !== '비행기' ||
    trip.departureTransport !== '비행기'
  )
    return 'AI 일정은 항공 여행부터 지원해요.';
  const days = [...trip.serverTrip.days].sort((a, b) => a.dayNo - b.dayNo);
  const day = days.find((d) => d.dayNo === dayNo);
  if (!day || !day.activityStartTime || !day.activityEndTime)
    return '날짜별 활동 시간을 저장해 주세요.';
  if (
    !isLodgingComplete(
      trip,
      days.map((d) => d.date),
    )
  )
    return '날짜별 숙소를 선택하고 저장해 주세요.';
  if (
    (useScheduleStore.getState().places[dayNo] ?? []).some(
      (place) =>
        !place.placeId ||
        !Number.isInteger(place.stayMinutes) ||
        place.stayMinutes <= 0,
    )
  )
    return '장소와 체류 시간을 확인해 주세요.';
  if (
    trip.loading ||
    useScheduleStore.getState().mutating ||
    useScheduleStore.getState().pendingMutationRecovery
  )
    return '진행 중인 저장을 먼저 완료해 주세요.';
  if (!PLANNER_AVAILABLE) return PLANNER_UNAVAILABLE_MESSAGE;
  return null;
}

/** 응답 유실 전의 command·ETag·멱등 키를 재사용한다. 후보 본문은 저장하지 않는다. */
export async function beginGeneration(dayNo: number) {
  enabled();
  if (useGenerationStore.getState().busy)
    throw new Error('생성 요청을 확인 중이에요.');
  const current = scope();
  const trip = useTripStore.getState();
  const userId = useUserStore.getState().userId;
  if (!userId || !trip.tripId) throw new Error('여행을 다시 선택해 주세요.');
  useGenerationStore.setState({ busy: true });
  try {
    const raw = await AsyncStorage.getItem(
      storageKey(userId, trip.tripId, dayNo),
    );
    assertCurrent(current);
    let journal: Journal | null = null;
    if (raw) {
      try {
        journal = JSON.parse(raw) as Journal;
      } catch {
        throw new Error('보류 중인 생성 기록을 확인할 수 없어요.');
      }
      journal = validateJournal(journal!, userId, trip.tripId, dayNo);
    }
    if (!journal) {
      const reason = generationBlockReason(dayNo);
      if (reason) throw new Error(reason);
      const active = await fetchSchedule(trip.tripId).catch((error) => {
        if (
          isApiError(error) &&
          error.status === 404 &&
          trip.serverTrip?.activeScheduleVersionId === null
        )
          return null;
        throw error;
      });
      assertCurrent(current);
      const firstIncomplete = trip.serverTrip!.days.find(
        (d) => !active?.days.find((s) => s.dayNo === d.dayNo)?.items.length,
      );
      if (firstIncomplete?.dayNo !== dayNo)
        throw new Error('Day 1부터 첫 미완료 날짜를 순서대로 생성해 주세요.');
      journal = {
        version: 1,
        userId,
        tripId: trip.tripId,
        dayNo,
        etag: trip.etag!,
        key: createIdempotencyKey(),
        command: {
          targetDayId: trip.serverTrip!.days.find((d) => d.dayNo === dayNo)!
            .dayId,
          expectedActiveScheduleVersionId:
            active?.scheduleVersion.scheduleVersionId ?? null,
          candidateCount: 3,
        },
      };
      await write(journal, current);
    } else useGenerationStore.setState({ journal });
    if (!journal.runId) {
      const response = await startGeneration(
        journal.tripId,
        journal.command,
        journal.etag,
        journal.key,
        current,
      ).catch(async (error) => {
        await handleGenerationError(error, journal!, current);
        throw error;
      });
      assertCurrent(current);
      const run = validateRun(response.data, journal.tripId);
      journal = {
        ...journal,
        runId: run.runId,
        pollUrl: run.pollUrl,
        commandInputHash: run.commandInputHash,
      };
      await write(journal, current);
    }
    return journal;
  } finally {
    if (current()) useGenerationStore.setState({ busy: false });
  }
}

export async function pollGeneration(signal: AbortSignal) {
  enabled();
  const current = scope();
  const journal = useGenerationStore.getState().journal;
  if (!journal?.runId) throw new Error('생성 작업을 먼저 요청해 주세요.');
  const response = await getGeneration(
    journal.tripId,
    journal.runId,
    signal,
    current,
  ).catch(async (error) => {
    await handleGenerationError(error, journal, current);
    throw error;
  });
  assertCurrent(current);
  if (signal.aborted) return null;
  const run = validateRun(response.data, journal.tripId);
  if (
    run.result?.candidates.some(
      (candidate) => Date.parse(candidate.expiresAt) <= Date.now(),
    )
  ) {
    const error = new ApiError({ status: 410, code: 'RESULT_EXPIRED' });
    await handleGenerationError(error, journal, current);
    throw error;
  }
  if (
    run.result &&
    run.result.baseScheduleVersionId !==
      journal.command.expectedActiveScheduleVersionId
  )
    throw new Error('생성 기준 일정이 일치하지 않아요.');
  if (
    run.runId !== journal.runId ||
    run.commandInputHash !== journal.commandInputHash
  )
    throw new Error('생성 작업의 입력이 일치하지 않아요.');
  useGenerationStore.setState({ run });
  if (run.status === 'succeeded' && run.result?.outcome === 'success') {
    const candidate = run.result.candidates.find((c) =>
      journal.apply
        ? c.candidateId === journal.apply.candidateId
        : c.strategy === 'balanced',
    );
    if (!candidate) throw new Error('적용 중인 후보를 확인할 수 없어요.');
    await selectGenerationCandidate(candidate.candidateId);
  }
  return { run, retryAfterSeconds: response.retryAfterSeconds ?? 2 };
}

export async function selectGenerationCandidate(candidateId: string) {
  enabled();
  const current = scope();
  const state = useGenerationStore.getState();
  if (state.busy) throw new Error('후보를 확인 중이에요.');
  const candidate = state.run?.result?.candidates.find(
    (c) => c.candidateId === candidateId,
  );
  if (
    !candidate ||
    !state.journal ||
    Date.parse(candidate.expiresAt) <= Date.now()
  )
    throw new Error('후보가 만료됐어요. 다시 생성해 주세요.');
  if (state.journal.apply && state.journal.apply.candidateId !== candidateId)
    throw new Error('이전 적용 결과를 먼저 확인해 주세요.');
  useGenerationStore.setState({ busy: true, candidate: null, review: null });
  try {
    const response = await getCandidateSchedule(candidate, current);
    assertCurrent(current);
    if (
      response.data.scheduleVersion.scheduleVersionId !==
        candidate.scheduleVersionId ||
      response.data.tripId !== state.journal.tripId ||
      Date.parse(candidate.expiresAt) <= Date.now()
    )
      throw new Error('후보 일정이 만료됐거나 버전이 일치하지 않아요.');
    const places = scheduleToPlaces(response.data);
    const review = scheduleToReviews(response.data, places)[
      state.journal.dayNo
    ];
    if (!review) throw new Error('해당 날짜의 후보 일정이 없어요.');
    useGenerationStore.setState({
      candidate,
      review: { ...review, mode: 'ai', summary: candidate.explanation },
    });
  } finally {
    if (current()) useGenerationStore.setState({ busy: false });
  }
}

export async function applyGeneration() {
  enabled();
  const current = scope();
  const { candidate, journal, busy } = useGenerationStore.getState();
  if (busy || !candidate || !journal)
    throw new Error('적용할 후보를 먼저 확인해 주세요.');
  if (!journal.apply && Date.parse(candidate.expiresAt) <= Date.now())
    throw new Error('후보가 만료됐어요. 다시 생성해 주세요.');
  useGenerationStore.setState({ busy: true });
  try {
    let pending = journal;
    if (!pending.apply) {
      const latest = await fetchTrip(journal.tripId);
      assertCurrent(current);
      if (!latest.etag) throw new Error('최신 여행 버전을 확인할 수 없어요.');
      pending = {
        ...journal,
        apply: {
          candidateId: candidate.candidateId,
          scheduleVersionId: candidate.scheduleVersionId,
          key: createIdempotencyKey(),
          etag: latest.etag,
        },
      };
      await write(pending, current);
    }
    return await completeApplication(pending, current);
  } finally {
    if (current()) useGenerationStore.setState({ busy: false });
  }
}

/** 응답 유실 후 재시작에서는 후보 본문 재조회 없이 원래 적용 키로 receipt를 확인한다. */
export async function resumeGenerationApplication() {
  enabled();
  const current = scope();
  const { journal, busy } = useGenerationStore.getState();
  if (!journal?.apply || busy) throw new Error('적용 요청을 확인 중이에요.');
  useGenerationStore.setState({ busy: true });
  try {
    return await completeApplication(journal, current);
  } finally {
    if (current()) useGenerationStore.setState({ busy: false });
  }
}

async function completeApplication(journal: Journal, current: () => boolean) {
  const pending = journal.apply!;
  const applied = await applyCandidate(
    {
      applyUrl: `/api/v1/trips/${journal.tripId}/schedule-generations/${journal.runId}/candidates/${pending.candidateId}/apply`,
    },
    journal.command.expectedActiveScheduleVersionId,
    pending.etag,
    pending.key,
    current,
  ).catch(async (error) => {
    await handleGenerationError(error, journal, current);
    throw error;
  });
  assertCurrent(current);
  if (applied.data.activeScheduleVersionId !== pending.scheduleVersionId)
    throw new Error('적용 응답의 버전이 일치하지 않아요.');
  const [trip, schedule] = await Promise.all([
    fetchTrip(journal.tripId),
    fetchSchedule(journal.tripId),
  ]);
  assertCurrent(current);
  const places = scheduleToPlaces(schedule);
  useTripStore.setState({ serverTrip: trip.data, etag: trip.etag });
  useScheduleStore.setState({
    activeVersionId: schedule.scheduleVersion.scheduleVersionId,
    versionNo: schedule.scheduleVersion.versionNo,
    places,
    reviews: scheduleToReviews(schedule, places),
  });
  await AsyncStorage.removeItem(keyOf(journal));
  assertCurrent(current);
  // 완료 콜백이 이동하기 전 loading effect를 취소하지 않도록 메모리 receipt 식별자는 유지한다.
  useGenerationStore.setState({ ...empty, journal });
  return (
    trip.data.days.find(
      (day) => !schedule.days.find((d) => d.dayNo === day.dayNo)?.items.length,
    )?.dayNo ?? journal.dayNo
  );
}

async function handleGenerationError(
  error: unknown,
  journal: Journal,
  current: () => boolean,
) {
  assertCurrent(current);
  if (!isApiError(error) || ![400, 409, 410, 412, 422].includes(error.status))
    return;
  // 서버가 명확히 거부한 만료/충돌만 폐기한다. 통신 유실의 원래 키는 유지한다.
  await AsyncStorage.removeItem(keyOf(journal));
  assertCurrent(current);
  useGenerationStore.setState(empty);
  if ([409, 412].includes(error.status)) {
    const latest = await fetchTrip(journal.tripId);
    assertCurrent(current);
    useTripStore.setState({
      serverTrip: latest.data,
      etag: latest.etag,
      saved: false,
    });
  }
}

export async function discardFinishedGeneration() {
  const current = scope();
  const { journal, run } = useGenerationStore.getState();
  if (
    !journal ||
    journal.apply ||
    !run ||
    !['succeeded', 'failed', 'cancelled'].includes(run.status)
  )
    return;
  await AsyncStorage.removeItem(keyOf(journal));
  assertCurrent(current);
  useGenerationStore.setState(empty);
}
