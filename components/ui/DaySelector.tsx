import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, spacing } from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const TRACK_BACKGROUND = '#F5F6F9';
const INACTIVE_TEXT = '#747476';

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
  return (
    <View style={styles.track}>
      {Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        const isSelected = day === selectedDay;
        return (
          <Pressable
            key={day}
            style={[styles.segment, isSelected && styles.segmentSelected]}
            onPress={() => onSelectDay?.(day)}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              Day {day}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
