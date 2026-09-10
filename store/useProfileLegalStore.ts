import { create } from 'zustand';

import {
  fetchLegalDocuments,
  updateLegalConsents,
  type LegalDocument,
} from '@/services/api/legal';
import {
  fetchProfile,
  updateProfile,
  type Profile,
} from '@/services/api/profile';
import { ApiError, isApiError } from '@/services/api/problem';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type MutationStatus = 'idle' | 'saving' | 'error';

interface ProfileLegalState {
  ownerUserId: string | null;
  profile: Profile | null;
  profileStatus: LoadStatus;
  profileError: string | null;
  legalDocuments: LegalDocument[];
  legalStatus: LoadStatus;
  legalError: string | null;
  consentStatus: MutationStatus;
  consentError: string | null;
  recordConsentError(error: unknown): void;
  resetForUser(userId: string | null): void;
  loadProfile(userId: string): Promise<void>;
  saveNickname(userId: string, nickname: string): Promise<void>;
  loadLegalDocuments(): Promise<void>;
  saveRequiredConsents(userId: string, agreedIds: Set<string>): Promise<void>;
}

let epoch = 0;

const errorMessage = (error: unknown) =>
  isApiError(error) ? error.message : '서버에 연결하지 못했습니다.';

const emptyState = (ownerUserId: string | null) => ({
  ownerUserId,
  profile: null,
  profileStatus: 'idle' as const,
  profileError: null,
  legalDocuments: [],
  legalStatus: 'idle' as const,
  legalError: null,
  consentStatus: 'idle' as const,
  consentError: null,
});

export const useProfileLegalStore = create<ProfileLegalState>((set, get) => ({
  ...emptyState(null),
  resetForUser: (userId) => {
    epoch += 1;
    set(emptyState(userId));
  },
  recordConsentError: (error) =>
    set({ consentStatus: 'error', consentError: errorMessage(error) }),
  loadProfile: async (userId) => {
    if (get().ownerUserId !== userId) get().resetForUser(userId);
    const started = epoch;
    set({ profileStatus: 'loading', profileError: null });
    try {
      const profile = await fetchProfile();
      if (started !== epoch || get().ownerUserId !== userId) return;
      if (profile.userId !== userId) {
        throw new ApiError({ status: 401, code: 'INVALID_ACCESS_TOKEN' });
      }
      set({ profile, profileStatus: 'ready' });
    } catch (error) {
      if (started !== epoch || get().ownerUserId !== userId) return;
      set({ profileStatus: 'error', profileError: errorMessage(error) });
      throw error;
    }
  },
  saveNickname: async (userId, nickname) => {
    if (get().ownerUserId !== userId) get().resetForUser(userId);
    const started = epoch;
    set({ profileStatus: 'loading', profileError: null });
    try {
      const profile = await updateProfile({ nickname: nickname.trim() });
      if (started !== epoch || get().ownerUserId !== userId) return;
      if (profile.userId !== userId) {
        throw new ApiError({ status: 401, code: 'INVALID_ACCESS_TOKEN' });
      }
      set({ profile, profileStatus: 'ready' });
    } catch (error) {
      if (started !== epoch || get().ownerUserId !== userId) return;
      set({ profileStatus: 'error', profileError: errorMessage(error) });
      throw error;
    }
  },
  loadLegalDocuments: async () => {
    const started = epoch;
    set({ legalStatus: 'loading', legalError: null });
    try {
      const response = await fetchLegalDocuments('ko-KR');
      if (started !== epoch) return;
      set({ legalDocuments: response.items, legalStatus: 'ready' });
    } catch (error) {
      if (started !== epoch) return;
      set({ legalStatus: 'error', legalError: errorMessage(error) });
      throw error;
    }
  },
  saveRequiredConsents: async (userId, agreedIds) => {
    const required = get().legalDocuments.filter((item) => item.required);
    if (required.some((item) => !agreedIds.has(item.documentId))) {
      const error = new ApiError({
        status: 422,
        code: 'LEGAL_CONSENT_REQUIRED',
      });
      set({ consentStatus: 'error', consentError: error.message });
      throw error;
    }
    if (get().ownerUserId !== userId) {
      set({ ownerUserId: userId, profile: null });
    }
    const started = epoch;
    set({ consentStatus: 'saving', consentError: null });
    try {
      await updateLegalConsents(
        get().legalDocuments.map((item) => ({
          documentId: item.documentId,
          agreed: agreedIds.has(item.documentId),
        })),
      );
      if (started !== epoch || get().ownerUserId !== userId) return;
      set({ consentStatus: 'idle' });
    } catch (error) {
      if (started !== epoch || get().ownerUserId !== userId) return;
      set({ consentStatus: 'error', consentError: errorMessage(error) });
      throw error;
    }
  },
}));
