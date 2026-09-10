import {
  createPushRegistrationController,
  type PushNativeAdapter,
} from '@/services/pushRegistration';

const deviceId = '11300000-0000-4000-8000-000000000101';
const token = '__SENSITIVE_FCM_REGISTRATION_TOKEN__';

const makeNative = (): jest.Mocked<PushNativeAdapter> => ({
  supported: true,
  getPermissionStatus: jest.fn(async () => 'GRANTED'),
  requestPermission: jest.fn(async () => 'GRANTED'),
  getRegistrationToken: jest.fn(async () => token),
  subscribeTokenRefresh: jest.fn((_listener: () => void) => () => {}),
  platform: 'ANDROID',
  appVersion: '1.0.1',
  locale: 'ko-KR',
  timeZone: 'Asia/Seoul',
});

test('세션 복원과 중복 effect는 같은 기기를 한 번만 등록한다', async () => {
  const native = makeNative();
  const register = jest.fn(async (_id: string, _body: unknown) => undefined);
  const controller = createPushRegistrationController({
    native,
    getDeviceId: async () => deviceId,
    register,
    remove: jest.fn(async () => undefined),
  });
  controller.activate('user-a');

  const [first, second] = await Promise.all([
    controller.sync('user-a'),
    controller.sync('user-a'),
  ]);

  expect(first).toEqual({ status: 'registered' });
  expect(second).toEqual({ status: 'registered' });
  expect(register).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledWith(
    deviceId,
    {
      platform: 'ANDROID',
      registrationToken: token,
      permissionStatus: 'GRANTED',
      appVersion: '1.0.1',
      locale: 'ko-KR',
      timeZone: 'Asia/Seoul',
    },
    expect.any(AbortSignal),
  );
});

test('다음 세션 동기화도 stable deviceId의 PUT replay로 등록한다', async () => {
  const native = makeNative();
  const register = jest.fn(async (_id: string, _body: unknown) => undefined);
  const getDeviceId = jest.fn(async () => deviceId);
  const controller = createPushRegistrationController({
    native,
    getDeviceId,
    register,
    remove: jest.fn(async () => undefined),
  });
  controller.activate('user-a');

  await controller.sync('user-a');
  await controller.sync('user-a');

  expect(register).toHaveBeenCalledTimes(2);
  expect(register.mock.calls.map(([id]) => id)).toEqual([deviceId, deviceId]);
});

test.each(['DENIED', 'NOT_DETERMINED'] as const)(
  '%s 권한은 앱 실패나 token 요청으로 취급하지 않는다',
  async (permissionStatus) => {
    const native = makeNative();
    native.getPermissionStatus.mockResolvedValue(permissionStatus);
    const remove = jest.fn(async () => undefined);
    const controller = createPushRegistrationController({
      native,
      getDeviceId: async () => deviceId,
      register: jest.fn(async () => undefined),
      remove,
    });
    controller.activate('user-a');

    await expect(controller.sync('user-a')).resolves.toEqual({
      status:
        permissionStatus === 'DENIED' ? 'permission-denied' : 'not-determined',
    });
    expect(native.getRegistrationToken).not.toHaveBeenCalled();
    expect(native.requestPermission).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(permissionStatus === 'DENIED' ? 1 : 0);
  },
);

test('권한 철회와 로그아웃은 반복 가능한 DELETE로 기기를 해제한다', async () => {
  const native = makeNative();
  const remove = jest.fn(
    async (_id: string, _signal?: AbortSignal) => undefined,
  );
  const controller = createPushRegistrationController({
    native,
    getDeviceId: async () => deviceId,
    register: jest.fn(async () => undefined),
    remove,
  });
  controller.activate('user-a');
  await controller.sync('user-a');

  native.getPermissionStatus.mockResolvedValue('DENIED');
  await controller.sync('user-a');
  await controller.unregister('user-a');

  expect(remove.mock.calls.map(([id]) => id)).toEqual([deviceId, deviceId]);
});

