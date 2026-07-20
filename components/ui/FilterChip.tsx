import { Pressable, StyleSheet } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, spacing } from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const INACTIVE_BORDER = '#D0D1D4';
const INACTIVE_TEXT = '#747476';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** 관심장소 목록 필터 칩 (전체 / 관광지 / 필수방문 …) */
export function FilterChip({
  label,
  selected = false,
  onPress,
}: FilterChipProps) {
  return (
    <Pressable
      style={[styles.container, selected && styles.containerSelected]}
      onPress={onPress}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INACTIVE_BORDER,
    alignSelf: 'flex-start',
  },
  containerSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: INACTIVE_TEXT,
  },
  labelSelected: {
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
});
