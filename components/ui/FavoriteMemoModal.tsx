import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
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
import type { VisitType } from '@/store/useFavoriteStore';
import { Button } from './Button';
import { Text } from './Text';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const TRACK_BACKGROUND = '#F5F6F9';
const INACTIVE_TEXT = '#747476';

const MEMO_MAX_LENGTH = 50;
const VISIT_TYPES: VisitType[] = ['필수방문', '선택방문'];

interface FavoriteMemoModalProps {
  visible: boolean;
  /** 수정 시 기존 방문 유형 (신규 찜은 null → 탭을 눌러야 저장 가능) */
  initialVisitType?: VisitType | null;
  initialMemo?: string;
  /** 탭에 표시할 문구 (관심장소 수정 모달은 "꼭 갈래요/시간 되면 갈래요") */
  tabLabels?: Record<VisitType, string>;
  onSave: (visitType: VisitType, memo: string) => void;
  onClose: () => void;
}

/** 찜하기 방문 유형 + 메모 입력 모달 */
export function FavoriteMemoModal({
  visible,
  initialVisitType = null,
  initialMemo = '',
  tabLabels,
  onSave,
  onClose,
}: FavoriteMemoModalProps) {
  const [visitType, setVisitType] = useState<VisitType | null>(
    initialVisitType,
  );
  const [memo, setMemo] = useState(initialMemo);

  // 모달을 열 때마다 대상 장소의 값으로 초기화한다 (렌더 중 상태 보정 패턴)
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setVisitType(initialVisitType);
      setMemo(initialMemo);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.content}>
            <Text style={styles.title}>나만의 메모를 남겨볼까요?</Text>
            <View style={styles.track}>
              {VISIT_TYPES.map((type) => {
                const isSelected = visitType === type;
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.segment,
                      isSelected && styles.segmentSelected,
                    ]}
                    onPress={() => setVisitType(type)}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        isSelected && styles.segmentLabelSelected,
                      ]}
                    >
                      {tabLabels?.[type] ?? type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.memoBox}>
              <TextInput
                style={styles.memoInput}
                value={memo}
                onChangeText={setMemo}
                placeholder="메모는 필수로 입력하지 않아도 괜찮아요."
                placeholderTextColor={colors.grey[400]}
                maxLength={MEMO_MAX_LENGTH}
                multiline
              />
              <Text style={styles.memoCount}>
                {memo.length}/{MEMO_MAX_LENGTH}
              </Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Button
              title="저장하기"
              size="small"
              disabled={visitType === null}
              onPress={() => {
                if (visitType) onSave(visitType, memo.trim());
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: 30,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing['2xs'],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  track: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['2xs'],
    borderRadius: 6,
    backgroundColor: TRACK_BACKGROUND,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.white,
    shadowColor: '#3D2707',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: INACTIVE_TEXT,
  },
  segmentLabelSelected: {
    color: colors.primary,
  },
  memoBox: {
    width: '100%',
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.grey[100],
    borderRadius: radius['3xs'],
  },
  memoInput: {
    minHeight: 36,
    padding: 0,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[900],
    textAlignVertical: 'top',
  },
  memoCount: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.grey[400],
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
