import type {
  PushDeviceRegistrationRequest,
  PushPermissionStatus,
  PushPlatform,
} from './api/push';

export interface PushNativeAdapter {
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
  ): Promise<unknown>;
  remove(deviceId: string): Promise<void>;
}

/** 권한·token·계정을 직렬화하며 민감값을 결과/오류에 보존하지 않는다. */
export function createPushRegistrationController(dependencies: Dependencies) {
  let pending: {
    userId: string;
    promise: Promise<PushRegistrationResult>;
  } | null = null;
  let tail: Promise<unknown> = Promise.resolve();
  let registeredUserId: string | null = null;

  const removeCurrentDevice = async () => {
    try {
      await dependencies.remove(await dependencies.getDeviceId());
    } catch {
      return false;
    }
    return true;
  };

  const performSync = async (
    userId: string,
    requestPermission: boolean,
  ): Promise<PushRegistrationResult> => {
    try {
      const permission = requestPermission
        ? await dependencies.native.requestPermission()
        : await dependencies.native.getPermissionStatus();
      if (permission !== 'GRANTED') {
        if (permission === 'DENIED' || registeredUserId === userId) {
          await removeCurrentDevice();
          registeredUserId = null;
        }
        return {
          status:
            permission === 'DENIED' ? 'permission-denied' : 'not-determined',
        };
      }
      const registrationToken =
        await dependencies.native.getRegistrationToken();
      if (!registrationToken) return { status: 'unavailable' };
      await dependencies.register(await dependencies.getDeviceId(), {
        platform: dependencies.native.platform,
        registrationToken,
        permissionStatus: permission,
        appVersion: dependencies.native.appVersion,
        locale: dependencies.native.locale,
        timeZone: dependencies.native.timeZone,
      });
      registeredUserId = userId;
      return { status: 'registered' };
    } catch {
      return { status: 'unavailable' };
    }
  };

  const run = (userId: string, requestPermission: boolean) => {
    if (pending?.userId === userId) return pending.promise;
    const promise = tail
      .catch(() => undefined)
      .then(() => performSync(userId, requestPermission))
      .finally(() => {
        if (pending?.promise === promise) pending = null;
      });
    tail = promise;
    pending = { userId, promise };
    return promise;
  };

  return {
    sync: (userId: string) => run(userId, false),
    requestPermissionAndSync: (userId: string) => run(userId, true),
    unregister: async (_userId: string) => {
      await tail.catch(() => undefined);
      await removeCurrentDevice();
      registeredUserId = null;
    },
    subscribeTokenRefresh: (userId: string) =>
      dependencies.native.subscribeTokenRefresh(() => {
        void run(userId, false);
      }),
  };
}
