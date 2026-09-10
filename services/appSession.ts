import { startAuthSession } from './auth';
import { startPendingConsentSync } from './pendingConsentSync';

/** pending 구독을 먼저 연결해 초기 세션 복원도 놓치지 않는다. */
export function startAppSession(): () => void {
  const stopPendingConsent = startPendingConsentSync();
  const stopAuth = startAuthSession();
  return () => {
    stopAuth();
    stopPendingConsent();
  };
}
