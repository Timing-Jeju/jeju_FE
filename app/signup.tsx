import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Checkbox,
  CheckMark,
  Divider,
  InputField,
  ScreenHeader,
  Text,
} from '@/components/ui';
import {
  colors,
  fontFamily,
  fontSize,
  grid,
  lineHeight,
  spacing,
} from '@/constants';
import { fetchLegalDocuments, type LegalDocument } from '@/services/api';
import { signUpWithProfile } from '@/services/auth';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BACKGROUND = '#FAFAFA';

const doneIllust = require('../assets/images/illust-signup-done.png');

type Step = 'terms' | 'credentials' | 'profile' | 'done';

const AGREEMENTS = [
  {
    key: 'age',
    label: '[필수] 만 14세 이상입니다.',
    required: true,
    viewable: false,
  },
  {
    key: 'terms',
    label: '[필수] 서비스 이용약관에 동의',
    required: true,
    viewable: true,
  },
  {
    key: 'privacy',
    label: '[필수] 개인정보 처리방침 동의',
    required: true,
    viewable: true,
  },
  {
    key: 'location',
    label: '[필수] 위치 정보 수집 및 이용 동의',
    required: true,
    viewable: true,
  },
  {
    key: 'marketing',
    label: '[선택] 광고 및 마케팅 수신에 동의',
    required: false,
    viewable: true,
  },
] as const;

type AgreementKey = (typeof AGREEMENTS)[number]['key'];

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

