import { useRouter } from 'expo-router';
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

import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Text } from '@/components/ui/Text';
import {
  colors,
  fontFamily,
  fontSize,
  grid,
  letterSpacing,
  spacing,
} from '@/constants';
import { fetchSocialProviders, type SocialProviderId } from '@/services/api';
import { signInWithEmail, signInWithProvider } from '@/services/auth';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BACKGROUND = '#FAFAFA';
const TITLE = '#191919';
const DIVIDER = '#F0F0F0';

const kakaoIcon = require('../assets/images/sns-kakao.png');
const googleIcon = require('../assets/images/sns-google.png');
const naverIcon = require('../assets/images/sns-naver.png');

/** 디자인상 노출 순서 — 서버가 지원한다고 알려준 공급자만 이 순서로 그린다 */
const PROVIDER_ORDER: SocialProviderId[] = ['kakao', 'google', 'custom:naver'];

const PROVIDER_ICONS: Record<SocialProviderId, number> = {
  kakao: kakaoIcon,
  google: googleIcon,
  'custom:naver': naverIcon,
};

/** 이메일 형식만 거른다. 실제 계정 확인은 Supabase가 한다. */
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function LoginScreen() {
  const router = useRouter();

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [idError, setIdError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  /** 서버가 알려준 지원 공급자. 조회 전/실패 시에는 디자인대로 셋 다 보여준다. */
  const [providers, setProviders] =
    useState<SocialProviderId[]>(PROVIDER_ORDER);

  const canSubmit = id.trim().length > 0 && password.length > 0 && !loading;

  useEffect(() => {
    let cancelled = false;

    fetchSocialProviders()
      .then(({ providers: supported }) => {
        if (cancelled) return;
        const ids = supported.map((provider) => provider.id);
        setProviders(
          PROVIDER_ORDER.filter((provider) => ids.includes(provider)),
        );
      })
      .catch(() => {
        // 목록을 못 받아도 로그인은 시도할 수 있어야 한다
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * 로그인은 Supabase Auth가 처리한다. 성공하면 세션이 store에 반영되고
   * _layout의 Stack.Protected 가드가 (tabs)로 전환한다.
   */
  const handleLogin = async () => {
    const email = id.trim();
    const isIdValid = isEmail(email);
    const isPasswordValid = password.length >= 6;
    setIdError(!isIdValid);
    setPasswordError(!isPasswordValid);
    if (!isIdValid || !isPasswordValid) return;

    setLoading(true);
    const result = await signInWithEmail(email, password);
    setLoading(false);

    if (!result.ok && result.message) {
      Alert.alert('로그인 실패', result.message);
    }
  };

  const handleSocialLogin = async (provider: SocialProviderId) => {
    setLoading(true);
    const result = await signInWithProvider(provider);
    setLoading(false);

    if (!result.ok && result.message) {
      Alert.alert('로그인 실패', result.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.title}>
            지금 딱 제주 갈 타이밍,{'\n'}타이밍제주
          </Text>

          <View style={styles.form}>
            <InputField
              label="이메일"
              placeholder="이메일을 입력해주세요."
              value={id}
              onChangeText={setId}
              isError={idError}
              errorMessage="이메일 형식이 올바르지 않아요."
            />
            <InputField
              label="비밀번호"
              placeholder="비밀번호를 입력해주세요."
              value={password}
              onChangeText={setPassword}
              isError={passwordError}
              errorMessage="비밀번호가 올바르지 않아요."
              secureToggle
            />
          </View>

          <View style={styles.linkRow}>
            <Pressable onPress={() => router.push('/find-account?tab=id')}>
              <Text style={styles.link}>아이디 찾기</Text>
            </Pressable>
            <View style={styles.linkDivider} />
            <Pressable
              onPress={() => router.push('/find-account?tab=password')}
            >
              <Text style={styles.link}>비밀번호 찾기</Text>
            </Pressable>
            <View style={styles.linkDivider} />
            <Pressable onPress={() => router.push('/signup')}>
              <Text style={styles.link}>회원가입</Text>
            </Pressable>
          </View>

          <Button
            title="로그인"
            disabled={!canSubmit}
            onPress={handleLogin}
            style={styles.loginButton}
          />

          {/* 서버가 켜 둔 공급자가 하나도 없으면 영역째 감춘다 */}
          {providers.length > 0 && (
            <View style={styles.snsSection}>
              <View style={styles.snsHeader}>
                <View style={styles.snsLine} />
                <Text style={styles.snsTitle}>SNS계정으로 로그인</Text>
                <View style={styles.snsLine} />
              </View>
              <View style={styles.snsButtons}>
                {providers.map((provider) => (
                  <Pressable
                    key={provider}
                    disabled={loading}
                    onPress={() => handleSocialLogin(provider)}
                  >
                    <Image
                      source={PROVIDER_ICONS[provider]}
                      style={styles.snsIcon}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
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
    paddingHorizontal: grid.pageMargin,
    paddingTop: 60,
    paddingBottom: spacing['2xl'],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 42,
    letterSpacing: letterSpacing.narrow,
    color: TITLE,
  },
  form: {
    marginTop: 40,
  },
  linkRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  link: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.grey[900],
  },
  linkDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.grey[200],
  },
  loginButton: {
    marginTop: 30,
  },
  snsSection: {
    marginTop: 30,
    gap: spacing.lg,
  },
  snsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  snsLine: {
    flex: 1,
    height: 1,
    backgroundColor: DIVIDER,
  },
  snsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.grey[900],
  },
  snsButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  snsIcon: {
    width: 40,
    height: 40,
  },
});
