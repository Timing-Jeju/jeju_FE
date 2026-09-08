import axios, { AxiosError, type AxiosResponse, type Method } from 'axios';

import {
  API_BASE_URL,
  API_PREFIX,
  API_TIMEOUT_MS,
  isApiConfigured,
} from './config';
import {
  ApiError,
  CLIENT_NETWORK_ERROR,
  CLIENT_NOT_CONFIGURED,
  isProblemDetails,
} from './problem';
import { getAccessToken } from './session';

/**
 * Timing Jeju 백엔드 공통 호출부.
 *
 * 명세의 공통 HTTP 계약(인증 모드, Problem Details, 응답 헤더)을 여기서 한 번만 처리하고
 * 도메인별 모듈은 경로와 타입만 신경 쓰게 한다.
 */

/** 명세의 인증 분류 네 가지 */
export type AuthMode =
  /** 인증 없음 — Authorization을 보내지 않는다 */
  | 'none'
  /** Supabase JWT 선택 — 토큰이 있으면 붙이고, 없으면 익명으로 호출한다 */
  | 'optional'
  /** Supabase JWT 필수 — 토큰이 없으면 호출 자체를 막는다 */
  | 'required'
  /** 예외적으로 Naver provider access token을 보내는 endpoint */
  | 'naver';

interface RequestOptions {
  method: Method;
  /** `/api/v1` 뒤의 경로 (예: `/me/saved-places`) */
  path: string;
  auth: AuthMode;
  /** null/undefined인 항목은 보내지 않는다 (서버가 빈 query를 400으로 거절한다) */
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  /** auth: 'naver'일 때 보낼 provider access token */
  naverAccessToken?: string;
}

/** 헤더까지 필요한 호출(생성/수정)이 쓰는 응답 형태 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  /** 큰따옴표를 포함한 strong validator — 다음 PATCH의 If-Match에 그대로 넣는다 */
  etag: string | null;
  /** 생성된 resource의 상대 URI */
  location: string | null;
  /** wire는 textual true/false이므로 boolean으로 바꿔 둔다 */
  idempotencyReplayed: boolean | null;
  traceId: string | null;
}

const client = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: API_TIMEOUT_MS,
});

/** axios adapter마다 헤더 대소문자가 달라서 소문자로 맞춰 읽는다 */
const headerOf = (response: AxiosResponse, name: string): string | null => {
  const value =
    response.headers?.[name] ?? response.headers?.[name.toLowerCase()];
  return typeof value === 'string' ? value : null;
};

/** Idempotency-Replayed의 textual `true|false`를 boolean으로 바꾼다 */
const parseReplayed = (value: string | null): boolean | null => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
};

/** 값이 없는 query는 통째로 뺀다 */
const compactParams = (params: Record<string, unknown> | undefined) => {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const authorizationOf = (options: RequestOptions): string | null => {
  switch (options.auth) {
    case 'none':
      return null;
    case 'naver':
      // Supabase JWT가 아니라 Naver provider access token을 보낸다
      return options.naverAccessToken
        ? `Bearer ${options.naverAccessToken}`
        : null;
    case 'optional': {
      // 토큰이 없으면 익명 호출. 잘못된 토큰을 보내면 401이므로 있을 때만 붙인다.
      const token = getAccessToken();
      return token ? `Bearer ${token}` : null;
    }
    case 'required': {
      const token = getAccessToken();
      if (!token) {
        // 서버가 내려줄 401과 같은 code로 맞춰 호출부의 분기를 하나로 유지한다
        throw new ApiError({
          code: 'AUTHENTICATION_REQUIRED',
          status: 401,
          detail: '로그인이 필요합니다.',
        });
      }
      return `Bearer ${token}`;
    }
  }
};

/** axios 오류를 ApiError로 정규화한다 */
const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError && error.response) {
    const { status, data } = error.response;
    const traceId = headerOf(error.response, 'x-trace-id');

    if (isProblemDetails(data)) {
      return new ApiError({
        code: data.code,
        status: data.status,
        detail: data.detail,
        traceId: data.traceId ?? traceId,
        fieldErrors: data.fieldErrors ?? [],
        problem: data,
      });
    }

    // Problem Details가 아닌 오류 body (proxy 오류 페이지 등)
    return new ApiError({
      code: CLIENT_NETWORK_ERROR,
      status,
      detail: '요청을 처리하지 못했습니다.',
      traceId,
    });
  }

  return new ApiError({
    code: CLIENT_NETWORK_ERROR,
    status: 0,
    detail: '서버에 연결하지 못했습니다.',
  });
};

/** 헤더까지 필요한 호출용 */
export async function request<T>(
  options: RequestOptions,
): Promise<ApiResponse<T>> {
  if (!isApiConfigured()) {
    throw new ApiError({
      code: CLIENT_NOT_CONFIGURED,
      status: 0,
      detail: 'EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다.',
    });
  }

  const authorization = authorizationOf(options);

  try {
    const response = await client.request<T>({
      method: options.method,
      url: options.path,
      params: compactParams(options.params),
      data: options.body,
      headers: {
        // 성공은 JSON, 오류는 problem+json으로 내려온다
        Accept: 'application/json, application/problem+json',
        ...(options.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(authorization ? { Authorization: authorization } : {}),
        ...options.headers,
      },
    });

    return {
      data: response.data,
      status: response.status,
      etag: headerOf(response, 'etag'),
      location: headerOf(response, 'location'),
      idempotencyReplayed: parseReplayed(
        headerOf(response, 'idempotency-replayed'),
      ),
      traceId: headerOf(response, 'x-trace-id'),
    };
  } catch (error) {
    throw toApiError(error);
  }
}

/** 응답 body만 필요한 대부분의 호출용 */
export async function requestData<T>(options: RequestOptions): Promise<T> {
  const response = await request<T>(options);
  return response.data;
}
