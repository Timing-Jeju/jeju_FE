import { getAccessToken } from '../auth';

/** 세션은 인증 계층이 소유하며 API wrapper는 토큰을 저장하지 않는다. */
export { getAccessToken };

/** 인증 GET이 401일 때만 사용하는 단일 강제 갱신 경계. */
export async function refreshAccessToken(): Promise<string> {
  try {
    const { getSupabase } = await import('../supabase');
    const { data, error } = await getSupabase().auth.refreshSession();
    const token = data.session?.access_token;
    if (error || !token) throw new Error();
    return token;
  } catch {
    throw new Error('세션을 갱신할 수 없어요. 다시 로그인해 주세요.');
  }
}
