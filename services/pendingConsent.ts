import AsyncStorage from '@react-native-async-storage/async-storage';

import { updateLegalConsents } from './api/legal';
import { ApiError } from './api/problem';

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

let inFlight: Promise<'submitted' | 'none' | 'needs_review'> | null = null;

export async function submitPendingConsentIntent(
  userId: string,
): Promise<'submitted' | 'none' | 'needs_review'> {
  if (!userId) return 'none';
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const intent = parseIntent(raw);
    if (!intent) {
      if (raw) await clearPendingConsentIntent();
      return 'none';
    }
    if (intent.status === 'needs_review') return 'needs_review';
    try {
      await updateLegalConsents(
        intent.documents.map(({ documentId }) => ({
          documentId,
          agreed: true,
        })),
      );
      if ((await AsyncStorage.getItem(STORAGE_KEY)) === raw) {
        await clearPendingConsentIntent();
      }
      return 'submitted';
    } catch (error) {
      if ((await AsyncStorage.getItem(STORAGE_KEY)) === raw) {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...intent, status: 'needs_review' }),
        );
      }
      throw error;
    }
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
