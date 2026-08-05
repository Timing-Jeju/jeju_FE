import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { colors, spacing } from '@/constants';

interface MenuIconProps {
  color?: string;
  /** 메뉴를 띄울 위치를 잡을 수 있게 터치 이벤트를 그대로 넘긴다 */
  onPress?: (event: GestureResponderEvent) => void;
}

/** 더보기(케밥) 아이콘 — 세로 점 3개 */
export function MenuIcon({ color = colors.grey[900], onPress }: MenuIconProps) {
  return (
    <Pressable style={styles.container} hitSlop={spacing.xs} onPress={onPress}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.7,
  },
  dot: {
    width: 2.7,
    height: 2.7,
    borderRadius: 1.35,
  },
});
