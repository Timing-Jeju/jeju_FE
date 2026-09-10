import { useCallback, useEffect, useState } from 'react';

import type { NotificationPreferencePatch } from '@/services/api/push';
import { createNotificationPreferenceController } from '@/services/notificationPreferences';

const controller = createNotificationPreferenceController();

/** 후속 마이페이지 통합용. 상태는 userId별로 격리하고 충돌은 서버 최신값으로 표시한다. */
export function useNotificationPreferences(userId: string | null) {
  const [rendered, setRendered] = useState<{
    userId: string;
    state: ReturnType<typeof controller.snapshot>;
  } | null>(null);

  useEffect(() => {
    controller.activate(userId);
    if (!userId) return;
    let active = true;
    void controller.load(userId).then((state) => {
      if (active) setRendered({ userId, state });
    });
    return () => {
      active = false;
      controller.deactivate(userId);
    };
  }, [userId]);

  const update = useCallback(
    async (patch: NotificationPreferencePatch) => {
      if (!userId) return { status: 'unavailable' } as const;
      const state = await controller.update(userId, patch);
      setRendered({ userId, state });
      return state;
    },
    [userId],
  );

  const state =
    userId && rendered?.userId === userId
      ? rendered.state
      : ({ status: userId ? 'loading' : 'idle' } as const);
  return { state, update };
}
