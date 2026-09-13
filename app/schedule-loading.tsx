import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, AppState, Image, StyleSheet, View } from 'react-native';
import {
  pollGeneration,
  useGenerationStore,
  resumeGenerationApplication,
  discardFinishedGeneration,
} from '@/services/generationFlow';
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
  const journal = useGenerationStore((state) => state.journal);
  const [message, setMessage] = useState('일정 서비스 준비 중');
  useEffect(() => {
    if (!journal?.runId) return;
    let active = true;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      controller?.abort();
      clearTimeout(timer);
    };
    const poll = async () => {
      stop();
      const local = new AbortController();
      controller = local;
      try {
        if (journal.apply) {
          const day = await resumeGenerationApplication();
          if (active && !local.signal.aborted)
            router.replace({
              pathname: '/(tabs)/calendar',
              params: { day: String(day) },
            });
          return;
        }
        const result = await pollGeneration(local.signal);
        if (!active || local.signal.aborted || !result) return;
        if (result.run.status === 'succeeded') {
          if (result.run.result?.outcome === 'success')
            router.replace({
              pathname: '/schedule-review',
              params: { day: String(journal.dayNo) },
            });
          else
            setMessage(
              '조건에 맞는 세 일정을 만들 수 없어요. 여행 조건을 확인해 주세요.',
            );
        } else if (
          result.run.status === 'queued' ||
          result.run.status === 'running'
        ) {
          setMessage(
            result.run.status === 'queued'
              ? '일정 생성 대기 중'
              : '일정을 생성하고 있어요',
          );
          timer = setTimeout(() => {
            void poll();
          }, result.retryAfterSeconds * 1000);
        } else setMessage('일정 생성을 완료하지 못했어요. 다시 시도해 주세요.');
      } catch (error) {
        if (active && !local.signal.aborted)
          setMessage(
            error instanceof Error
              ? error.message
              : '생성 결과를 확인하지 못했어요.',
          );
      }
    };
    if (AppState.currentState === 'active') void poll();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void poll();
      else stop();
    });
    return () => {
      active = false;
      stop();
      subscription.remove();
    };
  }, [journal, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.headline}>
          <Image
            source={pinIllust}
            style={styles.illust}
            resizeMode="contain"
          />
          <Text style={styles.title}>{message}</Text>
        </View>
        <View style={styles.progressArea}>
          <Text
            style={styles.caption}
            accessibilityRole="button"
            onPress={() => {
              void discardFinishedGeneration()
                .then(() => router.replace('/(tabs)/calendar'))
                .catch(() =>
                  setMessage(
                    '생성 기록을 정리하지 못했어요. 다시 시도해 주세요.',
                  ),
                );
            }}
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
