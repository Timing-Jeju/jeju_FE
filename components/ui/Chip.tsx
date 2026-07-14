import { Pressable, StyleSheet } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, spacing } from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CHIP_BACKGROUND = '#F5F6F9';
const CHIP_TEXT = '#747476';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
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
    backgroundColor: CHIP_BACKGROUND,
    alignSelf: 'flex-start',
  },
  containerSelected: {
    backgroundColor: colors.grey[900],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: CHIP_TEXT,
  },
  labelSelected: {
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
});
