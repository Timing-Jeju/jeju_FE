import { getApps } from '@react-native-firebase/app';
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '@/constants';
import {
  deletePushDevice,
  registerPushDevice,
  type PushPermissionStatus,
} from '@/services/api';
import { getDeviceId } from './deviceId';

/**
 * FCM 푸시 알림 — 토큰 발급/서버 등록과 메시지 수신을 담당한다.
 *
 * 두 라이브러리를 역할을 나눠 쓴다.
 * - @react-native-firebase/messaging : FCM 토큰, 메시지 수신, 알림 탭 이벤트
 * - expo-notifications              : 알림 권한, Android 알림 채널, 포그라운드 알림 표시
 *
 * FCM 메시지는 RNFirebase 가 받는다. expo-notifications 의 FirebaseMessagingService 는
 * intent-filter priority 가 -1 이라 RNFirebase 서비스(priority 0)에 우선권을 넘기기 때문에
 * 둘을 같이 써도 수신이 겹치지 않는다.
 *
 * google-services.json / GoogleService-Info.plist 가 없으면 네이티브에서 FirebaseApp 이
 * 초기화되지 않으므로 아래 함수들은 전부 조용히 no-op 이 된다.
 * (naverKeys 의 isKeyConfigured 와 같은 방침 — 키가 없는 환경에서도 앱은 돌아가야 한다.)
 */

/** Android 알림 채널 ID — app.json 의 expo-notifications 플러그인 defaultChannel 과 같아야 한다. */
export const DEFAULT_CHANNEL_ID = 'default';

/** 서버가 기기를 구분할 때 쓰는 값 */
const DEVICE_TYPE = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

/** 기기 등록에 함께 보내는 앱 정보 */
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const LOCALE = 'ko-KR';
const TIME_ZONE = 'Asia/Seoul';

const warn = (message: string, error?: unknown) => {
  if (__DEV__) {
    console.warn(`[push] ${message}`, error ?? '');
  }
};

/**
 * 푸시를 쓸 수 있는 상태인지. Firebase 설정 파일이 없으면 getApps() 가 빈 배열이고,
 * 네이티브 모듈이 없는 예전 개발 빌드에서는 아예 예외가 난다.
 */
export const isPushConfigured = () => {
  try {
    return getApps().length > 0;
  } catch (error) {
    warn(
      'Firebase 네이티브 모듈이 없다. 개발 빌드를 다시 만들어야 한다.',
      error,
    );
    return false;
  }
};

/** Android 8+ 는 채널이 없으면 알림이 뜨지 않는다. 앱 시작 시 한 번 만들어 둔다. */
async function createDefaultChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: '알림',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: colors.primary,
  });
}

/**
 * 앱 시작 시 한 번 호출한다. (app/_layout.tsx 모듈 스코프)
 * 알림 표시 방식과 Android 채널을 준비하고 백그라운드 메시지 핸들러를 등록한다.
 */
export function setupPushNotifications() {
  // 포그라운드에서 로컬 알림을 띄울 때의 표시 방식
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Expo 푸시 서비스는 쓰지 않으므로 Expo 서버로의 토큰 자동 등록을 끈다.
  Notifications.setAutoServerRegistrationEnabledAsync(false).catch((error) =>
    warn('Expo 토큰 자동 등록 해제 실패', error),
  );

  createDefaultChannel().catch((error) => warn('알림 채널 생성 실패', error));

  if (!isPushConfigured()) {
    warn('Firebase 설정 파일이 없어 푸시를 비활성화한다.');
    return;
  }

  /*
   * 앱이 백그라운드/종료 상태일 때 도착한 메시지. notification 페이로드가 있으면
   * FCM SDK 가 알아서 알림을 띄우므로, 핸들러는 데이터 전용 메시지를 쓸 때만 채우면 된다.
   * (등록해두지 않으면 데이터 메시지 도착 시 RNFirebase 가 경고를 남긴다.)
   */
  setBackgroundMessageHandler(getMessaging(), async () => {
    // TODO: 데이터 전용 메시지를 쓰게 되면 여기에서 처리한다.
  });
}

