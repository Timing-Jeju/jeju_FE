import { Pressable, StyleSheet } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const SHADOW = '#A13500';

interface FloatingButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function FloatingButton({
  title,
  onPress,
  disabled = false,
}: FloatingButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        disabled ? styles.buttonDisabled : styles.buttonDefault,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 정렬은 감싸는 쪽에서 정한다 (alignSelf를 두면 부모의 alignItems를 덮어써 버린다)
  button: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDefault: {
    backgroundColor: colors.primary,
    shadowColor: SHADOW,
  },
  buttonDisabled: {
    backgroundColor: colors.grey[300],
    shadowColor: colors.grey[900],
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.white,
  },
});
