import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
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
import { signIn } from '@/services/auth';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BACKGROUND = '#FAFAFA';
const TITLE = '#191919';
const DIVIDER = '#F0F0F0';

const kakaoIcon = require('../assets/images/sns-kakao.png');
const googleIcon = require('../assets/images/sns-google.png');
const naverIcon = require('../assets/images/sns-naver.png');

export default function LoginScreen() {
  const router = useRouter();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [idError, setIdError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const canSubmit = id.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    if (submitting.current) return;
    const isIdValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id.trim());
    setIdError(!isIdValid);
    setPasswordError(!password);
    if (!isIdValid || !password) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await signIn(id, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : '로그인하지 못했어요.');
    } finally {
      submitting.current = false;
      setBusy(false);
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
              accessibilityLabel="이메일"
              keyboardType="email-address"
              autoComplete="email"
              editable={!busy}
              value={id}
              onChangeText={setId}
              isError={idError}
              errorMessage="이메일 형식을 확인해 주세요."
            />
            <InputField
              label="비밀번호"
              placeholder="비밀번호를 입력해주세요."
              accessibilityLabel="비밀번호"
              autoComplete="current-password"
              editable={!busy}
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

          {error && <Text accessibilityRole="alert">{error}</Text>}
          <Button
            title={busy ? '로그인 중...' : '로그인'}
            disabled={!canSubmit || busy}
            onPress={handleLogin}
            style={styles.loginButton}
          />

          <View style={styles.snsSection}>
            <View style={styles.snsHeader}>
              <View style={styles.snsLine} />
              <Text style={styles.snsTitle}>SNS계정으로 로그인</Text>
              <View style={styles.snsLine} />
            </View>
            <View style={styles.snsButtons}>
              <Pressable>
                <Image source={kakaoIcon} style={styles.snsIcon} />
              </Pressable>
              <Pressable>
                <Image source={googleIcon} style={styles.snsIcon} />
              </Pressable>
              <Pressable>
                <Image source={naverIcon} style={styles.snsIcon} />
              </Pressable>
            </View>
          </View>
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
