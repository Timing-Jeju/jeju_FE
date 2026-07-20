import {
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const CANCEL_BORDER = '#D0D1D4';
const DESCRIPTION_TEXT = '#747476';

interface ConfirmModalProps {
  visible: boolean;
  /** 상단 일러스트 (40x40) */
  image?: ImageSourcePropType;
  title: string;
  description?: string;
  cancelTitle?: string;
  confirmTitle?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 취소 / 확인 두 버튼짜리 확인 모달 (찜 삭제, 로그아웃 등) */
export function ConfirmModal({
  visible,
  image,
  title,
  description,
  cancelTitle = '취소',
  confirmTitle = '삭제',
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.card}>
          <View style={styles.content}>
            {image !== undefined && (
              <Image source={image} style={styles.illust} />
            )}
            <View style={styles.textGroup}>
              <Text style={styles.title}>{title}</Text>
              {description !== undefined && description.length > 0 && (
                <Text style={styles.description}>{description}</Text>
              )}
            </View>
          </View>
          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelLabel}>{cancelTitle}</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmLabel}>{confirmTitle}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dim,
  },
  card: {
    width: grid.containerMaxWidth,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: 30,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  illust: {
    width: 40,
    height: 40,
  },
  textGroup: {
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.xl,
    color: DESCRIPTION_TEXT,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing['2xs'],
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.circle,
    borderWidth: 1,
    borderColor: CANCEL_BORDER,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  confirmButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.circle,
    backgroundColor: colors.grey[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.white,
  },
});
