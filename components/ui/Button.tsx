import { Pressable, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, radius } from '@/constants';
import { Text } from './Text';

export type ButtonColor =
  | 'default'
  | 'point'
  | 'disabled'
  | 'outlinedGrey'
  | 'outlinedOrange'
  | 'outlinedBlack';

const FILL_STYLE: Record<ButtonColor, ViewStyle> = {
  default: { backgroundColor: colors.grey[900] },
  point: { backgroundColor: colors.primary },
  disabled: { backgroundColor: colors.grey[300] },
  outlinedGrey: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grey[200],
  },
  outlinedOrange: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlinedBlack: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grey[900],
  },
};

const LABEL_COLOR: Record<ButtonColor, TextStyle> = {
  default: { color: colors.white },
  point: { color: colors.white },
  disabled: { color: colors.white },
  outlinedGrey: { color: colors.grey[200] },
  outlinedOrange: { color: colors.primary },
  outlinedBlack: { color: colors.grey[900] },
};

interface ButtonProps {
  title: string;
  onPress?: () => void;
  color?: ButtonColor;
  size?: 'large' | 'small';
  shape?: 'rectangle' | 'round';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  color = 'default',
  size = 'large',
  shape = 'round',
  disabled = false,
  style,
}: ButtonProps) {
  const fillColor = disabled ? 'disabled' : color;

  return (
    <Pressable
      style={[
        styles.button,
        size === 'large' ? styles.buttonLarge : styles.buttonSmall,
        shape === 'round' ? styles.buttonRound : styles.buttonRectangle,
        FILL_STYLE[fillColor],
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.label,
          size === 'large' ? styles.labelLarge : styles.labelSmall,
          LABEL_COLOR[fillColor],
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLarge: {
    height: 58,
  },
  buttonSmall: {
    height: 48,
  },
  buttonRound: {
    borderRadius: radius.circle,
  },
  buttonRectangle: {
    borderRadius: radius['2xs'],
  },
  label: {
    fontFamily: fontFamily.bold,
  },
  labelLarge: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
  },
  labelSmall: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
});
