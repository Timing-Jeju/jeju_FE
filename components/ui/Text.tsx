import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { fontFamily } from '@/constants';

export function Text({ style, ...props }: TextProps) {
  return <RNText style={[styles.base, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fontFamily.regular,
  },
});
