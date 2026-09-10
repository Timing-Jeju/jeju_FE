import AsyncStorage from '@react-native-async-storage/async-storage';

import { useUserStore } from '@/store/useUserStore';
import { updateLegalConsents } from './api/legal';
import { ApiError } from './api/problem';

const STORAGE_KEY = 'timing-jeju.pending-legal-consent.v1';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PendingConsentDocument {
  documentId: string;
  version: string;
}

interface PendingIntent {
  status: 'pending';
  documents: PendingConsentDocument[];
}

interface OwnedReviewIntent {
  status: 'needs_review';
  documents: PendingConsentDocument[];
}

interface StoredConsentIntents {
  schemaVersion: 2;
  unowned?: PendingIntent;
  byOwner: Record<string, OwnedReviewIntent>;
}

type SubmissionResult = 'submitted' | 'none' | 'needs_review';

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

const validOwnerId = (value: string) => value.length > 0 && value.length <= 128;

const parseStoredIntents = (
  value: string | null,
): StoredConsentIntents | null => {
  if (!value) return { schemaVersion: 2, byOwner: {} };
  try {
    const candidate = JSON.parse(value) as Partial<StoredConsentIntents>;
    if (
      candidate.schemaVersion !== 2 ||
      !candidate.byOwner ||
      typeof candidate.byOwner !== 'object' ||
      Array.isArray(candidate.byOwner)
    ) {
      return null;
    }
    if (
      candidate.unowned !== undefined &&
      (candidate.unowned.status !== 'pending' ||
        !Array.isArray(candidate.unowned.documents) ||
        !validDocuments(candidate.unowned.documents))
    ) {
      return null;
    }
    for (const [ownerUserId, intent] of Object.entries(candidate.byOwner)) {
      if (
        !validOwnerId(ownerUserId) ||
        intent.status !== 'needs_review' ||
        !Array.isArray(intent.documents) ||
        !validDocuments(intent.documents)
      ) {
        return null;
      }
    }
    return candidate as StoredConsentIntents;
  } catch {
    return null;
  }
};

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

export function savePendingConsentIntent(
  documents: PendingConsentDocument[],
): Promise<void> {
  if (!validDocuments(documents)) {
    return Promise.reject(
      new ApiError({
        status: 400,
        code: 'INVALID_PROFILE_LEGAL_REQUEST',
      }),
    );
  }
  return enqueueIntentTask(async () => {
    const stored = parseStoredIntents(await AsyncStorage.getItem(STORAGE_KEY));
    if (!stored) throw new ApiError({ status: 400, code: 'REQUEST_FAILED' });
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...stored,
        unowned: { status: 'pending', documents },
      }),
    );
  });
}

/** 현재 사용자에게 귀속된 검토 intent만 지운다. */
export function clearPendingConsentIntent(userId: string): Promise<void> {
  if (!validOwnerId(userId)) return Promise.resolve();
  return enqueueIntentTask(async () => {
    const stored = parseStoredIntents(await AsyncStorage.getItem(STORAGE_KEY));
    if (!stored?.byOwner[userId]) return;
    const { [userId]: _removed, ...byOwner } = stored.byOwner;
    const next = { ...stored, byOwner };
    if (!next.unowned && Object.keys(byOwner).length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  });
}

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
    const stored = parseStoredIntents(raw);
    if (!stored) {
      if (raw && (await AsyncStorage.getItem(STORAGE_KEY)) === raw) {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      return 'none';
    }
    if (stored.byOwner[userId]) return 'needs_review';
    const intent = stored.unowned;
    if (!intent) return 'none';
    if (!authContextIsCurrent()) throw authenticationError();
    if ((await AsyncStorage.getItem(STORAGE_KEY)) !== raw) return 'none';

    // 계정별 durable attempted 상태를 전송 전에 원자 기록한다. 응답 전에
    // 종료되어도 이 사용자는 명시적으로 재동의하기 전까지 자동 PUT하지 않는다.
    const attempted: StoredConsentIntents = {
      schemaVersion: 2,
      byOwner: {
        ...stored.byOwner,
        [userId]: {
          status: 'needs_review',
          documents: intent.documents,
        },
      },
    };
    const attemptedRaw = JSON.stringify(attempted);
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
      const { [userId]: _removed, ...byOwner } = attempted.byOwner;
      if (Object.keys(byOwner).length === 0) {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...attempted, byOwner }),
        );
      }
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
