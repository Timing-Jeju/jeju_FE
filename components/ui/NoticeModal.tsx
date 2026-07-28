import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  Modal,
  Pressable,
  StyleProp,
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
import { Button } from './Button';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const DESCRIPTION_TEXT = '#747476';

interface NoticeModalProps {
  visible: boolean;
  /** 상단 일러스트 (기본 80x80) */
  image?: ImageSourcePropType;
  /** 정사각형이 아닌 일러스트를 쓸 때 크기를 덮어쓴다 */
  imageStyle?: StyleProp<ImageStyle>;
  title: string;
  description: string;
  buttonTitle?: string;
  onConfirm: () => void;
  /** 배경 탭 / 안드로이드 뒤로가기로 닫을 때 (미지정 시 onConfirm) */
  onClose?: () => void;
}

/** 확인 버튼 하나짜리 안내 모달 (일치하는 회원 정보 없음 등) */
export function NoticeModal({
  visible,
  image,
  imageStyle,
  title,
  description,
  buttonTitle = '확인',
  onConfirm,
  onClose,
}: NoticeModalProps) {
  const close = onClose ?? onConfirm;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.card}>
          <View style={styles.content}>
            {image !== undefined && (
              <Image source={image} style={[styles.illust, imageStyle]} />
            )}
            <View style={styles.textGroup}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Button title={buttonTitle} size="small" onPress={onConfirm} />
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
    gap: spacing.xs,
    paddingTop: 30,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  illust: {
    width: 80,
    height: 80,
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
    lineHeight: lineHeight.md,
    color: DESCRIPTION_TEXT,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
