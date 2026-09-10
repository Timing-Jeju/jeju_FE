import type { PushNativeAdapter } from './pushRegistration';

/** Web은 FCM native device 등록 대상이 아니며 권한 prompt를 띄우지 않는다. */
export const pushNativeAdapter: PushNativeAdapter = {
  supported: false,
  platform: 'ANDROID',
  appVersion: '1.0.0',
  locale: 'ko-KR',
  timeZone: 'Asia/Seoul',
  getPermissionStatus: async () => 'NOT_DETERMINED',
  requestPermission: async () => 'NOT_DETERMINED',
  getRegistrationToken: async () => null,
  subscribeTokenRefresh: () => () => {},
};

export async function configurePushPresentation(): Promise<void> {}
