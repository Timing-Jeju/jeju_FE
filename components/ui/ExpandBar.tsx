import { Image, Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '@/constants';

const chevronDownIcon = require('../../assets/images/icon-chevron-down.png');

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BAR_BACKGROUND = '#FAFAFA';

interface ExpandBarProps {
  expanded: boolean;
  onPress?: () => void;
}

/** 카드 하단의 펼치기 / 접기 바 (일정 검토 · 실시간 지도 구간 카드) */
export function ExpandBar({ expanded, onPress }: ExpandBarProps) {
  return (
    <Pressable style={styles.bar} onPress={onPress}>
      <Image
        source={chevronDownIcon}
        style={[styles.icon, expanded && styles.iconExpanded]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.circle,
    backgroundColor: BAR_BACKGROUND,
  },
  icon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  iconExpanded: {
    transform: [{ rotate: '180deg' }],
  },
});
