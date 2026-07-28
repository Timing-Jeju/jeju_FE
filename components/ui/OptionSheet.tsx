import { Fragment } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
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
const INACTIVE_TEXT = '#747476';

export interface SheetOption {
  key: string;
  label: string;
}

interface OptionSheetProps {
  visible: boolean;
  options: SheetOption[];
  /** 선택된 옵션 (해당 항목만 진하게 표시) */
  selectedKey?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

/** 하나를 고르는 목록 바텀시트 (정렬 기준 / 체류 시간 선택 등) */
export function OptionSheet({
  visible,
  options,
  selectedKey,
  onSelect,
  onClose,
}: OptionSheetProps) {
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
          {options.map((option) => (
            <Fragment key={option.key}>
              <Pressable
                style={styles.option}
                onPress={() => onSelect(option.key)}
              >
                <Text
                  style={[
                    styles.label,
                    option.key === selectedKey && styles.labelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
              <View style={styles.divider} />
            </Fragment>
          ))}
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
    gap: spacing['2xs'],
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: colors.white,
  },
  option: {
    height: 42,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: INACTIVE_TEXT,
  },
  labelSelected: {
    fontFamily: fontFamily.medium,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.grey[100],
  },
});
