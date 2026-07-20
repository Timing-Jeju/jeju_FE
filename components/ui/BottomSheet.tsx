import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** X 아이콘 (두 개의 교차선) */
function CloseIcon() {
  return (
    <View style={styles.closeIcon}>
      <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.closeRow}>
            <Pressable
              style={styles.closeButton}
              hitSlop={spacing.xs}
              onPress={onClose}
            >
              <CloseIcon />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.dim,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  closeRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLine: {
    position: 'absolute',
    width: 10,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: colors.grey[700],
  },
});
