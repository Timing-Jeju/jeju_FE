import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { installWebCrypto } from './webCrypto';

/**
 * Supabase Auth 클라이언트.
 *
 * 백엔드(Spring)에는 로그인·회원가입·비밀번호 재설정·token 갱신 API가 없다.
 * 전부 여기서 처리하고, 발급받은 access token을 백엔드 호출의 Bearer로 쓴다.
 *
 * .env 예시:
 *   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
 *
 * anon key는 공개돼도 되는 값이다. service_role key는 절대 앱에 넣지 않는다.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = () =>
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/*
 * createClient는 빈 URL을 받으면 예외를 던진다. 키가 없는 환경에서도 앱은 떠야 하므로
 * (naverKeys와 같은 방침) 자리표시자로 만들어 두고 실제 호출은 isSupabaseConfigured로 막는다.
 */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

// PKCE code challenge 를 S256 으로 만들 수 있게 createClient 전에 WebCrypto 를 채운다
installWebCrypto();

export const supabase = createClient(
  SUPABASE_URL || PLACEHOLDER_URL,
  SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
  {
    auth: {
      /*
       * TODO: 저장소(AsyncStorage / SecureStore)를 붙이면 true로 바꾼다.
       * 지금은 앱을 끄면 로그인이 풀린다 — 기존 동작과 같다.
       */
      persistSession: false,
      autoRefreshToken: true,
      /** URL로 세션을 감지하는 건 웹 전용이라 끈다 */
      detectSessionInUrl: false,
      /** 콜백에 code만 담겨 오는 PKCE 흐름을 쓴다 */
      flowType: 'pkce',
    },
  },
);
