import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants';

interface IndicatorDotProps {
  selected: boolean;
}

export function IndicatorDot({ selected }: IndicatorDotProps) {
  return <View style={[styles.dot, selected && styles.dotSelected]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.grey[200],
  },
  dotSelected: {
    backgroundColor: colors.primary,
  },
});
