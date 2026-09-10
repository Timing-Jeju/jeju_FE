import {
  createPushRegistrationController,
  type PushNativeAdapter,
} from '@/services/pushRegistration';

const deviceId = '11300000-0000-4000-8000-000000000101';
const token = '__SENSITIVE_FCM_REGISTRATION_TOKEN__';

const makeNative = (): jest.Mocked<PushNativeAdapter> => ({
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

  const [first, second] = await Promise.all([
    controller.sync('user-a'),
    controller.sync('user-a'),
  ]);

  expect(first).toEqual({ status: 'registered' });
  expect(second).toEqual({ status: 'registered' });
  expect(register).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledWith(deviceId, {
    platform: 'ANDROID',
    registrationToken: token,
    permissionStatus: 'GRANTED',
    appVersion: '1.0.1',
    locale: 'ko-KR',
    timeZone: 'Asia/Seoul',
  });
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
  const remove = jest.fn(async () => undefined);
  const controller = createPushRegistrationController({
    native,
    getDeviceId: async () => deviceId,
    register: jest.fn(async () => undefined),
    remove,
  });
  await controller.sync('user-a');

  native.getPermissionStatus.mockResolvedValue('DENIED');
  await controller.sync('user-a');
  await controller.unregister('user-a');

  expect(remove).toHaveBeenNthCalledWith(1, deviceId);
  expect(remove).toHaveBeenNthCalledWith(2, deviceId);
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

  const result = await controller.sync('user-a');
  expect(result).toEqual({ status: 'unavailable' });
  expect(JSON.stringify(result)).not.toMatch(/SENSITIVE|11300000|user-a/);
});