export default function SignupScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('terms');
  const [loading, setLoading] = useState(false);
  /**
   * 서버가 시행 중인 법정 문서. AGREEMENTS의 terms/privacy/location과 type으로 짝을 맞춘다.
   * 만 14세 확인과 마케팅 수신은 서버 문서가 없어 앱에서만 확인한다.
   */
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  /** 이메일 인증이 켜져 있어 가입 직후 프로필을 저장하지 못한 경우 */
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchLegalDocuments()
      .then((response) => {
        if (!cancelled) setDocuments(response.items);
      })
      .catch(() => {
        // 문서를 못 받으면 동의 내용을 서버에 남기지 못한다 (가입 자체는 진행한다)
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const documentOf = (key: AgreementKey) =>
    documents.find((document) => document.type === key);

  // 약관 동의
  const [agreed, setAgreed] = useState<Set<AgreementKey>>(new Set());
  const isAllAgreed = agreed.size === AGREEMENTS.length;
  const isRequiredAgreed = AGREEMENTS.filter((item) => item.required).every(
    (item) => agreed.has(item.key),
  );

  const toggleAgreement = (key: AgreementKey) => {
    setAgreed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAllAgreements = () => {
    setAgreed(
      isAllAgreed ? new Set() : new Set(AGREEMENTS.map((item) => item.key)),
    );
  };

  // 1단계: 이메일/비밀번호 (Supabase 계정의 신원은 이메일이다)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // 2단계: 개인 정보
  const [nickname, setNickname] = useState('');

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isPasswordValid = hasLetter && hasNumber && hasSpecial;
  const isConfirmMismatch =
    passwordConfirm.length > 0 && passwordConfirm !== password;

  const isEmailValid = /^\S+@\S+\.\S+$/.test(email.trim());

  const canGoProfile =
    isEmailValid &&
    isPasswordValid &&
    passwordConfirm.length > 0 &&
    !isConfirmMismatch;

  // 서버 nickname은 trim 후 1..50자다
  const trimmedNickname = nickname.trim();
  const canComplete =
    trimmedNickname.length > 0 && trimmedNickname.length <= 50 && !loading;

  /** 약관 '보기' — 서버가 준 문서 주소를 브라우저로 연다 */
  const openDocument = (key: AgreementKey) => {
    const document = documentOf(key);
    if (!document) {
      Alert.alert('준비 중이에요', '약관 문서를 불러오지 못했어요.');
      return;
    }
    WebBrowser.openBrowserAsync(document.contentUrl);
  };

  /** 가입 -> 닉네임 저장 -> 약관 동의 저장까지 services/auth가 한 번에 처리한다 */
  const handleComplete = async () => {
    setLoading(true);

    // 서버 문서가 있는 항목만 동의 내역으로 남긴다
    const consents = documents.map((document) => ({
      documentId: document.documentId,
      agreed: agreed.has(document.type as AgreementKey),
    }));

    const result = await signUpWithProfile({
      email: email.trim(),
      password,
      nickname: trimmedNickname,
      consents,
    });
    setLoading(false);

    if (!result.ok) {
      if (result.message) Alert.alert('회원가입 실패', result.message);
      return;
    }

    setNeedsEmailConfirmation(result.needsEmailConfirmation);
    if (result.warning) Alert.alert('알림', result.warning);
    setStep('done');
  };

  const renderTermsStep = () => (
    <>
      <View style={styles.main}>
        <Text style={styles.title}>
          타이밍 제주{'\n'}서비스 이용 약관에 동의해주세요.
        </Text>
        <View style={styles.agreementGroup}>
          <View style={styles.agreementRow}>
            <Checkbox checked={isAllAgreed} onPress={toggleAllAgreements} />
            <Text style={styles.agreementLabel}>
              모두 동의 (선택 정보 포함)
            </Text>
          </View>
          <Divider size="small" />
          <View style={styles.agreementList}>
            {AGREEMENTS.map((item) => (
              <View key={item.key} style={styles.agreementItem}>
                <View style={styles.agreementRow}>
                  <Checkbox
                    type="check"
                    checked={agreed.has(item.key)}
                    onPress={() => toggleAgreement(item.key)}
                  />
                  <Text style={styles.agreementLabel}>{item.label}</Text>
                </View>
                {item.viewable && (
                  <Pressable
                    hitSlop={spacing.xs}
                    onPress={() => openDocument(item.key)}
                  >
                    <Text style={styles.agreementView}>보기</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          title="회원가입"
          disabled={!isRequiredAgreed}
          onPress={() => setStep('credentials')}
        />
      </View>
    </>
  );

  const renderCredentialsStep = () => (
    <>
      <View style={styles.main}>
        <Text style={styles.title}>
          로그인에 사용할{'\n'}이메일과 비밀번호를 입력해주세요.
        </Text>
        <View style={styles.fieldGroup}>
          {/*
           * 계정의 신원은 이메일이다. 중복 확인 API가 따로 없고,
           * 이미 가입된 이메일은 마지막 단계에서 Supabase가 알려준다.
           */}
          <View style={styles.checkField}>
            <InputField
              placeholder="이메일을 입력해주세요."
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              isError={email.length > 0 && !isEmailValid}
            />
            {email.length > 0 && !isEmailValid && (
              <Text style={styles.errorText}>
                이메일 형식이 올바르지 않아요.
              </Text>
            )}
          </View>

          <View style={styles.checkField}>
            <InputField
              placeholder="비밀번호를 입력해주세요."
              value={password}
              onChangeText={setPassword}
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
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureToggle
              isError={isConfirmMismatch}
            />
            {isConfirmMismatch && (
              <Text style={styles.errorText}>비밀번호가 일치하지 않아요.</Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          title="다음"
          disabled={!canGoProfile}
          onPress={() => setStep('profile')}
        />
      </View>
    </>
  );

  const renderProfileStep = () => (
    <>
      <View style={styles.main}>
        <Text style={styles.title}>
          타이밍제주 사용을 위해{'\n'}간단한 정보를 입력해주세요
        </Text>
        <View style={styles.profileGroup}>
          {/*
           * 서버 프로필에는 nickname만 있다. 이름 입력란은 저장할 곳이 없어 뺐고,
           * 이메일은 앞 단계에서 계정 아이디로 받는다.
           * 닉네임 중복 확인 API도 없어 저장할 때 409로 알려준다.
           */}
          <View style={styles.profileField}>
            <Text style={styles.fieldLabel}>닉네임</Text>
            <InputField
              placeholder="내용을 입력해주세요."
              value={nickname}
              onChangeText={setNickname}
            />
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <Button title="다음" disabled={!canComplete} onPress={handleComplete} />
      </View>
    </>
  );

  const renderDoneStep = () => (
    <>
      <View style={styles.doneBody}>
        <Image
          source={doneIllust}
          style={styles.doneImage}
          resizeMode="contain"
        />
        <View style={styles.doneTextGroup}>
          <Text style={styles.doneTitle}>
            {needsEmailConfirmation
              ? '인증 메일을 보냈어요.'
              : '회원가입이 완료되었습니다.'}
          </Text>
          <Text style={styles.doneSubtitle}>
            {needsEmailConfirmation
              ? '메일의 링크로 인증을 마친 뒤 로그인해주세요.'
              : '타이밍 제주와 함께 즐거운 여행되세요.'}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Button title="로그인하러 가기" onPress={() => router.back()} />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title={step === 'done' ? undefined : '회원가입'}
          onBack={
            step === 'profile'
              ? () => setStep('credentials')
              : step === 'credentials'
                ? () => setStep('terms')
                : undefined
          }
        />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {step === 'terms' && renderTermsStep()}
          {step === 'credentials' && renderCredentialsStep()}
          {step === 'profile' && renderProfileStep()}
          {step === 'done' && renderDoneStep()}
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
  content: {
    flexGrow: 1,
    paddingHorizontal: grid.pageMargin,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  main: {
    gap: 40,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  fieldGroup: {
    gap: spacing.md,
  },
  agreementGroup: {
    gap: spacing.lg,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  agreementList: {
    gap: 28,
  },
  agreementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agreementLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
  },
  agreementView: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.lg,
    color: colors.grey[300],
  },
  checkField: {
    gap: spacing['2xs'],
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: 19,
    color: colors.warning,
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
  profileGroup: {
    gap: spacing['2xl'],
  },
  profileField: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: spacing['2xl'],
  },
  doneBody: {
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: 57,
  },
  doneImage: {
    width: 200,
    height: 185,
  },
  doneTextGroup: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  doneTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight.xl,
    color: colors.grey[900],
    textAlign: 'center',
  },
  doneSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.grey[900],
    textAlign: 'center',
  },
});
