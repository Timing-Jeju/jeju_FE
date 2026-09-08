import { AppState, type AppStateStatus } from 'react-native';

import {
  startAuthSession,
  signIn,
  signOut,
  getAccessToken,
} from '@/services/auth';
import { useUserStore } from '@/store/useUserStore';

const session = {
  access_token: 'synthetic-access',
  expires_at: 4102444800,
  user: { id: '00000000-0000-4000-8000-000000000001' },
};
let changed: (event: string, value: typeof session | null) => void;
const unsubscribe = jest.fn();
const mockAuth = {
  getSession: jest.fn(),
  getUser: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  startAutoRefresh: jest.fn(),
  stopAutoRefresh: jest.fn(),
  onAuthStateChange: jest.fn((callback) => {
    changed = callback;
    return { data: { subscription: { unsubscribe } } };
  }),
};
jest.mock('@/services/supabase', () => ({
  getSupabase: () => ({ auth: mockAuth }),
}));

beforeEach(() => {
  useUserStore.setState({
    isLoggedIn: false,
    userId: null,
    userName: null,
    authReady: false,
  });
  mockAuth.getSession.mockResolvedValue({ data: { session }, error: null });
  mockAuth.getUser.mockResolvedValue({
    data: { user: session.user },
    error: null,
  });
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { session },
    error: null,
  });
  mockAuth.signOut.mockResolvedValue({ error: null });
});

const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

test('저장된 세션을 인증 서버로 확인한 뒤 화면을 복원한다', async () => {
  const stop = startAuthSession();
  expect(useUserStore.getState().isLoggedIn).toBe(false);
  await settle();
  expect(mockAuth.getUser).toHaveBeenCalled();
  expect(useUserStore.getState()).toMatchObject({
    isLoggedIn: true,
    authReady: true,
    userId: session.user.id,
  });
  stop();
  expect(unsubscribe).toHaveBeenCalled();
});

test('만료된 세션을 로그인 상태로 복원하지 않는다', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: { ...session, expires_at: 1 } },
    error: null,
  });
  const stop = startAuthSession();
  await settle();
  expect(useUserStore.getState()).toMatchObject({
    isLoggedIn: false,
    authReady: true,
  });
  stop();
});

test('로그인 실패에서 인증 상태를 만들거나 원천 오류를 노출하지 않는다', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { session: null },
    error: new Error('private provider body'),
  });
  await expect(signIn('email@example.invalid', 'synthetic')).rejects.toThrow(
    '로그인하지 못했어요',
  );
  expect(useUserStore.getState().isLoggedIn).toBe(false);
});

test('세션 확인 중 로그아웃한 사용자를 늦은 응답으로 복원하지 않는다', async () => {
  let finish!: (value: unknown) => void;
  mockAuth.getUser.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const stop = startAuthSession();
  await settle();
  changed('SIGNED_OUT', null);
  finish({ data: { user: session.user }, error: null });
  await settle();
  expect(useUserStore.getState().isLoggedIn).toBe(false);
  stop();
});

test('백그라운드에서 갱신을 멈추고 복귀하면 다시 시작한다', async () => {
  let onState!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementationOnce((_event, listener) => {
      onState = listener;
      return { remove };
    });
  const stop = startAuthSession();
  onState('background');
  expect(mockAuth.stopAutoRefresh).toHaveBeenCalled();
  onState('active');
  expect(mockAuth.startAutoRefresh).toHaveBeenCalled();
  stop();
  expect(remove).toHaveBeenCalled();
});

test('서버 로그아웃 실패를 완료로 처리하지 않는다', async () => {
  useUserStore.setState({ isLoggedIn: true, userId: session.user.id });
  mockAuth.signOut.mockResolvedValue({ error: new Error('unavailable') });
  await expect(signOut()).rejects.toThrow('로그아웃하지 못했어요');
  expect(useUserStore.getState().isLoggedIn).toBe(true);
});

test('BE 요청에는 현재 사용자 access token만 제공한다', async () => {
  expect(await getAccessToken()).toBe('synthetic-access');
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  await expect(getAccessToken()).rejects.toThrow('다시 로그인');
});

test('진행 중인 로그인 요청을 중복 실행하지 않는다', async () => {
  let complete!: (value: unknown) => void;
  mockAuth.signInWithPassword.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const pending = signIn('test@example.invalid', 'synthetic-password');
  await signIn('test@example.invalid', 'synthetic-password');
  expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1);
  complete({ data: { session }, error: null });
  await pending;
});

test('인증 서버가 거부한 저장 세션은 로그인 상태가 되지 않는다', async () => {
  mockAuth.getUser.mockResolvedValueOnce({
    data: { user: null },
    error: new Error('revoked'),
  });
  const stop = startAuthSession();
  await settle();
  expect(useUserStore.getState()).toMatchObject({
    isLoggedIn: false,
    authReady: true,
  });
  stop();
});

test('구독 해제 뒤 늦게 도착한 세션으로 로그인하지 않는다', async () => {
  const stop = startAuthSession();
  stop();
  await settle();
  expect(useUserStore.getState().isLoggedIn).toBe(false);
});
