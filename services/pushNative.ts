import { getApps } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '@/constants';
import type { PushPermissionStatus } from './api/push';
import type { PushNativeAdapter } from './pushRegistration';

export const PUSH_CHANNEL_ID = 'departure-reminders';

const permissionStatus = (
  permission: Notifications.NotificationPermissionsStatus,
): PushPermissionStatus => {
  if (permission.granted) return 'GRANTED';
  return permission.canAskAgain ? 'NOT_DETERMINED' : 'DENIED';
};

const safeLocale = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return /^[A-Za-z0-9-]{2,35}$/.test(locale) ? locale : 'ko-KR';
  } catch {
    return 'ko-KR';
  }
};

const safeTimeZone = () => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return /^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timeZone)
      ? timeZone
      : 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
};

const hasFirebaseApp = () => {
  if (Platform.OS === 'web') return false;
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
};

/** 오류 객체나 token을 기록하지 않는 native FCM/권한 adapter. */
export const pushNativeAdapter: PushNativeAdapter = {
  supported: true,
  platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
  appVersion: Constants.expoConfig?.version?.slice(0, 50) || '1.0.0',
  locale: safeLocale(),
  timeZone: safeTimeZone(),
  getPermissionStatus: async () => {
    try {
      return permissionStatus(await Notifications.getPermissionsAsync());
    } catch {
      return 'NOT_DETERMINED';
    }
  },
  requestPermission: async () => {
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted || !current.canAskAgain) {
        return permissionStatus(current);
      }
      return permissionStatus(
        await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        }),
      );
    } catch {
      return 'NOT_DETERMINED';
    }
  },
  getRegistrationToken: async () => {
    if (!hasFirebaseApp()) return null;
    try {
      const value = await getToken(getMessaging());
      return /^[\x21-\x7e]{1,4096}$/.test(value) ? value : null;
    } catch {
      return null;
    }
  },
  subscribeTokenRefresh: (listener) => {
    if (!hasFirebaseApp()) return () => {};
    try {
      return onTokenRefresh(getMessaging(), () => listener());
    } catch {
      return () => {};
    }
  },
};

/** 앱 시작 시 표시 정책과 Android 채널만 준비한다. 권한은 자동 요청하지 않는다. */
export async function configurePushPresentation(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
      name: '출발 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: colors.primary,
    });
  }
}
