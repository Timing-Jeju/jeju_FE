import type { components } from '../generated/backend';
import { requestData } from './http';

export type TripSchedule = components['schemas']['ScheduleResponse'];

/** 공개 Spring 일정 조회. AI 생성·조회·적용 endpoint를 대신하지 않는다. */
export const fetchSchedule = (tripId: string, versionId?: string) =>
  requestData<TripSchedule>({
    method: 'GET',
    path: `/trips/${encodeURIComponent(tripId)}/schedule`,
    auth: 'required',
    params: { versionId },
  });
