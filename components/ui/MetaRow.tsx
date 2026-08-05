import { Fragment, isValidElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, spacing } from '@/constants';
import { Text } from './Text';

interface MetaRowProps {
  /** 문자열은 본문 스타일로 감싸고, 노드는 그대로 그린다 */
  items: ReactNode[];
  color?: string;
}

/** "오후 3:24 - 오후 4:26 | 1500원"처럼 세로선으로 구분한 보조 정보 줄 */
export function MetaRow({ items, color = colors.grey[800] }: MetaRowProps) {
  const visible = items.filter((item) => item !== null && item !== undefined);

  return (
    <View style={styles.row}>
      {visible.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={styles.divider} />}
          {isValidElement(item) ? (
            item
          ) : (
            <Text style={[styles.label, { color }]}>{item}</Text>
          )}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
  },
  divider: {
    width: 1,
    height: 8,
    backgroundColor: colors.grey[200],
  },
});
