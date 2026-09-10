import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { SplashView } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import { startAppSession } from '@/services/appSession';
import { useProfileLegalStore } from '@/store/useProfileLegalStore';
import { useUserStore } from '@/store/useUserStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

/** 브랜드 스플래시를 보여주는 시간 (폰트 로딩 완료 후 기준) */
const SPLASH_DURATION_MS = 1500;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('../assets/fonts/Pretendard-ExtraBold.otf'),
    'FugazOne-Regular': require('../assets/fonts/FugazOne-Regular.ttf'),
  });
  const authReady = useUserStore((state) => state.authReady);
  useEffect(() => startAppSession(), []);
  const [splashVisible, setSplashVisible] = useState(true);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  /*
   * 네이티브 스플래시(주황 단색)를 폰트 로딩 후에 내리고, 같은 배경의 브랜드
   * 스플래시로 이어받는다. 로고가 Fugaz One 이라 폰트 로딩 전에 띄우면 안 된다.
   */
  useEffect(() => {
    if (!loaded) return;
    SplashScreen.hideAsync();
    const timer = setTimeout(() => setSplashVisible(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (splashVisible || !authReady) {
    return <SplashView />;
  }

  return <RootLayoutNav />;
}

export function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const consentRecoveryActive = useProfileLegalStore(
    (state) =>
      state.consentStatus === 'error' || state.consentStatus === 'saving',
  );

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!isLoggedIn || consentRecoveryActive}>
          <Stack.Screen name="signup" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="place-detail" options={{ headerShown: false }} />
          <Stack.Screen
            name="trip-conditions"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="schedule-favorites"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="schedule-search"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="schedule-loading"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen
            name="schedule-review"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="schedule-leg" options={{ headerShown: false }} />
          <Stack.Screen name="live-map" options={{ headerShown: false }} />
          <Stack.Screen name="withdraw" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        {/*
         * 로그인 전 계정 찾기 / 로그인 후 비밀번호 재설정에서 함께 쓰므로 가드 밖에 둔다.
         * 로그아웃 상태에서는 initialRouteName('(tabs)')이 가드로 막혀 첫 번째 화면이
         * 초기 화면이 되므로, 반드시 login보다 뒤에 선언해야 한다.
         */}
        <Stack.Screen name="find-account" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
