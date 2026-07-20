import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  CheckMark,
  InputField,
  NoticeModal,
  ScreenHeader,
  Text,
} from '@/components/ui';
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

const noResultIllust = require('../assets/images/illust-no-result.png');

const VERIFY_SECONDS = 120;

type Tab = 'id' | 'password';
type IdStep = 'email' | 'verify' | 'result';
type PasswordStep = 'input' | 'verify' | 'reset';

const formatTime = (seconds: number) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

interface ConditionItemProps {
  label: string;
  satisfied: boolean;
}

function ConditionItem({ label, satisfied }: ConditionItemProps) {
  const color = satisfied ? colors.correct : colors.grey[300];
  return (
    <View style={styles.conditionItem}>
      <View style={styles.conditionCheck}>
        <CheckMark color={color} size={8} />
      </View>
      <Text style={[styles.conditionLabel, { color }]}>{label}</Text>
    </View>
  );
}

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
  const [pwEmail, setPwEmail] = useState('');
  const [pwCode, setPwCode] = useState('');
  const [passwordStep, setPasswordStep] = useState<PasswordStep>('input');
  const [pwRemaining, setPwRemaining] = useState(VERIFY_SECONDS);
  const [pwCodeError, setPwCodeError] = useState(false);
  const [noMatchVisible, setNoMatchVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const isNewPasswordValid = hasLetter && hasNumber && hasSpecial;
  const isConfirmMismatch =
    newPasswordConfirm.length > 0 && newPasswordConfirm !== newPassword;

  useEffect(() => {
    if (tab !== 'id' || idStep !== 'verify' || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [tab, idStep, remaining]);

  useEffect(() => {
    if (tab !== 'password' || passwordStep !== 'verify' || pwRemaining <= 0)
      return;
    const timer = setInterval(() => {
      setPwRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [tab, passwordStep, pwRemaining]);

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

  const handleRequestPasswordCode = () => {
    // TODO: 회원 정보 확인 및 인증번호 발송 API 연동 전 임시 처리
    // (이메일 형식이 아니면 회원 정보 없음 모달을 띄운다)
    if (!pwEmail.includes('@')) {
      setNoMatchVisible(true);
      return;
    }
    setPwCode('');
    setPwCodeError(false);
    setPwRemaining(VERIFY_SECONDS);
    setPasswordStep('verify');
  };

  const handleVerifyPassword = () => {
    // TODO: 인증번호 확인 API 연동 전 임시 처리 (123456만 성공)
    if (pwCode !== '123456') {
      setPwCodeError(true);
      return;
    }
    setPwCodeError(false);
    setPasswordStep('reset');
  };

  // 뒤로 갈 화면이 없으면(딥링크 진입 등) 로그인 화면으로 보낸다
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

  const handleResetPassword = () => {
    // TODO: 비밀번호 재설정 API 연동
    Alert.alert('비밀번호 변경 완료', '새 비밀번호로 로그인해주세요.');
    goBack();
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
            <Button title="로그인 화면으로" onPress={goBack} />
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
    const canResend = pwCodeError || pwRemaining === 0;

    if (passwordStep === 'reset') {
      return (
        <>
          <View style={styles.resetForm}>
            <Text style={styles.formLabel}>비밀번호를 재설정해주세요</Text>
            <View style={styles.checkField}>
              <InputField
                placeholder="비밀번호를 입력해주세요."
                value={newPassword}
                onChangeText={setNewPassword}
                secureToggle
              />
              <View style={styles.conditionList}>
                <ConditionItem label="영문 포함" satisfied={hasLetter} />
                <ConditionItem label="숫자 포함" satisfied={hasNumber} />
                <ConditionItem label="특수문자 포함" satisfied={hasSpecial} />
              </View>
            </View>
            <View style={styles.checkField}>
              <InputField
                placeholder="비밀번호 확인"
                value={newPasswordConfirm}
                onChangeText={setNewPasswordConfirm}
                secureToggle
                isError={isConfirmMismatch}
              />
              {isConfirmMismatch && (
                <Text style={styles.codeError}>
                  비밀번호가 일치하지 않아요.
                </Text>
              )}
            </View>
          </View>
          <View style={styles.footer}>
            <Button
              title="다음"
              disabled={
                !isNewPasswordValid ||
                newPasswordConfirm.length === 0 ||
                isConfirmMismatch
              }
              onPress={handleResetPassword}
            />
          </View>
        </>
      );
    }

    return (
      <>
        <View style={styles.passwordForm}>
          <InputField
            label="아이디"
            placeholder="아이디를 입력해주세요."
            value={userId}
            onChangeText={setUserId}
            editable={passwordStep === 'input'}
          />
          <InputField
            label="이메일"
            placeholder="이메일을 입력해주세요."
            value={pwEmail}
            onChangeText={setPwEmail}
            keyboardType="email-address"
            editable={passwordStep === 'input'}
          />
          {passwordStep === 'verify' && (
            <>
              <View style={styles.verifySection}>
                <Text style={styles.formLabel}>인증 번호</Text>
                <View style={styles.verifyRow}>
                  <View style={styles.codeInputBox}>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="인증 번호 6자리"
                      placeholderTextColor={PLACEHOLDER}
                      value={pwCode}
                      onChangeText={(text) => {
                        setPwCode(text);
                        setPwCodeError(false);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <Text style={styles.timer}>{formatTime(pwRemaining)}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.resendButton,
                      !canResend && styles.resendButtonDisabled,
                    ]}
                    disabled={!canResend}
                    onPress={() => {
                      setPwCode('');
                      setPwCodeError(false);
                      setPwRemaining(VERIFY_SECONDS);
                    }}
                  >
                    <Text
                      style={[
                        styles.resendLabel,
                        !canResend && styles.resendLabelDisabled,
                      ]}
                    >
                      재전송
                    </Text>
                  </Pressable>
                </View>
                {pwCodeError && (
                  <Text style={styles.codeError}>
                    인증번호가 일치하지 않아요.
                  </Text>
                )}
              </View>
              <Button
                title="확인"
                disabled={pwCode.length < 6 || pwRemaining === 0}
                onPress={handleVerifyPassword}
                style={styles.verifyButton}
              />
            </>
          )}
        </View>
        {passwordStep === 'input' && (
          <View style={styles.footer}>
            <Button
              title="이메일 인증번호 받기"
              disabled={
                userId.trim().length === 0 || pwEmail.trim().length === 0
              }
              onPress={handleRequestPasswordCode}
            />
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="아이디/비밀번호 찾기" onBack={goBack} />

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

      <NoticeModal
        visible={noMatchVisible}
        image={noResultIllust}
        title="일치하는 회원 정보가 없어요"
        description="입력한 정보가 가입한 정보와 일치하는지 확인해 주세요."
        onConfirm={() => setNoMatchVisible(false)}
      />
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
  passwordForm: {
    gap: 6,
  },
  resetForm: {
    gap: spacing.lg,
  },
  checkField: {
    gap: spacing['2xs'],
  },
  conditionList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3xs'],
  },
  conditionCheck: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
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
  resendButtonDisabled: {
    backgroundColor: colors.grey[300],
    borderColor: colors.grey[300],
  },
  resendLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  resendLabelDisabled: {
    color: colors.white,
  },
  codeError: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: 19,
    color: colors.warning,
  },
  verifyButton: {
    marginTop: 6,
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
