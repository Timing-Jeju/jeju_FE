import { Image, StyleSheet, TextStyle, View } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, spacing } from '@/constants';
import { Text } from './Text';

const chevronRightIcon = require('../../assets/images/icon-chevron-right.png');

export type RouteTitleSize = 'sm' | 'md' | 'lg' | 'xl';

const LABEL_STYLE: Record<RouteTitleSize, TextStyle> = {
  sm: { fontSize: fontSize.sm, lineHeight: lineHeight.xs },
  md: { fontSize: fontSize.md, lineHeight: lineHeight.md },
  lg: { fontSize: fontSize.lg, lineHeight: lineHeight.xl },
  xl: { fontSize: fontSize['3xl'], lineHeight: lineHeight['2xl'] },
};

// 화살표는 24x24 아이콘 박스라 작은 사이즈에서는 글자 사이가 너무 벌어진다
const ARROW_SIZE: Record<RouteTitleSize, number> = {
  sm: 18,
  md: 20,
  lg: 24,
  xl: 24,
};

interface RouteTitleProps {
  from: string;
  to: string;
  size?: RouteTitleSize;
  color?: string;
}

/** "출발지 → 도착지" 구간 제목 (일정 검토 / 상세 일정 / 실시간 지도 공용) */
export function RouteTitle({
  from,
  to,
  size = 'lg',
  color = colors.grey[900],
}: RouteTitleProps) {
  const labelStyle = [styles.label, LABEL_STYLE[size], { color }];
  const arrowSize = ARROW_SIZE[size];

  return (
    <View style={styles.container}>
      <Text style={labelStyle} numberOfLines={1}>
        {from}
      </Text>
      <Image
        source={chevronRightIcon}
        style={{ width: arrowSize, height: arrowSize, tintColor: color }}
      />
      <Text style={labelStyle} numberOfLines={1}>
        {to}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  label: {
    flexShrink: 1,
    fontFamily: fontFamily.bold,
  },
});
