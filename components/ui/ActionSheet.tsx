import { Fragment } from 'react';
import {
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const TITLE = '#2E2E2E';

export interface SheetAction {
  key: string;
  label: string;
  icon: ImageSourcePropType;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  actions: SheetAction[];
  onSelect: (key: string) => void;
  onClose: () => void;
}

/** 제목 + 아이콘 액션 목록 바텀시트 (장소 추가 방법 선택 등) */
export function ActionSheet({
  visible,
  title,
  actions,
  onSelect,
  onClose,
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dim} onPress={onClose} />
        {/* 홈 인디케이터 영역만큼 아래 여백을 더 준다 */}
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing['2xl'] },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.actions}>
            {actions.map((action, index) => (
              <Fragment key={action.key}>
                {index > 0 && <View style={styles.divider} />}
                <Pressable
                  style={styles.action}
                  onPress={() => onSelect(action.key)}
                >
                  <Image source={action.icon} style={styles.icon} />
                  <Text style={styles.label}>{action.label}</Text>
                </Pressable>
              </Fragment>
            ))}
          </View>
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
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: colors.white,
  },
  handle: {
    width: 30,
    height: 2,
    borderRadius: 1,
    alignSelf: 'center',
    backgroundColor: colors.grey[300],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: TITLE,
  },
  actions: {
    gap: spacing['2xs'],
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[700],
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.grey[100],
  },
});
