import type {
  PushDeviceRegistrationRequest,
  PushPermissionStatus,
  PushPlatform,
} from './api/push';

export interface PushNativeAdapter {
  readonly supported: boolean;
  readonly platform: PushPlatform;
  readonly appVersion: string;
  readonly locale: string;
  readonly timeZone: string;
  getPermissionStatus(): Promise<PushPermissionStatus>;
  requestPermission(): Promise<PushPermissionStatus>;
  getRegistrationToken(): Promise<string | null>;
  subscribeTokenRefresh(listener: () => void): () => void;
}

export type PushRegistrationResult =
  | { status: 'registered' }
  | { status: 'permission-denied' }
  | { status: 'not-determined' }
  | { status: 'unavailable' };

interface Dependencies {
  native: PushNativeAdapter;
  getDeviceId(): Promise<string>;
  register(
    deviceId: string,
    body: PushDeviceRegistrationRequest,
    signal?: AbortSignal,
  ): Promise<unknown>;
  remove(deviceId: string, signal?: AbortSignal): Promise<void>;
}

type Intent = 'passive' | 'prompt';

interface Session {
  readonly userId: string;
  readonly generation: number;
  abort: AbortController;
  closing: boolean;
  dirty: Intent | null;
  pending: Promise<PushRegistrationResult> | null;
  closingPromise: Promise<void> | null;
}

const unavailable = { status: 'unavailable' } as const;

/** 권한·token·계정·로그아웃을 한 세대별 직렬 경로로 처리한다. */
export function createPushRegistrationController(dependencies: Dependencies) {
  let generation = 0;
  let active: Session | null = null;
  let registeredUserId: string | null = null;

  const usable = (session: Session) =>
    dependencies.native.supported &&
    active === session &&
    active.generation === session.generation &&
    !session.closing &&
    !session.abort.signal.aborted;

  const activate = (userId: string | null) => {
    if (active?.userId === userId && !active.closing) return;
    active?.abort.abort();
    generation += 1;
    active = userId
      ? {
          userId,
          generation,
          abort: new AbortController(),
          closing: false,
          dirty: null,
          pending: null,
          closingPromise: null,
        }
      : null;
  };

  const deactivate = (userId: string) => {
    if (active?.userId !== userId) return;
    active.abort.abort();
    active.dirty = null;
    generation += 1;
    active = null;
  };

  const removeCurrentDevice = async (
    session: Session,
    signal?: AbortSignal,
  ) => {
    try {
      const deviceId = await dependencies.getDeviceId();
      if (signal && !usable(session)) return false;
      await dependencies.remove(deviceId, signal);
      return true;
    } catch {
      return false;
    }
  };

  const perform = async (
    session: Session,
    intent: Intent,
  ): Promise<PushRegistrationResult> => {
    if (!usable(session)) return unavailable;
    try {
      const permission =
        intent === 'prompt'
          ? await dependencies.native.requestPermission()
          : await dependencies.native.getPermissionStatus();
      if (!usable(session)) return unavailable;
      if (permission !== 'GRANTED') {
        if (permission === 'DENIED' || registeredUserId === session.userId) {
          await removeCurrentDevice(session, session.abort.signal);
          if (usable(session)) registeredUserId = null;
        }
        return {
          status:
            permission === 'DENIED' ? 'permission-denied' : 'not-determined',
        };
      }

      const registrationToken =
        await dependencies.native.getRegistrationToken();
      if (!usable(session)) return unavailable;
      if (!registrationToken) return unavailable;
      const deviceId = await dependencies.getDeviceId();
      if (!usable(session)) return unavailable;
      await dependencies.register(
        deviceId,
        {
          platform: dependencies.native.platform,
          registrationToken,
          permissionStatus: permission,
          appVersion: dependencies.native.appVersion,
          locale: dependencies.native.locale,
          timeZone: dependencies.native.timeZone,
        },
        session.abort.signal,
      );
      if (!usable(session)) return unavailable;
      registeredUserId = session.userId;
      return { status: 'registered' };
    } catch {
      return unavailable;
    }
  };

  const run = (userId: string, intent: Intent, rerunWhenPending: boolean) => {
    const session = active?.userId === userId ? active : null;
    if (!session || !usable(session)) return Promise.resolve(unavailable);
    if (session.pending) {
      // token/prompt intent만 dirty로 남긴다. 중복 mount sync는 같은 결과를 공유한다.
      if (rerunWhenPending) {
        session.dirty =
          session.dirty === 'prompt' || intent === 'prompt'
            ? 'prompt'
            : 'passive';
      }
      return session.pending;
    }

    const pump = async () => {
      let next: Intent | null = intent;
      let result: PushRegistrationResult = unavailable;
      while (next && usable(session)) {
        session.dirty = null;
        result = await perform(session, next);
        next = session.dirty;
      }
      return result;
    };
    const promise = pump().finally(() => {
      if (session.pending === promise) session.pending = null;
    });
    session.pending = promise;
    return promise;
  };

  const unregister = (userId: string): Promise<void> => {
    if (!dependencies.native.supported) return Promise.resolve();
    const session = active?.userId === userId ? active : null;
    if (!session) return Promise.resolve();
    if (session.closing) return session.closingPromise ?? Promise.resolve();

    // 호출 즉시 닫아 새 AppState/token/UI intent를 차단한다.
    session.closing = true;
    session.dirty = null;
    const preceding = session.pending;
    const operation = (async () => {
      if (preceding) await preceding.catch(() => unavailable);
      if (active !== session) return;
      await removeCurrentDevice(session);
      registeredUserId = null;
    })();
    session.closingPromise = operation;
    return operation;
  };

  return {
    activate,
    deactivate,
    sync: (userId: string) => run(userId, 'passive', false),
    requestPermissionAndSync: (userId: string) => run(userId, 'prompt', true),
    unregister,
    subscribeTokenRefresh: (userId: string) => {
      const session = active?.userId === userId ? active : null;
      if (!session || !usable(session)) return () => {};
      return dependencies.native.subscribeTokenRefresh(() => {
        void run(userId, 'passive', true);
      });
    },
  };
}
