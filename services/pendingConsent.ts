import AsyncStorage from '@react-native-async-storage/async-storage';

import { updateLegalConsents } from './api/legal';
import { ApiError } from './api/problem';
import { useUserStore } from '@/store/useUserStore';

const STORAGE_KEY = 'timing-jeju.pending-legal-consent.v1';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PendingConsentDocument {
  documentId: string;
  version: string;
}

interface PendingConsentIntent {
  schemaVersion: 1;
  status: 'pending' | 'needs_review';
  ownerUserId?: string;
  documents: PendingConsentDocument[];
}

const validDocuments = (documents: PendingConsentDocument[]) =>
  documents.length > 0 &&
  documents.length <= 20 &&
  new Set(documents.map(({ documentId }) => documentId)).size ===
    documents.length &&
  documents.every(
    ({ documentId, version }) =>
      typeof documentId === 'string' &&
      UUID_PATTERN.test(documentId) &&
      typeof version === 'string' &&
      version.trim().length > 0 &&
      version.length <= 100,
  );

const parseIntent = (value: string | null): PendingConsentIntent | null => {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<PendingConsentIntent>;
    if (
      candidate.schemaVersion !== 1 ||
      (candidate.status !== 'pending' && candidate.status !== 'needs_review') ||
      !Array.isArray(candidate.documents) ||
      (candidate.ownerUserId !== undefined &&
        (typeof candidate.ownerUserId !== 'string' ||
          candidate.ownerUserId.length === 0 ||
          candidate.ownerUserId.length > 128)) ||
      !validDocuments(candidate.documents)
    ) {
      return null;
    }
    return candidate as PendingConsentIntent;
  } catch {
    return null;
  }
};

export async function savePendingConsentIntent(
  documents: PendingConsentDocument[],
): Promise<void> {
  if (!validDocuments(documents)) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_PROFILE_LEGAL_REQUEST',
    });
  }
  const intent: PendingConsentIntent = {
    schemaVersion: 1,
    status: 'pending',
    documents,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}

export const clearPendingConsentIntent = () =>
  AsyncStorage.removeItem(STORAGE_KEY);

type SubmissionResult = 'submitted' | 'none' | 'needs_review';

const inFlightByIdentity = new Map<string, Promise<SubmissionResult>>();
let intentQueue: Promise<void> = Promise.resolve();

const enqueueIntentTask = <T>(task: () => Promise<T>): Promise<T> => {
  const result = intentQueue.then(task, task);
  intentQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const authenticationError = () =>
  new ApiError({ status: 401, code: 'AUTHENTICATION_REQUIRED' });

export async function submitPendingConsentIntent(
  userId: string,
): Promise<SubmissionResult> {
  if (!userId) return 'none';
  const initialAuth = useUserStore.getState();
  if (!initialAuth.isLoggedIn || initialAuth.userId !== userId) {
    throw authenticationError();
  }
  const generation = initialAuth.authGeneration;
  const identityKey = `${generation}:${userId}`;
  const existing = inFlightByIdentity.get(identityKey);
  if (existing) return existing;

  const authContextIsCurrent = () => {
    const current = useUserStore.getState();
    return (
      current.isLoggedIn &&
      current.userId === userId &&
      current.authGeneration === generation
    );
  };

  const submission = enqueueIntentTask(async () => {
    if (!authContextIsCurrent()) throw authenticationError();
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const intent = parseIntent(raw);
    if (!intent) {
      if (raw) await clearPendingConsentIntent();
      return 'none';
    }
    if (intent.status === 'needs_review') return 'needs_review';
    if (!authContextIsCurrent()) throw authenticationError();
    if ((await AsyncStorage.getItem(STORAGE_KEY)) !== raw) return 'none';

    // 전송 전에 durable attempted 상태를 남긴다. 응답 전 프로세스가 종료되어도
    // 다음 시작에서 mutation을 자동 재전송하지 않고 명시적 재동의를 요구한다.
    const attemptedRaw = JSON.stringify({
      ...intent,
      status: 'needs_review',
      ownerUserId: userId,
    });
    await AsyncStorage.setItem(STORAGE_KEY, attemptedRaw);
    if (!authContextIsCurrent()) throw authenticationError();

    await updateLegalConsents(
      intent.documents.map(({ documentId }) => ({
        documentId,
        agreed: true,
      })),
      authContextIsCurrent,
    );
    if ((await AsyncStorage.getItem(STORAGE_KEY)) === attemptedRaw) {
      await clearPendingConsentIntent();
    }
    return 'submitted';
  });
  inFlightByIdentity.set(identityKey, submission);
  try {
    return await submission;
  } finally {
    if (inFlightByIdentity.get(identityKey) === submission) {
      inFlightByIdentity.delete(identityKey);
    }
  }
}
