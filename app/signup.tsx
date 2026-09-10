import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
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
import { isSafeLegalContentUrl } from '@/services/api/legal';
import { hasCode } from '@/services/api/problem';
import {
  clearPendingConsentIntent,
  savePendingConsentIntent,
} from '@/services/pendingConsent';
import { useProfileLegalStore } from '@/store/useProfileLegalStore';
import { useUserStore } from '@/store/useUserStore';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BACKGROUND = '#FAFAFA';

const doneIllust = require('../assets/images/illust-signup-done.png');

type Step = 'terms' | 'credentials' | 'profile' | 'done';

const LOCAL_AGREEMENTS = [
  {
    key: 'age',
    label: '[필수] 만 14세 이상입니다.',
    required: true,
    viewable: false,
  },
  {
    key: 'marketing',
    label: '[선택] 광고 및 마케팅 수신에 동의',
    required: false,
    viewable: true,
  },
] as const;

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
  const userId = useUserStore((state) => state.userId);
  const legalDocuments = useProfileLegalStore((state) => state.legalDocuments);
  const legalStatus = useProfileLegalStore((state) => state.legalStatus);
  const legalError = useProfileLegalStore((state) => state.legalError);
  const consentStatus = useProfileLegalStore((state) => state.consentStatus);
  const consentError = useProfileLegalStore((state) => state.consentError);
  const loadLegalDocuments = useProfileLegalStore(
    (state) => state.loadLegalDocuments,
  );
  const saveRequiredConsents = useProfileLegalStore(
    (state) => state.saveRequiredConsents,
  );

  const [step, setStep] = useState<Step>('terms');

  // 약관 동의
  const agreements = useMemo(
    () => [
      LOCAL_AGREEMENTS[0],
      ...legalDocuments.map((document) => ({
        key: document.documentId,
        label: `${document.required ? '[필수]' : '[선택]'} ${document.title}`,
        required: document.required,
        viewable: true,
        contentUrl: document.contentUrl,
      })),
      LOCAL_AGREEMENTS[1],
    ],
    [legalDocuments],
  );
  const [agreed, setAgreed] = useState<Set<string>>(new Set());
  const isAllAgreed =
    agreements.length > 0 && agreed.size === agreements.length;
  const isRequiredAgreed = agreements
    .filter((item) => item.required)
    .every((item) => agreed.has(item.key));

  useEffect(() => {
    void loadLegalDocuments().catch(() => undefined);
  }, [loadLegalDocuments]);

  const toggleAgreement = (key: string) => {
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
      isAllAgreed ? new Set() : new Set(agreements.map((item) => item.key)),
    );
  };

  const openLegalDocument = (contentUrl: string | undefined) => {
    if (!contentUrl || !isSafeLegalContentUrl(contentUrl)) {
      Alert.alert('약관을 열 수 없어요', '안전한 약관 주소를 확인해 주세요.');
      return;
    }
    void WebBrowser.openBrowserAsync(contentUrl);
  };

  const handleTermsContinue = () => {
    if (!userId) {
      const selectedDocuments = legalDocuments
        .filter((document) => agreed.has(document.documentId))
        .map(({ documentId, version }) => ({ documentId, version }));
      void savePendingConsentIntent(selectedDocuments)
        .then(() => setStep('credentials'))
        .catch(() => undefined);
      return;
    }
    void saveRequiredConsents(userId, agreed)
      .then(async () => {
        await clearPendingConsentIntent(userId);
        router.back();
      })
      .catch(async (error) => {
        if (hasCode(error, 'PROFILE_CONFLICT')) {
          setAgreed(new Set(['age']));
          await loadLegalDocuments().catch(() => undefined);
        }
      });
  };

  // 1단계: 아이디/비밀번호
  const [id, setId] = useState('');
  const [idStatus, setIdStatus] = useState<
    'unchecked' | 'available' | 'duplicated'
  >('unchecked');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // 2단계: 개인 정보
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<
    'unchecked' | 'available' | 'duplicated'
  >('unchecked');
  const [email, setEmail] = useState('');

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isPasswordValid = hasLetter && hasNumber && hasSpecial;
  const isConfirmMismatch =
    passwordConfirm.length > 0 && passwordConfirm !== password;

  const canGoProfile =
    idStatus === 'available' &&
    isPasswordValid &&
    passwordConfirm.length > 0 &&
    !isConfirmMismatch;

  const canComplete =
    name.trim().length > 0 &&
    nicknameStatus === 'available' &&
    /^\S+@\S+\.\S+$/.test(email);

  const handleCheckId = () => {
    // TODO: 아이디 중복 확인 API 연동 전 임시 검증
    setIdStatus(id.trim().length >= 4 ? 'available' : 'duplicated');
  };

  const handleCheckNickname = () => {
    // TODO: 닉네임 중복 확인 API 연동 전 임시 검증
    setNicknameStatus(nickname.trim().length >= 2 ? 'available' : 'duplicated');
  };

  const handleComplete = () => {
    Alert.alert('회원가입 준비 중', '회원가입 기능을 준비하고 있어요.');
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
            {legalStatus === 'loading' && legalDocuments.length === 0 && (
              <Text style={styles.agreementLabel}>
                약관을 불러오는 중이에요.
              </Text>
            )}
            {legalStatus === 'error' && legalError && (
              <View style={styles.agreementList}>
                <Text style={styles.errorText}>{legalError}</Text>
                <Pressable
                  onPress={() =>
                    void loadLegalDocuments().catch(() => undefined)
                  }
                >
                  <Text style={styles.agreementView}>다시 시도</Text>
                </Pressable>
              </View>
            )}
            {agreements.map((item) => (
              <View key={item.key} style={styles.agreementItem}>
                <View style={styles.agreementRow}>
                  <Checkbox
                    type="check"
                    checked={agreed.has(item.key)}
                    onPress={() => toggleAgreement(item.key)}
                  />
                  <Pressable onPress={() => toggleAgreement(item.key)}>
                    <Text style={styles.agreementLabel}>{item.label}</Text>
                  </Pressable>
                </View>
                {item.viewable && (
                  <Pressable
                    hitSlop={spacing.xs}
                    onPress={() =>
                      openLegalDocument(
                        'contentUrl' in item ? item.contentUrl : undefined,
                      )
                    }
                  >
                    <Text style={styles.agreementView}>보기</Text>
                  </Pressable>
                )}
              </View>
            ))}
            {consentStatus === 'error' && consentError && (
              <Text style={styles.errorText}>{consentError}</Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          title="회원가입"
          disabled={
            legalStatus !== 'ready' ||
            consentStatus === 'saving' ||
            !isRequiredAgreed
          }
          onPress={handleTermsContinue}
        />
      </View>
    </>
  );

  const renderCredentialsStep = () => (
    <>
      <View style={styles.main}>
        <Text style={styles.title}>
          로그인에 사용할{'\n'}아이디와 비밀번호를 입력해주세요.
        </Text>
        <View style={styles.fieldGroup}>
          <View style={styles.checkField}>
            <View style={styles.checkRow}>
              <View style={styles.checkInput}>
                <InputField
                  placeholder="아이디를 입력해주세요."
                  value={id}
                  onChangeText={(text) => {
                    setId(text);
                    setIdStatus('unchecked');
                  }}
                  isError={idStatus === 'duplicated'}
                />
              </View>
              <Button
                title="중복 확인"
                color="point"
                size="small"
                shape="rectangle"
                onPress={handleCheckId}
                style={styles.checkButton}
              />
            </View>
            {idStatus === 'duplicated' && (
              <Text style={styles.errorText}>이미 존재하는 아이디입니다.</Text>
            )}
            {idStatus === 'available' && (
              <Text style={styles.correctText}>아이디 사용 가능</Text>
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
          <View style={styles.profileField}>
            <Text style={styles.fieldLabel}>이름</Text>
            <InputField
              placeholder="내용을 입력해주세요."
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.profileField}>
            <Text style={styles.fieldLabel}>닉네임</Text>
            <View style={styles.checkRow}>
              <View style={styles.checkInput}>
                <InputField
                  placeholder="내용을 입력해주세요."
                  value={nickname}
                  onChangeText={(text) => {
                    setNickname(text);
                    setNicknameStatus('unchecked');
                  }}
                  isError={nicknameStatus === 'duplicated'}
                />
              </View>
              <Button
                title="중복 확인"
                color="point"
                size="small"
                shape="rectangle"
                onPress={handleCheckNickname}
                style={styles.checkButton}
              />
            </View>
            {nicknameStatus === 'duplicated' && (
              <Text style={styles.errorText}>이미 존재하는 닉네임입니다.</Text>
            )}
            {nicknameStatus === 'available' && (
              <Text style={styles.correctText}>닉네임 사용 가능</Text>
            )}
          </View>

          <View style={styles.profileField}>
            <Text style={styles.fieldLabel}>이메일</Text>
            <InputField
              placeholder="내용을 입력해주세요."
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
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
          <Text style={styles.doneTitle}>회원가입이 완료되었습니다.</Text>
          <Text style={styles.doneSubtitle}>
            타이밍 제주와 함께 즐거운 여행되세요.
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  checkInput: {
    flex: 1,
  },
  checkButton: {
    width: 82,
    height: 44,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: 19,
    color: colors.warning,
  },
  correctText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    color: colors.correct,
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
