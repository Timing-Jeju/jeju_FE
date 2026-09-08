import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import {
  updateLegalConsents,
  updateProfile,
  withAccessToken,
  type LegalConsent,
  type SocialProviderId,
} from '@/services/api';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * 로그인 흐름. 화면은 이 파일만 쓰고 Supabase SDK를 직접 부르지 않는다.
 *
 * 로그인에 성공하면 `subscribeAuthSession` 구독자에게 세션이 전달되고,
 * store가 access token을 받아 백엔드 호출에 쓴다.
 */

// 웹에서 남아 있는 인증 세션을 정리한다 (네이티브에서는 아무 일도 하지 않는다)
WebBrowser.maybeCompleteAuthSession();

/**
 * OAuth 콜백 주소. 빌드마다 고정이며 Supabase Dashboard의
 * Authentication → URL Configuration → Redirect URLs에 정확히 등록해야 한다.
 *
 * 사용자 입력이나 query를 섞어 조립하지 않는다.
 */
export const AUTH_CALLBACK_URL = Linking.createURL('auth/callback');

/** 앱이 들고 다니는 최소한의 세션 정보 */
export interface AuthSession {
  accessToken: string;
  userId: string;
  email: string | null;
}

export interface AuthResult {
  ok: boolean;
  /** 실패했을 때 화면에 그대로 보여줄 문구 */
  message?: string;
}

/**
 * 회원가입 도중에는 세션 변화를 구독자에게 알리지 않는다.
 * (가입 직후 잠깐 생겼다 사라지는 세션으로 화면이 튀는 것을 막는다)
 */
let suppressed = false;

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: 'Supabase 설정이 없어 로그인할 수 없어요.',
};

/** Supabase 오류 문구는 영어라 자주 나오는 것만 한국어로 바꾼다 */
const messageOf = (message: string) => {
  if (message.includes('Invalid login credentials')) {
    return '아이디 또는 비밀번호가 올바르지 않아요.';
  }
  if (message.includes('Email not confirmed')) {
    return '이메일 인증을 먼저 완료해 주세요.';
  }
  return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
};

/** 가입 오류도 자주 나오는 것만 한국어로 바꾼다 */
const signUpMessageOf = (message: string) => {
  if (message.includes('already registered')) {
    return '이미 가입된 이메일이에요.';
  }
  if (message.includes('Password should be')) {
    return '비밀번호가 너무 짧아요.';
  }
  if (message.includes('Signups not allowed')) {
    return '지금은 회원가입을 받지 않아요.';
  }
  return '회원가입하지 못했어요. 잠시 후 다시 시도해 주세요.';
};

export interface SignUpResult extends AuthResult {
  /**
   * 이메일 인증을 켜 둔 프로젝트는 세션 없이 끝난다.
   * 이 경우 인증 메일을 확인하기 전까지 백엔드를 호출할 수 없어
   * 닉네임과 약관 동의를 저장하지 못한다.
   */
  needsEmailConfirmation: boolean;
  /** 계정은 만들어졌지만 프로필·동의 저장에 실패했을 때의 안내 문구 */
  warning?: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  /** trim 후 1..50자 */
  nickname: string;
  consents: LegalConsent[];
}

/**
 * 회원가입 한 묶음.
 *
 * 가입은 Supabase가, 닉네임(`PATCH /me`)과 약관 동의(`PUT /me/consents`)는
 * 백엔드가 맡는다. 세 호출이 한 흐름이라 화면이 아니라 여기서 묶는다.
 *
 * 저장이 끝나면 로그아웃한다. 완료 화면의 "로그인하러 가기" 흐름에 맞추기 위해서다.
 * 그 사이 잠깐 생기는 세션은 store에 반영하지 않는다 —
 * 반영하면 라우팅 가드가 곧바로 홈으로 넘겨 완료 화면이 사라진다.
 */
