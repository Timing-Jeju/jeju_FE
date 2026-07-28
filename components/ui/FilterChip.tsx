import { Pressable, StyleSheet } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, spacing } from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const INACTIVE_BORDER = '#D0D1D4';
const INACTIVE_TEXT = '#747476';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  /** filled: 선택 시 주황 배경, outlined: 선택 시 주황 테두리만 */
  variant?: 'filled' | 'outlined';
  onPress?: () => void;
}

/** 관심장소 목록 필터 칩 (전체 / 관광지 / 필수방문 …) */
export function FilterChip({
  label,
  selected = false,
  variant = 'filled',
  onPress,
}: FilterChipProps) {
  const selectedContainer =
    variant === 'filled' ? styles.containerFilled : styles.containerOutlined;
  const selectedLabel =
    variant === 'filled' ? styles.labelFilled : styles.labelOutlined;

  return (
    <Pressable
      style={[styles.container, selected && selectedContainer]}
      onPress={onPress}
    >
      <Text style={[styles.label, selected && selectedLabel]}>{label}</Text>
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
  containerFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  containerOutlined: {
    borderColor: colors.primary,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: INACTIVE_TEXT,
  },
  labelFilled: {
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
  labelOutlined: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
