import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RadioButton, ScreenHeader, Text } from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  radius,
  spacing,
} from '@/constants';
import { useUserStore } from '@/store/useUserStore';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const REASON_BACKGROUND = '#F5F6F9';
const PLACEHOLDER = '#A7A7A9';
const SUB_TEXT = '#747476';

const ETC_REASON = '기타 (직접 입력)';

const REASONS = [
  '원하는 정보를 찾기 어려워요',
  '서비스 이용 빈도가 낮아요',
  '여행 계획이 변경되었어요',
  '더 나은 서비스를 이용할래요',
  '앱 사용이 불편했어요',
  ETC_REASON,
] as const;

type Reason = (typeof REASONS)[number];

export default function WithdrawScreen() {
  const router = useRouter();
  const logout = useUserStore((state) => state.logout);

  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState('');

  // 기타를 고른 경우에는 사유를 직접 적어야 탈퇴할 수 있다
  const canWithdraw =
    reason !== null && (reason !== ETC_REASON || detail.trim().length > 0);

  const handleWithdraw = () => {
    // TODO: 회원 탈퇴 API 연동
    logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleGroup}>
            <Text style={styles.title}>타이밍제주를 떠나시는</Text>
            <Text style={styles.title}>
              <Text style={styles.titleAccent}>이유</Text>가 있을까요?
            </Text>
            <Text style={styles.subtitle}>
              더욱 노력하는 타이밍제주가 되겠습니다.
            </Text>
          </View>

          <View style={styles.reasonList}>
            {REASONS.map((item) => (
              <Pressable
                key={item}
                style={styles.reasonRow}
                onPress={() => setReason(item)}
              >
                <RadioButton
                  selected={reason === item}
                  onPress={() => setReason(item)}
                />
                <Text style={styles.reasonLabel}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.detailBox}>
            <TextInput
              style={styles.detailInput}
              value={detail}
              onChangeText={setDetail}
              placeholder="내용을 입력해주세요."
              placeholderTextColor={PLACEHOLDER}
              multiline
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.stayButton} onPress={() => router.back()}>
            <Text style={styles.stayLabel}>더 써볼래요</Text>
          </Pressable>
          <Pressable
            style={[
              styles.leaveButton,
              !canWithdraw && styles.leaveButtonDisabled,
            ]}
            disabled={!canWithdraw}
            onPress={handleWithdraw}
          >
            <Text style={styles.leaveLabel}>떠날래요</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: grid.pageMargin,
    paddingBottom: spacing.xl,
  },
  titleGroup: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['3xl'],
    color: colors.grey[900],
    textAlign: 'center',
  },
  titleAccent: {
    color: colors.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: SUB_TEXT,
    textAlign: 'center',
  },
  reasonList: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reasonLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  detailBox: {
    marginTop: spacing.md,
    height: 84,
    padding: spacing.sm,
    borderRadius: radius['2xs'],
    backgroundColor: REASON_BACKGROUND,
  },
  detailInput: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: grid.pageMargin,
    paddingBottom: spacing.md,
  },
  stayButton: {
    flex: 1,
    height: 48,
    borderRadius: radius['2xs'],
    borderWidth: 1,
    borderColor: colors.grey[200],
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  leaveButton: {
    flex: 1,
    height: 48,
    borderRadius: radius['2xs'],
    backgroundColor: colors.grey[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonDisabled: {
    backgroundColor: colors.grey[300],
  },
  leaveLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.white,
  },
});
