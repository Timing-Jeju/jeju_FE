import { Image, Pressable, StyleSheet } from 'react-native';

import { spacing } from '@/constants';

const heartOutline = require('../../assets/images/icon-heart-outline.png');
const heartFill = require('../../assets/images/icon-heart-fill.png');

interface LikeIconProps {
  liked: boolean;
  onPress?: () => void;
  size?: number;
}

export function LikeIcon({ liked, onPress, size = 24 }: LikeIconProps) {
  return (
    <Pressable hitSlop={spacing.xs} onPress={onPress}>
      <Image
        source={liked ? heartFill : heartOutline}
        style={[styles.icon, { width: size, height: size }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 24,
  },
});
