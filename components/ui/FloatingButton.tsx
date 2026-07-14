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
  button: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDefault: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
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
