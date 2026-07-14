import { StyleSheet, View } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  green,
  lineHeight,
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
    border: colors.warning,
    text: red[500],
  },
  cautionary: {
    label: '주의',
    background: yellow[50],
    border: colors.cautionary,
    text: yellow[600],
  },
  positive: {
    label: '안전',
    background: green[50],
    border: colors.positive,
    text: green[500],
  },
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
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.xs,
  },
});
