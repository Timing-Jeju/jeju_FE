import { ApiError } from './api/problem';
import { submitPendingConsentIntent } from './pendingConsent';
import { useProfileLegalStore } from '@/store/useProfileLegalStore';
import { useUserStore } from '@/store/useUserStore';

/** 인증 구독보다 먼저 시작해 실제 사용자 전환에만 pending mutation을 한 번 제출한다. */
export function startPendingConsentSync(): () => void {
  let active = true;
  let lastIdentityKey: string | null = null;

  const submitFor = async (userId: string, authGeneration: number) => {
    const authContextIsCurrent = () => {
      const current = useUserStore.getState();
      return (
        current.userId === userId && current.authGeneration === authGeneration
      );
    };
    try {
      const result = await submitPendingConsentIntent(userId);
      if (!active || !authContextIsCurrent() || result !== 'needs_review')
        return;
      throw new ApiError({ status: 409, code: 'PROFILE_CONFLICT' });
    } catch (error) {
      if (!active || !authContextIsCurrent()) return;
      useProfileLegalStore.getState().recordConsentError(error);
      await useProfileLegalStore
        .getState()
        .loadLegalDocuments()
        .catch(() => undefined);
    }
  };

  const observe = (userId: string | null, authGeneration: number) => {
    if (!userId) {
      lastIdentityKey = null;
      return;
    }
    const identityKey = `${authGeneration}:${userId}`;
    if (identityKey === lastIdentityKey) return;
    lastIdentityKey = identityKey;
    void submitFor(userId, authGeneration);
  };

  const unsubscribe = useUserStore.subscribe((state) =>
    observe(state.userId, state.authGeneration),
  );
  const initial = useUserStore.getState();
  observe(initial.userId, initial.authGeneration);
  return () => {
    active = false;
    unsubscribe();
  };
}
