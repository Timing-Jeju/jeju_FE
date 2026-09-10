import {
  fetchNotificationPreference,
  updateNotificationPreference,
  type NotificationPreference,
  type NotificationPreferencePatch,
} from './api/push';
import { ApiError, hasCode } from './api/problem';

export interface NotificationPreferenceApi {
  fetch(): Promise<NotificationPreference>;
  update(patch: NotificationPreferencePatch): Promise<NotificationPreference>;
}

type PreferenceState =
  | { status: 'idle' | 'loading' | 'unavailable' }
  | {
      status: 'ready' | 'conflict';
      preference: NotificationPreference;
    };

const defaultApi: NotificationPreferenceApi = {
  fetch: fetchNotificationPreference,
  update: updateNotificationPreference,
};

const validatePatch = (patch: NotificationPreferencePatch) => {
  const entries = Object.entries(patch);
  const buffer = patch.safetyBufferMinutes;
  if (
    entries.length === 0 ||
    entries.some(
      ([key]) =>
        key !== 'safetyBufferMinutes' &&
        key !== 'nextDestinationDepartureEnabled',
    ) ||
    (buffer !== undefined &&
      (!Number.isInteger(buffer) || buffer < 0 || buffer > 120)) ||
    (patch.nextDestinationDepartureEnabled !== undefined &&
      typeof patch.nextDestinationDepartureEnabled !== 'boolean')
  ) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_PUSH_NOTIFICATION_REQUEST',
    });
  }
};

/** 사용자별 메모리 cache와 mutation queue를 분리한다. */
export function createNotificationPreferenceController(
  api: NotificationPreferenceApi = defaultApi,
) {
  const states = new Map<string, PreferenceState>();
  const queues = new Map<string, Promise<unknown>>();

  const snapshot = (userId: string): PreferenceState =>
    states.get(userId) ?? { status: 'idle' };

  const load = async (userId: string) => {
    states.set(userId, { status: 'loading' });
    try {
      const preference = await api.fetch();
      const state = { status: 'ready', preference } as const;
      states.set(userId, state);
      return state;
    } catch {
      const state = { status: 'unavailable' } as const;
      states.set(userId, state);
      return state;
    }
  };

  const update = (userId: string, patch: NotificationPreferencePatch) => {
    validatePatch(patch);
    const previous = queues.get(userId) ?? Promise.resolve();
    const operation = previous
      .catch(() => undefined)
      .then(async () => {
        try {
          const preference = await api.update(patch);
          const state = { status: 'ready', preference } as const;
          states.set(userId, state);
          return state;
        } catch (error) {
          if (hasCode(error, 'CONFLICT', 'PRECONDITION_FAILED')) {
            try {
              const preference = await api.fetch();
              const state = { status: 'conflict', preference } as const;
              states.set(userId, state);
              return state;
            } catch {
              // 최신값을 얻지 못하면 충돌을 성공으로 표시하지 않는다.
            }
          }
          const state = { status: 'unavailable' } as const;
          states.set(userId, state);
          return state;
        }
      })
      .finally(() => {
        if (queues.get(userId) === operation) queues.delete(userId);
      });
    queues.set(userId, operation);
    return operation;
  };

  return { snapshot, load, update };
}
