import * as WebBrowser from 'expo-web-browser';

import { updateLegalConsents, updateProfile } from '@/services/api';
import { getAccessToken } from '@/services/api/session';
import {
  AUTH_CALLBACK_URL,
  signInWithEmail,
  signInWithProvider,
  signOut,
  signUpWithProfile,
  subscribeAuthSession,
} from '@/services/auth';
import { isSupabaseConfigured, supabase } from '@/services/supabase';

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `tourist://${path}`,
  parse: (url: string) => {
    const query = url.split('#')[0].split('?')[1] ?? '';
    return { queryParams: Object.fromEntries(new URLSearchParams(query)) };
  },
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));
jest.mock('@/services/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));
jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api/session'),
  updateLegalConsents: jest.fn(),
  updateProfile: jest.fn(),
}));

const auth = jest.mocked(supabase.auth);
const mockedConfigured = jest.mocked(isSupabaseConfigured);
const mockedOpenAuth = jest.mocked(WebBrowser.openAuthSessionAsync);
const mockedUpdateProfile = jest.mocked(updateProfile);
const mockedUpdateConsents = jest.mocked(updateLegalConsents);

const session = {
  access_token: 'jwt',
  user: { id: 'u1', email: 'a@b.c' },
};
const signUpInput = {
  email: 'a@b.c',
  password: 'pw',
  nickname: '닉',
  consents: [{ documentId: 'd1', agreed: true }],
};

type Emit = (event: string, next: typeof session | null) => void;

const authError = (message: string) => ({ message }) as never;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  mockedConfigured.mockReturnValue(true);
  auth.signOut.mockResolvedValue({ error: null });
  auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  } as never);
  auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  } as never);
  mockedUpdateProfile.mockResolvedValue({} as never);
  mockedUpdateConsents.mockResolvedValue({} as never);
});

it('콜백 주소는 앱 스킴으로 고정된다', () => {
  expect(AUTH_CALLBACK_URL).toBe('tourist://auth/callback');
});

