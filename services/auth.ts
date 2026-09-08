import {
  isAuthApiError,
  isAuthSessionMissingError,
  type Session,
} from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useTripStore } from '@/store/useTripStore';
import { useUserStore } from '@/store/useUserStore';
import { getSupabase } from './supabase';

const valid = (session: Session | null) =>
  !!session?.access_token &&
  !!session.expires_at &&
  session.expires_at * 1000 > Date.now();

function acceptSession(session: Session | null) {
  const userId = valid(session) ? session!.user.id : null;
  if (useUserStore.getState().userId !== userId || !userId) {
    useTripStore.setState(useTripStore.getInitialState(), true);
    useScheduleStore.setState(useScheduleStore.getInitialState(), true);
    useFavoriteStore.setState({ favorites: [] });
  }
  useUserStore.setState({
    authReady: true,
    isLoggedIn: !!userId,
    userId,
    userName: null,
  });
}

function handleRestoreFailure(error: unknown) {
  const rejected =
    isAuthSessionMissingError(error) ||
    (isAuthApiError(error) &&
      (error.status === 401 ||
        [
          'bad_jwt',
          'session_not_found',
          'session_expired',
          'refresh_token_not_found',
          'refresh_token_already_used',
          'user_not_found',
          'user_banned',
        ].includes(error.code ?? '')));
  if (rejected) acceptSession(null);
  else {
    // 통신 장애는 로그아웃 증거가 아니다. 검증한 사용자와 임시 입력을 보존한다.
    // 최초 복원 때는 로그인 상태를 새로 만들지 않으며 BE 요청은 토큰 검증을 거친다.
    useUserStore.setState({ authReady: true });
  }
}

/** Root layout가 한 번 구독하고 해제한다. 늦은 restore 응답은 새 auth event를 덮지 않는다. */
export function startAuthSession(): () => void {
  let active = true;
  let revision = 0;
  try {
    const auth = getSupabase().auth;
    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, session) => {
      if (!active || event === 'INITIAL_SESSION') return;
      revision += 1;
      acceptSession(session);
    });
    async function restore() {
      const started = revision;
      try {
        const { data, error } = await auth.getSession();
        if (error) {
          if (active && revision === started) handleRestoreFailure(error);
          return;
        }
        if (!valid(data.session)) {
          if (active && revision === started) acceptSession(null);
          return;
        }
        const verified = await auth.getUser();
        if (active && revision === started) {
          if (verified.error) handleRestoreFailure(verified.error);
          else
            acceptSession(
              verified.data.user?.id === data.session!.user.id
                ? data.session
                : null,
            );
        }
      } catch (error) {
        if (active && revision === started) handleRestoreFailure(error);
      }
    }
    const updateRefresh = (state: string) => {
      if (state === 'active') {
        auth.startAutoRefresh();
        void restore();
      } else auth.stopAutoRefresh();
    };
    let remove = () => {};
    if (Platform.OS !== 'web') {
      const listener = AppState.addEventListener('change', updateRefresh);
      remove = () => listener.remove();
      if (AppState.currentState === 'active') auth.startAutoRefresh();
      else auth.stopAutoRefresh();
    }
    void restore();
    return () => {
      active = false;
      subscription.unsubscribe();
      remove();
      if (Platform.OS !== 'web') auth.stopAutoRefresh();
    };
  } catch (error) {
    handleRestoreFailure(error);
    return () => {
      active = false;
    };
  }
}

let signingIn = false;
export async function signIn(email: string, password: string): Promise<void> {
  if (signingIn) return;
  signingIn = true;
  try {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !valid(data.session)) throw new Error();
    // 인증 이벤트가 화면 상태를 갱신한다. 입력 문자열로 로그인 상태를 만들지 않는다.
  } catch {
    throw new Error(
      '로그인하지 못했어요. 이메일·비밀번호와 연결 설정을 확인해 주세요.',
    );
  } finally {
    signingIn = false;
  }
}

export async function signOut(): Promise<void> {
  try {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' });
    if (error) throw new Error();
    acceptSession(null);
  } catch {
    throw new Error(
      '로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
    );
  }
}

export async function getAccessToken(): Promise<string> {
  try {
    const { data, error } = await getSupabase().auth.getSession();
    if (error || !valid(data.session)) throw new Error();
    return data.session!.access_token;
  } catch {
    throw new Error('세션을 확인할 수 없어요. 다시 로그인해 주세요.');
  }
}
