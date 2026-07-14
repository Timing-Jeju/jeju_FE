import { StyleSheet, View } from 'react-native';

import { colors, fontFamily, fontSize } from '@/constants';
import { Text } from './Text';

export type NumberingStatus = 'warning' | 'cautionary' | 'positive' | 'mono';

const NUMBERING_COLOR: Record<NumberingStatus, string> = {
  warning: colors.warning,
  cautionary: colors.cautionary,
  positive: colors.positive,
  mono: colors.grey[700],
};

interface NumberingProps {
  status: NumberingStatus;
  text: string;
}

export function Numbering({ status, text }: NumberingProps) {
  return (
    <View
      style={[styles.container, { backgroundColor: NUMBERING_COLOR[status] }]}
    >
      <Text style={styles.label}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.white,
    textAlign: 'center',
  },
});
