import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { Button, InputField, ScreenHeader, Text } from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  radius,
  spacing,
} from '@/constants';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BACKGROUND = '#FAFAFA';
const INPUT_BORDER = '#F0F0F0';
const PLACEHOLDER = '#898989';
const INACTIVE_TAB = '#747476';

const VERIFY_SECONDS = 120;

type Tab = 'id' | 'password';
type IdStep = 'email' | 'verify' | 'result';
type PasswordStep = 'input' | 'result';

const formatTime = (seconds: number) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

export default function FindAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<Tab>(
    params.tab === 'password' ? 'password' : 'id',
  );

  // 아이디 찾기
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [idStep, setIdStep] = useState<IdStep>('email');
  const [foundId, setFoundId] = useState('');
  const [remaining, setRemaining] = useState(VERIFY_SECONDS);

  // 비밀번호 찾기
  const [userId, setUserId] = useState('');
  const [passwordStep, setPasswordStep] = useState<PasswordStep>('input');
  const [foundPassword, setFoundPassword] = useState('');

  useEffect(() => {
    if (tab !== 'id' || idStep !== 'verify' || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [tab, idStep, remaining]);

  const handleRequestCode = () => {
    // TODO: 인증번호 발송 API 연동
    setCode('');
    setRemaining(VERIFY_SECONDS);
    setIdStep('verify');
  };

  const handleVerify = () => {
    // TODO: 인증번호 확인 및 아이디 조회 API 연동 전 임시 처리
    setFoundId(email.split('@')[0] || 'jejujoa123');
    setIdStep('result');
  };

  const handleFindPassword = () => {
    // TODO: 비밀번호 조회 API 연동 전 임시 처리
    setFoundPassword('123456789@');
    setPasswordStep('result');
  };

  const renderIdTab = () => {
    if (idStep === 'result') {
      return (
        <>
          <View style={styles.form}>
            <Text style={styles.formLabel}>가입하신 아이디를 찾았어요</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultCaption}>가입된 아이디</Text>
              <Text style={styles.resultValue}>{foundId}</Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Button title="로그인 화면으로" onPress={() => router.back()} />
          </View>
        </>
      );
    }

    return (
      <>
        <View style={styles.form}>
          <InputField
            label="이메일"
            placeholder="이메일을 입력해주세요."
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={idStep === 'email'}
          />
          {idStep === 'verify' && (
            <View style={styles.verifySection}>
              <Text style={styles.formLabel}>인증 번호</Text>
              <View style={styles.verifyRow}>
                <View style={styles.codeInputBox}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="인증 번호 6자리"
                    placeholderTextColor={PLACEHOLDER}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Text style={styles.timer}>{formatTime(remaining)}</Text>
                </View>
                <Pressable
                  style={styles.resendButton}
                  onPress={handleRequestCode}
                >
                  <Text style={styles.resendLabel}>재전송</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
        <View style={styles.footer}>
          {idStep === 'email' ? (
            <Button
              title="인증번호 받기"
              disabled={email.trim().length === 0}
              onPress={handleRequestCode}
            />
          ) : (
            <Button
              title="인증 완료"
              disabled={code.length < 6 || remaining === 0}
              onPress={handleVerify}
            />
          )}
        </View>
      </>
    );
  };

  const renderPasswordTab = () => {
    if (passwordStep === 'result') {
      return (
        <>
          <View style={styles.form}>
            <Text style={styles.formLabel}>설정하신 비밀번호를 찾았어요</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultValue}>{foundPassword}</Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Button title="로그인 화면으로" onPress={() => router.back()} />
          </View>
        </>
      );
    }

    return (
      <>
        <View style={styles.form}>
          <InputField
            label="아이디"
            placeholder="아이디를 입력해주세요."
            value={userId}
            onChangeText={setUserId}
          />
        </View>
        <View style={styles.footer}>
          <Button
            title="비밀번호 찾기"
            disabled={userId.trim().length === 0}
            onPress={handleFindPassword}
          />
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="아이디/비밀번호 찾기" />

        <View style={styles.tabBar}>
          {(
            [
              { key: 'id', label: '아이디 찾기' },
              { key: 'password', label: '비밀번호 찾기' },
            ] as const
          ).map(({ key, label }) => {
            const isActive = tab === key;
            return (
              <Pressable
                key={key}
                style={styles.tab}
                onPress={() => setTab(key)}
              >
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.tabUnderline,
                    isActive && styles.tabUnderlineActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {tab === 'id' ? renderIdTab() : renderPasswordTab()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  flex: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: spacing['2xl'],
  },
  tab: {
    flex: 1,
    gap: 6,
  },
  tabLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: INACTIVE_TAB,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabUnderline: {
    height: 2,
    backgroundColor: colors.grey[200],
  },
  tabUnderlineActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: grid.pageMargin,
    paddingTop: 26,
    paddingBottom: spacing.xl,
  },
  form: {
    gap: 26,
  },
  formLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  verifySection: {
    gap: 6,
  },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing['2xs'],
  },
  codeInputBox: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: radius['2xs'],
  },
  codeInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.grey[900],
    padding: 0,
  },
  timer: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.sm,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  resendButton: {
    width: 83,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: radius['2xs'],
  },
  resendLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: spacing['2xl'],
  },
  resultBox: {
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: radius['2xs'],
  },
  resultCaption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: INACTIVE_TAB,
  },
  resultValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.lg,
    color: colors.grey[900],
  },
});
