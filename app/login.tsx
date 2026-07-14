import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useUserStore } from '@/store/useUserStore';

// Figma 디자인 전용 색상 (constants 팔레트에 없는 값)
const BACKGROUND = '#FAFAFA';
const TITLE = '#191919';
const DIVIDER = '#F0F0F0';

const kakaoIcon = require('../assets/images/sns-kakao.png');
const googleIcon = require('../assets/images/sns-google.png');
const naverIcon = require('../assets/images/sns-naver.png');

export default function LoginScreen() {
  const router = useRouter();
  const login = useUserStore((state) => state.login);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [idError, setIdError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const canSubmit = id.trim().length > 0 && password.length > 0;

  const handleLogin = () => {
    // TODO: 로그인 API 연동 전 임시 검증
    const isIdValid = id.trim().length >= 4;
    const isPasswordValid = password.length >= 6;
    setIdError(!isIdValid);
    setPasswordError(!isPasswordValid);
    if (!isIdValid || !isPasswordValid) return;

    // 로그인 상태가 되면 _layout의 Stack.Protected 가드가 (tabs)로 전환한다
    login(id.trim());
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
              label="아이디"
              placeholder="아이디를 입력해주세요."
              value={id}
              onChangeText={setId}
              isError={idError}
              errorMessage="아이디가 올바르지 않아요."
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
