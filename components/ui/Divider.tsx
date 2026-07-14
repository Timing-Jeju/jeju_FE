import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants';

const DIVIDER_HEIGHT = {
  large: 8,
  medium: 4,
  small: 1,
} as const;

interface DividerProps {
  size?: keyof typeof DIVIDER_HEIGHT;
}

export function Divider({ size = 'large' }: DividerProps) {
  return <View style={[styles.line, { height: DIVIDER_HEIGHT[size] }]} />;
}

const styles = StyleSheet.create({
  line: {
    width: '100%',
    backgroundColor: colors.grey[100],
  },
});