test('등록 실패 상태에는 token/device/user 식별자를 보존하지 않는다', async () => {
  const native = makeNative();
  const controller = createPushRegistrationController({
    native,
    getDeviceId: async () => deviceId,
    register: jest.fn(async () => {
      throw new Error(`provider ${token} ${deviceId} user-a`);
    }),
    remove: jest.fn(async () => undefined),
  });
  controller.activate('user-a');

  const result = await controller.sync('user-a');
  expect(result).toEqual({ status: 'unavailable' });
  expect(JSON.stringify(result)).not.toMatch(/SENSITIVE|11300000|user-a/);
});

test('logout closing은 대기 PUT 뒤 DELETE하고 이후 sync/token PUT을 차단한다', async () => {
  const native = makeNative();
  let refresh!: () => void;
  native.subscribeTokenRefresh.mockImplementation((listener) => {
    refresh = listener;
    return () => {};
  });
  let finishPut!: () => void;
  const register = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finishPut = resolve;
      }),
  );
  const remove = jest.fn(async () => undefined);
  const controller = createPushRegistrationController({
    native,
    getDeviceId: async () => deviceId,
    register,
    remove,
  });
  controller.activate('user-a');
  controller.subscribeTokenRefresh('user-a');
  const syncing = controller.sync('user-a');
  while (register.mock.calls.length === 0) await Promise.resolve();
  const closing = controller.unregister('user-a');
  refresh();
  await expect(controller.sync('user-a')).resolves.toEqual({
    status: 'unavailable',
  });
  finishPut();
  await Promise.all([syncing, closing]);

  expect(register).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(1);
  await controller.sync('user-a');
  expect(register).toHaveBeenCalledTimes(1);
});

test('진행 중 PUT의 token refresh는 dirty intent로 최신 token을 재등록한다', async () => {
  const native = makeNative();
  let refresh!: () => void;
  native.subscribeTokenRefresh.mockImplementation((listener) => {
    refresh = listener;
    return () => {};
  });
  native.getRegistrationToken
    .mockResolvedValueOnce('first-token')
    .mockResolvedValueOnce('latest-token');
  let finishFirst!: () => void;
  const register = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const controller = createPushRegistrationController({
    native,
    getDeviceId: async () => deviceId,
    register,
    remove: jest.fn(async () => undefined),
  });
  controller.activate('user-a');
  controller.subscribeTokenRefresh('user-a');

  const syncing = controller.sync('user-a');
  for (let index = 0; index < 4; index += 1) await Promise.resolve();
  refresh();
  finishFirst();
  await syncing;

  expect(register).toHaveBeenCalledTimes(2);
  expect(register.mock.calls[1][1].registrationToken).toBe('latest-token');
});

test('passive sync 중 permission action은 prompt intent로 재실행한다', async () => {
  const native = makeNative();
  let finishFirst!: () => void;
  const register = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const controller = createPushRegistrationController({
    native,
    getDeviceId: async () => deviceId,
    register,
    remove: jest.fn(async () => undefined),
  });
  controller.activate('user-a');

  const passive = controller.sync('user-a');
  for (let index = 0; index < 4; index += 1) await Promise.resolve();
  const prompted = controller.requestPermissionAndSync('user-a');
  finishFirst();
  await Promise.all([passive, prompted]);

  expect(native.getPermissionStatus).toHaveBeenCalledTimes(1);
  expect(native.requestPermission).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledTimes(2);
});

test('web unsupported lifecycle은 UUID·권한·PUT·DELETE를 모두 건너뛴다', async () => {
  const native: jest.Mocked<PushNativeAdapter> = {
    ...makeNative(),
    supported: false,
  };
  const getDeviceId = jest.fn(async () => deviceId);
  const register = jest.fn(async () => undefined);
  const remove = jest.fn(async () => undefined);
  const controller = createPushRegistrationController({
    native,
    getDeviceId,
    register,
    remove,
  });
  controller.activate('user-a');

  await controller.sync('user-a');
  await controller.requestPermissionAndSync('user-a');
  await controller.unregister('user-a');
  controller.subscribeTokenRefresh('user-a')();

  expect(native.getPermissionStatus).not.toHaveBeenCalled();
  expect(native.requestPermission).not.toHaveBeenCalled();
  expect(native.subscribeTokenRefresh).not.toHaveBeenCalled();
  expect(getDeviceId).not.toHaveBeenCalled();
  expect(register).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});
