import {
  fetchNotificationPreference,
  updateNotificationPreference,
  type NotificationPreference,
  type NotificationPreferencePatch,
} from './api/push';
import { ApiError, hasCode } from './api/problem';

export interface NotificationPreferenceApi {
  fetch(signal?: AbortSignal): Promise<NotificationPreference>;
  update(
    patch: NotificationPreferencePatch,
    signal?: AbortSignal,
  ): Promise<NotificationPreference>;
}

type PreferenceState =
  | { status: 'idle' | 'loading' | 'unavailable' }
  | { status: 'ready' | 'conflict'; preference: NotificationPreference };

interface Session {
  readonly userId: string;
  readonly generation: number;
  readonly abort: AbortController;
  revision: number;
  tail: Promise<unknown>;
}

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

/** 인증 세대마다 cache와 mutation queue를 격리한다. */
export function createNotificationPreferenceController(
  api: NotificationPreferenceApi = defaultApi,
) {
  const states = new Map<string, PreferenceState>();
  let generation = 0;
  let active: Session | null = null;

  const isCurrent = (session: Session) =>
    active === session &&
    active.generation === session.generation &&
    !session.abort.signal.aborted;

  const activate = (userId: string | null) => {
    if (active?.userId === userId) return;
    active?.abort.abort();
    generation += 1;
    active = userId
      ? {
          userId,
          generation,
          abort: new AbortController(),
          revision: 0,
          tail: Promise.resolve(),
        }
      : null;
  };

  const deactivate = (userId: string) => {
    if (active?.userId !== userId) return;
    active.abort.abort();
    generation += 1;
    active = null;
  };

  const sessionFor = (userId: string) =>
    active?.userId === userId ? active : null;

  const currentGeneration = (userId: string) =>
    sessionFor(userId)?.generation ?? null;

  const snapshot = (userId: string): PreferenceState =>
    active?.userId === userId
      ? (states.get(userId) ?? { status: 'idle' })
      : { status: 'idle' };

  const load = async (userId: string): Promise<PreferenceState> => {
    const session = sessionFor(userId);
    if (!session) return { status: 'unavailable' };
    const revision = ++session.revision;
    states.set(userId, { status: 'loading' });
    try {
      const preference = await api.fetch(session.abort.signal);
      const state = { status: 'ready', preference } as const;
      if (isCurrent(session) && revision === session.revision) {
        states.set(userId, state);
        return state;
      }
    } catch {
      if (isCurrent(session) && revision === session.revision) {
        const state = { status: 'unavailable' } as const;
        states.set(userId, state);
        return state;
      }
    }
    return snapshot(userId);
  };

  const update = (userId: string, patch: NotificationPreferencePatch) => {
    validatePatch(patch);
    const session = sessionFor(userId);
    if (!session) {
      return Promise.resolve({ status: 'unavailable' } as const);
    }
    // 호출 시점에 revision을 예약하므로 이미 진행 중인 GET도 이 PATCH보다 오래된 값이다.
    const revision = ++session.revision;
    const operation = session.tail
      .catch(() => undefined)
      .then(async (): Promise<PreferenceState> => {
        if (!isCurrent(session)) return { status: 'unavailable' };
        try {
          const preference = await api.update(patch, session.abort.signal);
          const state = { status: 'ready', preference } as const;
          if (isCurrent(session) && revision === session.revision) {
            states.set(userId, state);
          }
          return isCurrent(session) ? state : { status: 'unavailable' };
        } catch (error) {
          if (!isCurrent(session)) return { status: 'unavailable' };
          if (hasCode(error, 'CONFLICT', 'PRECONDITION_FAILED')) {
            try {
              const preference = await api.fetch(session.abort.signal);
              const state = { status: 'conflict', preference } as const;
              if (isCurrent(session) && revision === session.revision) {
                states.set(userId, state);
              }
              return isCurrent(session) ? state : { status: 'unavailable' };
            } catch {
              // 최신값을 얻지 못하면 충돌을 성공으로 표시하지 않는다.
            }
          }
          const state = { status: 'unavailable' } as const;
          if (isCurrent(session) && revision === session.revision) {
            states.set(userId, state);
          }
          return state;
        }
      });
    session.tail = operation;
    return operation;
  };

  return {
    activate,
    deactivate,
    currentGeneration,
    snapshot,
    load,
    update,
  };
}
