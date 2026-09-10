import { ApiError } from './api/problem';
import { submitPendingConsentIntent } from './pendingConsent';
import { useProfileLegalStore } from '@/store/useProfileLegalStore';
import { useUserStore } from '@/store/useUserStore';

/** 인증 구독보다 먼저 시작해 실제 사용자 전환에만 pending mutation을 한 번 제출한다. */
export function startPendingConsentSync(): () => void {
  let active = true;
  let lastUserId: string | null = null;

  const submitFor = async (userId: string) => {
    try {
      const result = await submitPendingConsentIntent(userId);
      if (
        !active ||
        useUserStore.getState().userId !== userId ||
        result !== 'needs_review'
      )
        return;
      throw new ApiError({ status: 409, code: 'PROFILE_CONFLICT' });
    } catch (error) {
      if (!active || useUserStore.getState().userId !== userId) return;
      useProfileLegalStore.getState().recordConsentError(error);
      await useProfileLegalStore
        .getState()
        .loadLegalDocuments()
        .catch(() => undefined);
    }
  };

  const observe = (userId: string | null) => {
    if (!userId) {
      lastUserId = null;
      return;
    }
    if (userId === lastUserId) return;
    lastUserId = userId;
    void submitFor(userId);
  };

  const unsubscribe = useUserStore.subscribe((state) => observe(state.userId));
  observe(useUserStore.getState().userId);
  return () => {
    active = false;
    unsubscribe();
  };
}
