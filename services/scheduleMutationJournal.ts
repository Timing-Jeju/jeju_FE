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
  operation: 'create' | 'update' | 'delete' | 'move' | 'reorder';
  idempotencyKey: string;
  locks: ScheduleMutationLocks;
  request: unknown;
  completion: ScheduleMutationCompletion | null;
}

const normalizeJournal = (value: unknown): ScheduleMutationJournal | null => {
  if (!value || typeof value !== 'object') return null;
  const journal = value as Partial<ScheduleMutationJournal>;
  const operation =
    journal.operation ??
    (typeof journal.fingerprint === 'string'
      ? journal.fingerprint.split(':', 1)[0]
      : '');
  if (
    journal.version === 1 &&
    typeof journal.tripId === 'string' &&
    typeof journal.fingerprint === 'string' &&
    ['create', 'update', 'delete', 'move', 'reorder'].includes(operation) &&
    typeof journal.idempotencyKey === 'string' &&
    !!journal.locks &&
    typeof journal.locks.etag === 'string' &&
    typeof journal.locks.expectedActiveScheduleVersionId === 'string'
  ) {
    return {
      ...(journal as ScheduleMutationJournal),
      operation: operation as ScheduleMutationJournal['operation'],
    };
  }
  return null;
};

export const loadScheduleMutationJournal = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return normalizeJournal(parsed);
  } catch {
    return null;
  }
};

export const saveScheduleMutationJournal = (journal: ScheduleMutationJournal) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(journal));

export const clearScheduleMutationJournal = () =>
  AsyncStorage.removeItem(STORAGE_KEY);
