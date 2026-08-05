import { Fragment } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { colors, fontFamily, fontSize, lineHeight, spacing } from '@/constants';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const TITLE = '#2E2E2E';
const DIVIDER = '#E9EAED';

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
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
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
    backgroundColor: DIVIDER,
  },
});
