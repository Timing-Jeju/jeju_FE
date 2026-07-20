import { StyleSheet, View } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight } from '@/constants';
import { Text } from './Text';

interface PlaceTagProps {
  label: string;
}

/** 장소 관련 정보 태그 (추천 체류 시간 / 필수방문 등) */
export function PlaceTag({ label }: PlaceTagProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.orange[50],
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    color: colors.primary,
  },
});
