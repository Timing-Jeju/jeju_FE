import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, spacing } from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const TRACK_BACKGROUND = '#F5F6F9';
const INACTIVE_TEXT = '#747476';

/** 이보다 길어지면 Day 칸이 좁아져서 가로 스크롤로 바꾼다 */
const SCROLL_THRESHOLD = 5;
/** 스크롤 모드일 때 Day 한 칸의 너비 */
const SCROLL_SEGMENT_WIDTH = 64;

interface DaySelectorProps {
  /** 전체 Day 수 (당일치기 1 ~ 3박4일 4) */
  dayCount: number;
  /** 선택된 Day (1부터 시작) */
  selectedDay: number;
  onSelectDay?: (day: number) => void;
}

export function DaySelector({
  dayCount,
  selectedDay,
  onSelectDay,
}: DaySelectorProps) {
  const scrollable = dayCount > SCROLL_THRESHOLD;
  const scrollRef = useRef<ScrollView>(null);

  // 버튼으로 다음 날짜로 넘어갔을 때도 선택된 Day가 보이도록 따라 움직인다
  useEffect(() => {
    if (!scrollable) return;
    scrollRef.current?.scrollTo({
      x: Math.max(
        (selectedDay - 1) * SCROLL_SEGMENT_WIDTH - SCROLL_SEGMENT_WIDTH,
        0,
      ),
      animated: true,
    });
  }, [scrollable, selectedDay]);

  const segments = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const isSelected = day === selectedDay;
    return (
      <Pressable
        key={day}
        style={[
          styles.segment,
          scrollable && styles.segmentFixed,
          isSelected && styles.segmentSelected,
        ]}
        onPress={() => onSelectDay?.(day)}
      >
        <Text style={[styles.label, isSelected && styles.labelSelected]}>
          Day {day}
        </Text>
      </Pressable>
    );
  });

  if (!scrollable) {
    return <View style={styles.track}>{segments}</View>;
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollTrack}
      contentContainerStyle={styles.scrollContent}
    >
      {segments}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['2xs'],
    borderRadius: 6,
    backgroundColor: TRACK_BACKGROUND,
  },
  // 일수가 많으면 좌우로 스크롤한다 (칸을 좁히면 라벨이 뭉개진다)
  scrollTrack: {
    width: '100%',
    flexGrow: 0,
    borderRadius: 6,
    backgroundColor: TRACK_BACKGROUND,
  },
  scrollContent: {
    alignItems: 'center',
    padding: spacing['2xs'],
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentFixed: {
    flex: 0,
    width: SCROLL_SEGMENT_WIDTH,
  },
  segmentSelected: {
    backgroundColor: colors.white,
    shadowColor: '#3D2707',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: INACTIVE_TEXT,
  },
  labelSelected: {
    color: colors.primary,
  },
});
