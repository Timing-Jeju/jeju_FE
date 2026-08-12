import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  radius,
  spacing,
} from '@/constants';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const INACTIVE_TEXT = '#747476';
const TRACK_BACKGROUND = '#E9EAED';

const pinIllust = require('../assets/images/illust-pin.png');

/**
 * 일정 검토 결과는 이 화면에 오기 전에 이미 만들어져 있다.
 * 생성 과정을 보여주기 위한 연출용 대기 시간.
 */
const LOADING_DURATION_MS = 2000;

// spacing 스케일(최대 48)에 없는 디자인 값
const GROUP_GAP = 80;

export default function ScheduleLoadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = params.day ?? '1';
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: LOADING_DURATION_MS,
      // 너비를 애니메이션하므로 네이티브 드라이버를 쓸 수 없다
      useNativeDriver: false,
    }).start();

    // replace로 넘겨야 검토 화면에서 뒤로 갈 때 로딩이 다시 뜨지 않는다
    const timer = setTimeout(() => {
      router.replace({ pathname: '/schedule-review', params: { day } });
    }, LOADING_DURATION_MS);

    return () => clearTimeout(timer);
  }, [day, progress, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.headline}>
          <Image
            source={pinIllust}
            style={styles.illust}
            resizeMode="contain"
          />
          <Text style={styles.title}>
            AI가 최적의 동선과 시간을{'\n'}생성하고 있어요
          </Text>
        </View>
        <View style={styles.progressArea}>
          <Text style={styles.caption}>잠시만 기다려주세요...</Text>
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.fill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: GROUP_GAP,
  },
  headline: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  illust: {
    width: 130,
    height: 91,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
    textAlign: 'center',
  },
  progressArea: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  caption: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: INACTIVE_TEXT,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    maxWidth: grid.containerMaxWidth,
    height: 6,
    borderRadius: radius.lg,
    backgroundColor: TRACK_BACKGROUND,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
});
