import axios from 'axios';

import { getAccessToken } from './auth';
import { serverOrigin } from './environment';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(
      status === 401
        ? '인증을 확인할 수 없어요. 다시 로그인해 주세요.'
        : '요청을 완료하지 못했어요. 다시 시도해 주세요.',
    );
    this.name = 'ApiError';
  }
}

/** 자동 mutation retry를 하지 않는다. 재시도하는 호출자가 같은 멱등 키를 유지한다. */
export function createApiClient(
  baseURL: string | undefined,
  accessToken: () => Promise<string>,
) {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.request.use(async (request) => {
    let origin: string;
    try {
      origin = serverOrigin(baseURL);
    } catch {
      throw new ApiError(0, 'API_NOT_CONFIGURED');
    }
    if (
      request.baseURL !== baseURL ||
      !request.url?.startsWith('/api/v1/') ||
      request.url.includes('\\') ||
      request.url.includes('#')
    )
      throw new ApiError(0, 'INVALID_API_TARGET');
    const target = new URL(request.url, origin);
    if (target.origin !== origin || !target.pathname.startsWith('/api/v1/'))
      throw new ApiError(0, 'INVALID_API_TARGET');
    request.baseURL = origin;
    request.headers.set('Authorization', `Bearer ${await accessToken()}`);
    return request;
  });
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (error instanceof ApiError) return Promise.reject(error);
      const status = axios.isAxiosError(error)
        ? (error.response?.status ?? 0)
        : 0;
      // 원천 body, config, Authorization, URL 및 cause를 오류 객체에 보존하지 않는다.
      const code =
        status === 401
          ? 'INVALID_ACCESS_TOKEN'
          : status === 409
            ? 'CONFLICT'
            : 'REQUEST_FAILED';
      return Promise.reject(new ApiError(status, code));
    },
  );
  return client;
}

export default createApiClient(
  process.env.EXPO_PUBLIC_API_BASE_URL,
  getAccessToken,
);
