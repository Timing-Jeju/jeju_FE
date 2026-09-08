import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import {
  getFcmToken,
  getInitialPushRoute,
  getPushRoute,
  registerPushToken,
  requestNotificationPermission,
  subscribeForegroundMessage,
  subscribeNotificationOpened,
  subscribeTokenRefresh,
  unregisterPushToken,
} from '@/services/pushNotification';
import { useUserStore } from '@/store/useUserStore';

/**
 * 앱 전역에서 한 번만 쓰는 푸시 알림 훅 (app/_layout.tsx).
 *
 * - 로그인하면 알림 권한을 묻고 FCM 토큰을 서버에 등록한다.
 * - 로그아웃하면 서버에서 토큰을 뗀다.
 * - 알림을 탭하면 data.route 로 지정된 화면으로 이동한다.
 */
export function usePushNotification() {
  const router = useRouter();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  /** 서버에 등록해 둔 토큰 — 로그아웃 때 해제하려고 들고 있는다 */
  const registeredToken = useRef<string | null>(null);

  // 수신 / 탭 처리는 로그인 여부와 무관하게 앱이 떠 있는 동안 유지한다.
  useEffect(() => {
    const openRoute = (route: string) => router.push(route as Href);

    const unsubscribeMessage = subscribeForegroundMessage();
    const unsubscribeOpened = subscribeNotificationOpened(openRoute);

    // 포그라운드에서 우리가 직접 띄운 로컬 알림을 탭한 경우
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const route = getPushRoute(response.notification.request.content.data);
        if (route) openRoute(route);
      });

    /*
     * 종료 상태에서 알림 탭으로 실행된 경우.
     * 지금은 로그인 상태를 저장하지 않아 콜드 스타트는 항상 로그아웃 상태라
     * Stack.Protected 가드에 막힌다. 로그인 유지가 붙으면 그대로 동작한다.
     */
    getInitialPushRoute().then((route) => {
      if (route) openRoute(route);
    });

    return () => {
      unsubscribeMessage();
      unsubscribeOpened();
      responseSubscription.remove();
    };
  }, [router]);

  // 로그인 상태에서만 토큰을 서버에 붙여 둔다.
  useEffect(() => {
    if (!isLoggedIn) {
      // 로그아웃. 최초 실행 때는 등록해 둔 토큰이 없으므로 아무 일도 일어나지 않는다.
      const token = registeredToken.current;
      registeredToken.current = null;
      if (token) unregisterPushToken();
      return;
    }

    let cancelled = false;

    const register = async () => {
      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;

      const token = await getFcmToken();
      if (!token || cancelled) return;

      registeredToken.current = token;
      await registerPushToken(token);
    };

    register();

    const unsubscribeRefresh = subscribeTokenRefresh((token) => {
      registeredToken.current = token;
      registerPushToken(token);
    });

    return () => {
      cancelled = true;
      unsubscribeRefresh();
    };
  }, [isLoggedIn]);
}
