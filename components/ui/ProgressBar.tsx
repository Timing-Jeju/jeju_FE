import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants';

interface ProgressBarProps {
  /** 현재 단계 (1부터 시작) */
  step: number;
  totalSteps?: number;
}

export function ProgressBar({ step, totalSteps = 5 }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[styles.segment, index < step && styles.segmentFilled]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    width: '100%',
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radius.circle,
    backgroundColor: colors.grey[200],
  },
  segmentFilled: {
    backgroundColor: colors.primary,
  },
});