describe('signUpWithProfile', () => {
  it('Supabase 설정이 없으면 안내 문구와 함께 실패한다', async () => {
    mockedConfigured.mockReturnValue(false);
    await expect(signUpWithProfile(signUpInput)).resolves.toEqual({
      ok: false,
      message: 'Supabase 설정이 없어 로그인할 수 없어요.',
      needsEmailConfirmation: false,
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('가입 오류는 한국어 문구로 바꾼다', async () => {
    auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: authError('User already registered'),
    } as never);

    await expect(signUpWithProfile(signUpInput)).resolves.toMatchObject({
      ok: false,
      message: '이미 가입된 이메일이에요.',
    });
  });

  it('이메일 인증이 켜져 있으면 세션 없이 끝나고 프로필은 저장하지 않는다', async () => {
    auth.signUp.mockResolvedValue({
      data: { user: {}, session: null },
      error: null,
    } as never);

    await expect(signUpWithProfile(signUpInput)).resolves.toEqual({
      ok: true,
      needsEmailConfirmation: true,
    });
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('세션이 생기면 그 토큰으로만 닉네임 · 동의를 저장한 뒤 로그아웃한다', async () => {
    auth.signUp.mockResolvedValue({
      data: { user: {}, session },
      error: null,
    } as never);
    const seenTokens: (string | null)[] = [];
    mockedUpdateProfile.mockImplementation(async () => {
      seenTokens.push(getAccessToken());
      return {} as never;
    });
    mockedUpdateConsents.mockImplementation(async () => {
      seenTokens.push(getAccessToken());
      return {} as never;
    });

    const result = await signUpWithProfile(signUpInput);

    expect(result).toEqual({ ok: true, needsEmailConfirmation: false });
    expect(mockedUpdateProfile).toHaveBeenCalledWith({ nickname: '닉' });
    expect(mockedUpdateConsents).toHaveBeenCalledWith(signUpInput.consents);
    expect(seenTokens).toEqual(['jwt', 'jwt']);
    // 흐름이 끝나면 우회 토큰은 남지 않는다
    expect(getAccessToken()).toBeNull();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('동의 항목이 없으면 동의 저장은 부르지 않는다', async () => {
    auth.signUp.mockResolvedValue({
      data: { user: {}, session },
      error: null,
    } as never);

    await signUpWithProfile({ ...signUpInput, consents: [] });

    expect(mockedUpdateConsents).not.toHaveBeenCalled();
  });

  it('프로필 저장이 실패해도 가입은 성공으로 보고 경고만 남긴다', async () => {
    auth.signUp.mockResolvedValue({
      data: { user: {}, session },
      error: null,
    } as never);
    mockedUpdateProfile.mockRejectedValue(new Error('409'));

    const result = await signUpWithProfile(signUpInput);

    expect(result.ok).toBe(true);
    expect(result.warning).toContain('프로필 저장에 실패');
    expect(mockedUpdateConsents).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('가입 중에 생겼다 사라지는 세션은 구독자에게 알리지 않는다', async () => {
    const emitter: { emit: Emit | null } = { emit: null };
    auth.onAuthStateChange.mockImplementation(((callback: Emit) => {
      emitter.emit = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }) as never);
    const listener = jest.fn();
    subscribeAuthSession(listener);

    auth.signUp.mockImplementation(async () => {
      emitter.emit?.('SIGNED_IN', session);
      return { data: { user: {}, session }, error: null } as never;
    });
    auth.signOut.mockImplementation(async () => {
      emitter.emit?.('SIGNED_OUT', null);
      return { error: null };
    });

    await signUpWithProfile(signUpInput);
    expect(listener).not.toHaveBeenCalled();

    // 가입이 끝난 뒤의 세션 변화는 정상적으로 전달된다
    emitter.emit?.('SIGNED_IN', session);
    expect(listener).toHaveBeenCalledWith({
      accessToken: 'jwt',
      userId: 'u1',
      email: 'a@b.c',
    });
  });
});

describe('signInWithEmail', () => {
  it('성공하면 ok, 실패하면 한국어 문구를 돌려준다', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null } as never);
    await expect(signInWithEmail('a@b.c', 'pw')).resolves.toEqual({ ok: true });

    auth.signInWithPassword.mockResolvedValue({
      error: authError('Invalid login credentials'),
    } as never);
    await expect(signInWithEmail('a@b.c', 'pw')).resolves.toEqual({
      ok: false,
      message: '아이디 또는 비밀번호가 올바르지 않아요.',
    });
  });

  it('설정이 없으면 Supabase 를 부르지 않는다', async () => {
    mockedConfigured.mockReturnValue(false);
    await expect(signInWithEmail('a@b.c', 'pw')).resolves.toMatchObject({
      ok: false,
    });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('signInWithProvider', () => {
  beforeEach(() => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider/auth' },
      error: null,
    } as never);
  });

  it('브라우저를 직접 띄우고 콜백 주소로 돌아오게 한다', async () => {
    mockedOpenAuth.mockResolvedValue({ type: 'cancel' } as never);

    await signInWithProvider('kakao');

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'kakao',
      options: { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true },
    });
    expect(mockedOpenAuth).toHaveBeenCalledWith(
      'https://provider/auth',
      AUTH_CALLBACK_URL,
    );
  });

  it('사용자가 창을 닫으면 문구 없이 실패로 끝난다', async () => {
    mockedOpenAuth.mockResolvedValue({ type: 'cancel' } as never);
    await expect(signInWithProvider('google')).resolves.toEqual({ ok: false });
  });

  it('PKCE 콜백(code)은 code 를 세션으로 바꾼다', async () => {
    mockedOpenAuth.mockResolvedValue({
      type: 'success',
      url: 'tourist://auth/callback?code=abc',
    });
    auth.exchangeCodeForSession.mockResolvedValue({ error: null } as never);

    await expect(signInWithProvider('google')).resolves.toEqual({ ok: true });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('implicit 콜백(fragment 토큰)은 setSession 으로 받는다', async () => {
    mockedOpenAuth.mockResolvedValue({
      type: 'success',
      url: 'tourist://auth/callback#access_token=at&refresh_token=rt',
    });
    auth.setSession.mockResolvedValue({ error: null } as never);

    await expect(signInWithProvider('custom:naver')).resolves.toEqual({
      ok: true,
    });
    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
  });

  it('콜백에 아무 정보도 없으면 실패 문구를 돌려준다', async () => {
    mockedOpenAuth.mockResolvedValue({
      type: 'success',
      url: 'tourist://auth/callback',
    });
    await expect(signInWithProvider('google')).resolves.toEqual({
      ok: false,
      message: '로그인 정보를 받지 못했어요.',
    });
  });

  it('로그인 창 주소를 못 받으면 실패한다', async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    } as never);
    await expect(signInWithProvider('google')).resolves.toEqual({
      ok: false,
      message: '로그인 창을 열지 못했어요.',
    });
    expect(mockedOpenAuth).not.toHaveBeenCalled();
  });
});

describe('subscribeAuthSession', () => {
  it('기존 세션을 먼저 알리고 이후 변화도 앱이 쓰는 모양으로 전달한다', async () => {
    const emitter: { emit: Emit | null } = { emit: null };
    const unsubscribe = jest.fn();
    auth.getSession.mockResolvedValue({
      data: { session },
      error: null,
    } as never);
    auth.onAuthStateChange.mockImplementation(((callback: Emit) => {
      emitter.emit = callback;
      return { data: { subscription: { unsubscribe } } };
    }) as never);
    const listener = jest.fn();

    const stop = subscribeAuthSession(listener);
    await flush();

    expect(listener).toHaveBeenCalledWith({
      accessToken: 'jwt',
      userId: 'u1',
      email: 'a@b.c',
    });

    emitter.emit?.('TOKEN_REFRESHED', { ...session, access_token: 'jwt2' });
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ accessToken: 'jwt2' }),
    );

    emitter.emit?.('SIGNED_OUT', null);
    expect(listener).toHaveBeenLastCalledWith(null);

    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('이메일이 없는 사용자는 email 이 null 이다', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'jwt', user: { id: 'u2' } } },
      error: null,
    } as never);
    const listener = jest.fn();

    subscribeAuthSession(listener);
    await flush();

    expect(listener).toHaveBeenCalledWith({
      accessToken: 'jwt',
      userId: 'u2',
      email: null,
    });
  });

  it('설정이 없으면 구독하지 않고 빈 해제 함수를 돌려준다', () => {
    mockedConfigured.mockReturnValue(false);
    const stop = subscribeAuthSession(jest.fn());
    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });
});

describe('signOut', () => {
  it('설정이 있을 때만 Supabase 세션을 끊는다', async () => {
    await signOut();
    expect(auth.signOut).toHaveBeenCalledTimes(1);

    mockedConfigured.mockReturnValue(false);
    await signOut();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});
