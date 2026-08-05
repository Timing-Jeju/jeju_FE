import { Modal, Pressable, StyleSheet, View } from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { Text } from './Text';

export interface MenuItem {
  key: string;
  label: string;
}

interface PopoverMenuProps {
  visible: boolean;
  items: MenuItem[];
  /** 눌린 아이콘 기준 위치 (화면 좌표) */
  anchor: { top: number; right: number };
  onSelect: (key: string) => void;
  onClose: () => void;
}

/** 더보기 아이콘에서 펼쳐지는 메뉴 (일정 순서 변경 / 추가 / 삭제 등) */
export function PopoverMenu({
  visible,
  items,
  anchor,
  onSelect,
  onClose,
}: PopoverMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.menu, { top: anchor.top, right: anchor.right }]}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            style={styles.item}
            onPress={() => onSelect(item.key)}
          >
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    minWidth: 180,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.xs,
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  item: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
});
