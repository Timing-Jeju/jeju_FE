import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'timing-jeju:schedule-mutation:v1';

export interface ScheduleMutationLocks {
  etag: string;
  expectedActiveScheduleVersionId: string;
}

export interface ScheduleMutationCompletion {
  activeScheduleVersionId: string;
  etag: string;
  versionNo: number;
}

export interface ScheduleMutationJournal {
  version: 1;
  userId: string | null;
  tripId: string;
  fingerprint: string;
  idempotencyKey: string;
  locks: ScheduleMutationLocks;
  request: unknown;
  completion: ScheduleMutationCompletion | null;
}

const isJournal = (value: unknown): value is ScheduleMutationJournal => {
  if (!value || typeof value !== 'object') return false;
  const journal = value as Partial<ScheduleMutationJournal>;
  return (
    journal.version === 1 &&
    typeof journal.tripId === 'string' &&
    typeof journal.fingerprint === 'string' &&
    typeof journal.idempotencyKey === 'string' &&
    !!journal.locks &&
    typeof journal.locks.etag === 'string' &&
    typeof journal.locks.expectedActiveScheduleVersionId === 'string'
  );
};

export const loadScheduleMutationJournal = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isJournal(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveScheduleMutationJournal = (journal: ScheduleMutationJournal) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(journal));

export const clearScheduleMutationJournal = () =>
  AsyncStorage.removeItem(STORAGE_KEY);