export async function signUpWithProfile({
  email,
  password,
  nickname,
  consents,
}: SignUpInput): Promise<SignUpResult> {
  if (!isSupabaseConfigured()) {
    return { ...NOT_CONFIGURED, needsEmailConfirmation: false };
  }

  /*
   * signUp이 성공하는 순간 Supabase가 세션 변화를 알린다.
   * 그 알림이 store에 닿으면 라우팅 가드가 홈으로 넘겨 완료 화면이 사라지므로,
   * 호출 전부터 막아 두고 흐름이 끝날 때 푼다.
   */
  suppressed = true;

  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return {
        ok: false,
        message: signUpMessageOf(error.message),
        needsEmailConfirmation: false,
      };
    }

    const session = data.session;
    if (!session) {
      // 인증 메일을 확인해야 세션이 생긴다. 프로필은 로그인 후에 채운다.
      return { ok: true, needsEmailConfirmation: true };
    }

    let warning: string | undefined;
    try {
      // store를 거치지 않고 방금 받은 토큰으로만 부른다
      await withAccessToken(session.access_token, async () => {
        await updateProfile({ nickname });
        if (consents.length > 0) await updateLegalConsents(consents);
      });
    } catch {
      warning =
        '가입은 됐지만 프로필 저장에 실패했어요. 로그인 후 마이페이지에서 설정해주세요.';
    }

    await supabase.auth.signOut();
    return { ok: true, needsEmailConfirmation: false, warning };
  } finally {
    suppressed = false;
  }
}

/** 이메일 + 비밀번호 로그인 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return error
    ? { ok: false, message: messageOf(error.message) }
    : { ok: true };
}

/**
 * 콜백 URL에서 세션을 만든다.
 *
 * PKCE 흐름은 query에 `code`가 오고, 예전 implicit 흐름은 fragment에
 * `access_token`이 온다. 어느 쪽이든 받아들인다.
 */
async function completeOAuth(callbackUrl: string): Promise<AuthResult> {
  const [, fragment] = callbackUrl.split('#');
  const query = Linking.parse(callbackUrl).queryParams ?? {};
  const fragmentParams = new URLSearchParams(fragment ?? '');

  const code = typeof query.code === 'string' ? query.code : null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error
      ? { ok: false, message: messageOf(error.message) }
      : { ok: true };
  }

  const accessToken = fragmentParams.get('access_token');
  const refreshToken = fragmentParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error
      ? { ok: false, message: messageOf(error.message) }
      : { ok: true };
  }

  return { ok: false, message: '로그인 정보를 받지 못했어요.' };
}

/**
 * 소셜 로그인. 브라우저를 띄워 공급자 인증을 마치고 앱으로 돌아온다.
 *
 * provider 값은 백엔드 `GET /auth/social/providers`가 주는 값을 그대로 쓴다.
 * (google / kakao / custom:naver)
 */
export async function signInWithProvider(
  provider: SocialProviderId,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: AUTH_CALLBACK_URL,
      // 브라우저는 우리가 직접 띄운다
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    return { ok: false, message: '로그인 창을 열지 못했어요.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    AUTH_CALLBACK_URL,
  );

  if (result.type !== 'success') {
    // 사용자가 창을 닫은 경우는 오류로 알리지 않는다
    return { ok: false };
  }

  return completeOAuth(result.url);
}

/** 로그아웃. 구독자에게 null 세션이 전달되면서 store가 비워진다. */
export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
}

/** Supabase 세션에서 앱이 쓰는 값만 꺼낸다 */
const toAuthSession = (
  session: {
    access_token: string;
    user: { id: string; email?: string };
  } | null,
): AuthSession | null =>
  session
    ? {
        accessToken: session.access_token,
        userId: session.user.id,
        email: session.user.email ?? null,
      }
    : null;

/**
 * 세션 변화를 구독한다. 로그인 / 로그아웃뿐 아니라
 * token이 자동 갱신될 때도 새 access token이 전달된다.
 */
export function subscribeAuthSession(
  listener: (session: AuthSession | null) => void,
) {
  if (!isSupabaseConfigured()) return () => {};

  const notify = (session: Parameters<typeof toAuthSession>[0]) => {
    if (suppressed) return;
    listener(toAuthSession(session));
  };

  // 이미 세션이 있으면 먼저 알려준다
  supabase.auth.getSession().then(({ data }) => notify(data.session));

  const { data } = supabase.auth.onAuthStateChange((_event, session) =>
    notify(session),
  );

  return () => data.subscription.unsubscribe();
}
