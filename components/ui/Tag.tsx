import { StyleSheet, View } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  green,
  lineHeight,
  radius,
  red,
  spacing,
  yellow,
} from '@/constants';
import { Text } from './Text';

export type TagStatus = 'warning' | 'cautionary' | 'positive' | 'mono';

const TAG_PRESET: Record<
  TagStatus,
  { label: string; background: string; border: string; text: string }
> = {
  warning: {
    label: '위험',
    background: red[50],
    border: 'transparent',
    text: red[500],
  },
  cautionary: {
    label: '주의',
    background: yellow[50],
    border: 'transparent',
    text: yellow[600],
  },
  positive: {
    label: '안전',
    background: green[50],
    border: 'transparent',
    text: green[500],
  },
  // 상태가 아닌 보조 정보(현위치 등)에 쓰는 회색 테두리 태그
  mono: {
    label: 'text',
    background: colors.white,
    border: colors.grey[400],
    text: colors.grey[700],
  },
};

interface TagProps {
  status: TagStatus;
  /** 미지정 시 상태별 기본 라벨(위험/주의/안전) 사용 */
  text?: string;
}

export function Tag({ status, text }: TagProps) {
  const preset = TAG_PRESET[status];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: preset.background, borderColor: preset.border },
      ]}
    >
      <Text style={[styles.label, { color: preset.text }]}>
        {text ?? preset.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 22,
    paddingHorizontal: spacing['2xs'],
    borderWidth: 1,
    borderRadius: radius['3xs'],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['3xs'],
    lineHeight: lineHeight.lg,
  },
});
