import { useRouter } from 'expo-router';
import { useMemo } from 'react';
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

/** 실제 run 연결 전에는 기존 화면에서 준비 상태만 표시한다. */

// spacing 스케일(최대 48)에 없는 디자인 값
const GROUP_GAP = 80;

export default function ScheduleLoadingScreen() {
  const router = useRouter();
  const progress = useMemo(() => new Animated.Value(0), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.headline}>
          <Image
            source={pinIllust}
            style={styles.illust}
            resizeMode="contain"
          />
          <Text style={styles.title}>일정 서비스 준비 중</Text>
        </View>
        <View style={styles.progressArea}>
          <Text
            style={styles.caption}
            accessibilityRole="button"
            onPress={() => router.replace('/(tabs)/calendar')}
          >
            일정 입력으로 돌아가기
          </Text>
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
