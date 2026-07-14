import { StyleSheet, View } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  transport,
} from '@/constants';
import { Text } from './Text';

export type BusTagColor = keyof typeof transport | 'grey';

const BUS_TAG_COLOR: Record<BusTagColor, string> = {
  ...transport,
  grey: colors.grey[600],
};

interface BusTagProps {
  color?: BusTagColor;
  text: string;
}

export function BusTag({ color = 'green', text }: BusTagProps) {
  const tagColor = BUS_TAG_COLOR[color];

  return (
    <View style={[styles.container, { borderColor: tagColor }]}>
      <Text style={[styles.label, { color: tagColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 20,
    paddingHorizontal: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
  },
});
