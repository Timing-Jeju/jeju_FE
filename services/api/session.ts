/**
 * access token 공급 지점.
 *
 * 로그인 / 로그아웃 / token 갱신은 Supabase Auth SDK가 담당하고
 * Spring에는 자체 로그인 API가 없다. 그래서 이 파일은 토큰을 발급하지 않고,
 * "지금 유효한 Supabase access token"을 어디서 읽을지만 정해 둔다.
 *
 * 앱 시작 시 store/useUserStore가 자신을 공급자로 등록한다.
 * 나중에 Supabase SDK를 붙이면 등록 함수 한 줄만 바꾸면 된다.
 *
 * 주의: token은 로그, 오류 리포트, 분석 tag에 남기지 않는다.
 */
type AccessTokenProvider = () => string | null;

let provider: AccessTokenProvider = () => null;

/** 토큰을 어디서 읽을지 등록한다 (앱에서 한 번만 호출한다) */
export const setAccessTokenProvider = (next: AccessTokenProvider) => {
  provider = next;
};

/**
 * 특정 토큰으로만 잠깐 호출해야 할 때 쓰는 우회로.
 *
 * 회원가입처럼 "세션은 생겼지만 아직 앱을 로그인 상태로 만들면 안 되는" 구간에서,
 * store를 건드리지 않고 그 토큰으로 백엔드를 부른다.
 */
let override: string | null = null;

export const withAccessToken = async <T>(
  accessToken: string,
  run: () => Promise<T>,
): Promise<T> => {
  override = accessToken;
  try {
    return await run();
  } finally {
    override = null;
  }
};

/** 현재 access token — 로그인 전이면 null */
export const getAccessToken = () => override ?? provider();
