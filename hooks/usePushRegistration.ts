import { useEffect } from 'react';
import { AppState } from 'react-native';

import { deletePushDevice, registerPushDevice } from '@/services/api/push';
import {
  registerAfterSignOutFailure,
  registerBeforeSignOut,
} from '@/services/authLifecycle';
import { getStableDeviceId } from '@/services/deviceId';
import {
  configurePushPresentation,
  pushNativeAdapter,
} from '@/services/pushNative';
import { createPushRegistrationController } from '@/services/pushRegistration';

const controller = createPushRegistrationController({
  native: pushNativeAdapter,
  getDeviceId: getStableDeviceId,
  register: registerPushDevice,
  remove: deletePushDevice,
});

let presentationConfigured = false;

/** 로그인 세션 동안 기존 권한과 token을 동기화한다. 권한 prompt는 UI action만 요청한다. */
export function usePushRegistration(userId: string | null) {
  useEffect(() => {
    if (!presentationConfigured) {
      presentationConfigured = true;
      void configurePushPresentation().catch(() => undefined);
    }
    if (!userId) return;

    let active = true;
    const sync = () => {
      if (active) void controller.sync(userId);
    };
    sync();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    const unsubscribeToken = controller.subscribeTokenRefresh(userId);
    const unregisterBeforeSignOut = registerBeforeSignOut(
      async (signedOutId) => {
        if (signedOutId === userId) await controller.unregister(userId);
      },
    );
    const unregisterAfterFailure = registerAfterSignOutFailure(
      async (signedOutId) => {
        if (signedOutId === userId) await controller.sync(userId);
      },
    );
    return () => {
      active = false;
      appState.remove();
      unsubscribeToken();
      unregisterBeforeSignOut();
      unregisterAfterFailure();
    };
  }, [userId]);
}

/** 후속 마이페이지 연결에서 사용자 탭 직후 호출할 명시적 permission action. */
export const requestPushPermission = (userId: string) =>
  controller.requestPermissionAndSync(userId);