/**
 * 알림 권한을 요청한다. Android 13+ 는 POST_NOTIFICATIONS 런타임 권한을,
 * iOS 는 APNs 권한을 묻는다. 이미 허용했거나 "다시 묻지 않음" 상태면 다이얼로그가 뜨지 않는다.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted;
}

/** 이 기기의 FCM 토큰. 설정이 없거나 발급에 실패하면 null. */
export async function getFcmToken(): Promise<string | null> {
  if (!isPushConfigured()) return null;

  try {
    return await getToken(getMessaging());
  } catch (error) {
    warn('FCM 토큰 발급 실패', error);
    return null;
  }
}

/** 토큰이 갱신될 때 알려준다. 구독 해제 함수를 돌려준다. */
export function subscribeTokenRefresh(listener: (token: string) => void) {
  if (!isPushConfigured()) return () => {};

  return onTokenRefresh(getMessaging(), listener);
}

/** 서버가 기대하는 권한 상태 값 */
async function currentPermissionStatus(): Promise<PushPermissionStatus> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) return 'GRANTED';
  return permission.canAskAgain ? 'NOT_DETERMINED' : 'DENIED';
}

/**
 * 발급받은 FCM 토큰을 서버에 등록한다. (PUT /api/v1/me/push-devices/{deviceId})
 *
 * 같은 deviceId로 다시 호출하면 upsert되므로 토큰 갱신 때도 그대로 쓴다.
 * 등록 토큰은 로그에 남기지 않는다.
 */
export async function registerPushToken(token: string): Promise<void> {
  try {
    await registerPushDevice(getDeviceId(), {
      platform: DEVICE_TYPE,
      registrationToken: token,
      permissionStatus: await currentPermissionStatus(),
      appVersion: APP_VERSION,
      locale: LOCALE,
      timeZone: TIME_ZONE,
    });
  } catch (error) {
    warn('푸시 토큰 등록 실패', error);
  }
}

/** 로그아웃 시 서버에서 기기를 떼어 이 기기로 알림이 가지 않게 한다. */
export async function unregisterPushToken(): Promise<void> {
  try {
    await deletePushDevice(getDeviceId());
  } catch (error) {
    warn('푸시 토큰 해제 실패', error);
  }
}

/**
 * 포그라운드에서 받은 메시지를 로컬 알림으로 띄운다.
 * 앱이 떠 있는 동안에는 FCM SDK 가 알림을 자동으로 표시하지 않기 때문에 직접 띄워야 한다.
 */
async function presentForegroundNotification(message: RemoteMessage) {
  const { title, body } = message.notification ?? {};
  if (!title && !body) return; // 데이터 전용 메시지는 표시하지 않는다

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title ?? '',
      body: body ?? '',
      data: message.data ?? {},
    },
    // Android 는 채널 지정이 필요하고, iOS 에서는 이 값이 무시되며 즉시 표시된다.
    trigger: { channelId: DEFAULT_CHANNEL_ID },
  });
}

/** 포그라운드 메시지 수신 구독. 구독 해제 함수를 돌려준다. */
export function subscribeForegroundMessage() {
  if (!isPushConfigured()) return () => {};

  return onMessage(getMessaging(), (message) => {
    presentForegroundNotification(message).catch((error) =>
      warn('포그라운드 알림 표시 실패', error),
    );
  });
}

/**
 * 푸시 data 페이로드에서 이동할 앱 내부 경로를 꺼낸다.
 * FCM data 값은 항상 문자열이므로 route 에 "/place-detail" 같은 경로를 담아 보낸다.
 */
export function getPushRoute(data?: Record<string, unknown>): string | null {
  const route = data?.route;
  if (typeof route !== 'string' || !route.startsWith('/')) return null;

  return route;
}

/** 백그라운드에 있던 앱을 알림 탭으로 열었을 때. 구독 해제 함수를 돌려준다. */
export function subscribeNotificationOpened(listener: (route: string) => void) {
  if (!isPushConfigured()) return () => {};

  return onNotificationOpenedApp(getMessaging(), (message) => {
    const route = getPushRoute(message.data);
    if (route) listener(route);
  });
}

/** 종료 상태에서 알림 탭으로 앱이 실행됐을 때의 최초 메시지 경로 */
export async function getInitialPushRoute(): Promise<string | null> {
  if (!isPushConfigured()) return null;

  try {
    const message = await getInitialNotification(getMessaging());
    return message ? getPushRoute(message.data) : null;
  } catch (error) {
    warn('초기 알림 조회 실패', error);
    return null;
  }
}
