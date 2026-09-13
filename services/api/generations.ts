import { request } from './http';
import { isCanonicalUuid } from './idempotency';
import type { TripSchedule } from './schedule';

/** BE #89 candidate contract. Feature stays off until deployed contract verification. */
export type Strategy = 'balanced' | 'relaxed' | 'experience_max';
export const strategyLabels: Record<Strategy, string> = {
  balanced: '균형형',
  relaxed: '여유형',
  experience_max: '경험 최대형',
};
export interface Candidate {
  candidateId: string;
  scheduleVersionId: string;
  strategy: Strategy;
  rank: number;
  expiresAt: string;
  explanation: string;
  scheduleUrl: string;
  applyUrl: string;
}
export interface GenerationRun {
  runId: string;
  pollUrl: string;
  commandInputHash: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  result?: {
    outcome: 'success' | 'insufficient_feasible_routes';
    baseScheduleVersionId: string | null;
    candidates: Candidate[];
  };
}
export interface GenerationCommand {
  targetDayId: string;
  expectedActiveScheduleVersionId: string | null;
  candidateCount: 3;
}
export const generationPath = (tripId: string) => {
  if (!isCanonicalUuid(tripId)) throw new Error('여행 식별자를 확인해 주세요.');
  return `/trips/${tripId}/schedule-generations`;
};
export function validateRun(
  value: GenerationRun,
  tripId: string,
): GenerationRun {
  const base = generationPath(tripId);
  if (
    !isCanonicalUuid(value.runId) ||
    value.pollUrl !== `/api/v1${base}/${value.runId}` ||
    !/^[a-f0-9]{64}$/.test(value.commandInputHash) ||
    !['queued', 'running', 'succeeded', 'failed', 'cancelled'].includes(
      value.status,
    )
  )
    throw new Error('생성 작업 응답을 확인할 수 없어요.');
  if (value.status === 'succeeded') {
    const result = value.result;
    if (!result || !Array.isArray(result.candidates))
      throw new Error('후보 응답이 없어요.');
    if (
      result.outcome === 'insufficient_feasible_routes' &&
      result.candidates.length === 0
    )
      return value;
    if (
      result.outcome !== 'success' ||
      result.candidates.length !== 3 ||
      new Set(result.candidates.map((c) => c.strategy)).size !== 3 ||
      new Set(result.candidates.map((c) => c.candidateId)).size !== 3 ||
      new Set(result.candidates.map((c) => c.scheduleVersionId)).size !== 3 ||
      result.candidates.some(
        (c) =>
          !Object.hasOwn(strategyLabels, c.strategy) ||
          !isCanonicalUuid(c.candidateId) ||
          !isCanonicalUuid(c.scheduleVersionId) ||
          !Number.isFinite(Date.parse(c.expiresAt)) ||
          // 24시간 만료는 서버가 판정한다. 단말 시계로 유효기간을 축소하지 않는다.
          typeof c.explanation !== 'string' ||
          c.applyUrl !==
            `/api/v1${base}/${value.runId}/candidates/${c.candidateId}/apply` ||
          c.scheduleUrl !==
            `/api/v1/trips/${tripId}/schedule-versions/${c.scheduleVersionId}`,
      )
    )
      throw new Error(
        '서로 다른 세 후보를 확인할 수 없어요. 다시 생성해 주세요.',
      );
  }
  return value;
}
export const startGeneration = (
  tripId: string,
  body: GenerationCommand,
  etag: string,
  key: string,
  current: () => boolean,
) =>
  request<GenerationRun>({
    method: 'POST',
    path: generationPath(tripId),
    body,
    auth: 'required',
    headers: { 'If-Match': etag, 'Idempotency-Key': key },
    authContextIsCurrent: current,
  });
export const getGeneration = (
  tripId: string,
  runId: string,
  signal: AbortSignal,
  current: () => boolean,
) => {
  if (!isCanonicalUuid(runId))
    throw new Error('생성 작업 식별자를 확인해 주세요.');
  return request<GenerationRun>({
    method: 'GET',
    path: `${generationPath(tripId)}/${runId}`,
    auth: 'required',
    signal,
    authContextIsCurrent: current,
  });
};
export const getCandidateSchedule = (
  candidate: Candidate,
  current: () => boolean,
) =>
  request<TripSchedule>({
    method: 'GET',
    path: candidate.scheduleUrl.slice('/api/v1'.length),
    auth: 'required',
    authContextIsCurrent: current,
  });
export const applyCandidate = (
  candidate: Pick<Candidate, 'applyUrl'>,
  expectedActiveScheduleVersionId: string | null,
  etag: string,
  key: string,
  current: () => boolean,
) =>
  request<{ activeScheduleVersionId: string }>({
    method: 'POST',
    path: candidate.applyUrl.slice('/api/v1'.length),
    body: { expectedActiveScheduleVersionId },
    auth: 'required',
    headers: { 'If-Match': etag, 'Idempotency-Key': key },
    authContextIsCurrent: current,
  });
