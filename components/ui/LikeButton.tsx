import { Image, Pressable, StyleSheet } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, radius } from '@/constants';
import { Text } from './Text';

const heartFill = require('../../assets/images/icon-heart-fill.png');

interface LikeButtonProps {
  /** true면 주황(찜 상태), false면 회색 */
  active: boolean;
  onPress?: () => void;
  title?: string;
}

export function LikeButton({
  active,
  onPress,
  title = '장소 찜하기',
}: LikeButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        active ? styles.buttonActive : styles.buttonInactive,
      ]}
      onPress={onPress}
    >
      <Image source={heartFill} style={styles.icon} />
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 44,
    borderRadius: radius['2xs'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  buttonActive: {
    backgroundColor: colors.primary,
  },
  buttonInactive: {
    backgroundColor: colors.grey[300],
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: colors.white,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.white,
  },
});
