import axios, {
  type AxiosAdapter,
  type AxiosInstance,
  type AxiosResponse,
  type Method,
} from 'axios';

import { getAccessToken } from '../auth';
import { serverOrigin } from '../environment';
import {
  STABLE_PROBLEM_CODES,
  STABLE_PROBLEM_STATUSES,
} from '../generated/backendRuntime';
import { API_PREFIX, API_TIMEOUT_MS } from './config';
import { assertIdempotencyKey } from './idempotency';
import {
  ApiError,
  CLIENT_NETWORK_ERROR,
  CLIENT_NOT_CONFIGURED,
} from './problem';

export type AuthMode = 'none' | 'optional' | 'required' | 'naver';

export interface RequestOptions {
  method: Method;
  path: string;
  auth: AuthMode;
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  naverAccessToken?: string;
  signal?: AbortSignal;
  /** 토큰 조회 뒤 실제 전송 직전에 인증 주체가 그대로인지 확인한다. */
  authContextIsCurrent?: () => boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  etag: string | null;
  location: string | null;
  idempotencyReplayed: boolean | null;
  traceId: string | null;
}

type AccessTokenProvider = (forceRefresh?: boolean) => Promise<string | null>;

const fallbackCode = (status: number) => {
  if (status === 401) return 'AUTHENTICATION_REQUIRED';
  if (status === 403) return 'AUTH_ACCESS_DENIED';
  if (status === 409) return 'CONFLICT';
  if (status === 412) return 'PRECONDITION_FAILED';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVICE_UNAVAILABLE';
  return 'REQUEST_FAILED';
};

const safeTraceId = (value: unknown) =>
  typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : null;

const headerOf = (response: AxiosResponse, name: string): string | null => {
  const headers = response.headers as unknown as Record<string, unknown> & {
    get?: (headerName: string) => unknown;
  };
  const value =
    typeof headers.get === 'function'
      ? headers.get(name)
      : headers[name.toLowerCase()];
  return typeof value === 'string' ? value : null;
};

const compactParams = (params: Record<string, unknown> | undefined) => {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
};

const assertPath = (origin: string, path: string) => {
  if (!path.startsWith('/') || path.includes('\\') || path.includes('#')) {
    throw new ApiError({ status: 0, code: 'INVALID_API_TARGET' });
  }
  const target = new URL(`${API_PREFIX}${path}`, origin);
  if (
    target.origin !== origin ||
    !target.pathname.startsWith(`${API_PREFIX}/`) ||
    target.search ||
    target.hash
  ) {
    throw new ApiError({ status: 0, code: 'INVALID_API_TARGET' });
  }
  return `${API_PREFIX}${path}`;
};

const assertRequestHeaders = (headers: Record<string, string> | undefined) => {
  if (!headers) return;
  if (
    Object.keys(headers).some((name) => name.toLowerCase() === 'authorization')
  ) {
    throw new ApiError({ status: 0, code: 'INVALID_API_TARGET' });
  }
  const idempotencyKey = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === 'idempotency-key',
  )?.[1];
  if (idempotencyKey !== undefined) assertIdempotencyKey(idempotencyKey);
  const etag = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === 'if-match',
  )?.[1];
  if (etag !== undefined && !/^"[\x21\x23-\x7e]+"$/.test(etag)) {
    throw new ApiError({ status: 0, code: 'INVALID_ETAG' });
  }
};

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error) || !error.response) {
    return new ApiError({ status: 0, code: CLIENT_NETWORK_ERROR });
  }
  const status = error.response.status;
  const candidate = error.response.data as { code?: unknown } | undefined;
  const code =
    typeof candidate?.code === 'string' &&
    STABLE_PROBLEM_CODES.has(candidate.code) &&
    STABLE_PROBLEM_STATUSES[candidate.code]?.includes(status)
      ? candidate.code
      : fallbackCode(status);
  return new ApiError({
    status,
    code,
    traceId: safeTraceId(headerOf(error.response, 'x-trace-id')),
  });
};

export interface ApiTransport {
  request<T>(options: RequestOptions): Promise<ApiResponse<T>>;
  requestData<T>(options: RequestOptions): Promise<T>;
  setAdapter(adapter: AxiosAdapter): void;
}

const defaultAccessToken: AccessTokenProvider = async (forceRefresh = false) =>
  getAccessToken(forceRefresh);

export function createApiTransport(
  baseURL: string | undefined,
  accessToken: AccessTokenProvider = defaultAccessToken,
): ApiTransport {
  let origin: string;
  try {
    origin = serverOrigin(baseURL);
  } catch {
    throw new ApiError({ status: 0, code: CLIENT_NOT_CONFIGURED });
  }
  const client: AxiosInstance = axios.create({
    baseURL: origin,
    timeout: API_TIMEOUT_MS,
  });

  const request = async <T>(
    options: RequestOptions,
  ): Promise<ApiResponse<T>> => {
    const url = assertPath(origin, options.path);
    assertRequestHeaders(options.headers);

    let authorization: string | null = null;
    if (options.auth === 'naver') {
      authorization = options.naverAccessToken
        ? `Bearer ${options.naverAccessToken}`
        : null;
    } else if (options.auth !== 'none') {
      try {
        const token = await accessToken(false);
        authorization = token ? `Bearer ${token}` : null;
      } catch {
        authorization = null;
      }
    }
    if (
      (options.auth === 'required' || options.auth === 'naver') &&
      !authorization
    ) {
      throw new ApiError({ status: 401, code: 'AUTHENTICATION_REQUIRED' });
    }

    const execute = async (bearer: string | null) => {
      if (options.authContextIsCurrent && !options.authContextIsCurrent()) {
        throw new ApiError({
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
        });
      }
      return client.request<T>({
        method: options.method,
        url,
        params: compactParams(options.params),
        data: options.body,
        signal: options.signal,
        headers: {
          Accept: 'application/json, application/problem+json',
          ...(options.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...(bearer ? { Authorization: bearer } : {}),
          ...options.headers,
        },
      });
    };

    try {
      let response: AxiosResponse<T>;
      try {
        response = await execute(authorization);
      } catch (error) {
        const normalized = toApiError(error);
        const method = options.method.toUpperCase();
        const safelyRetryable = method === 'GET' && options.auth === 'required';
        if (normalized.status !== 401 || !safelyRetryable) throw normalized;

        let refreshed: string | null = null;
        try {
          refreshed = await accessToken(true);
        } catch {
          // 최종 오류는 Spring의 안전한 401만 유지한다.
        }
        if (!refreshed || `Bearer ${refreshed}` === authorization) {
          throw normalized;
        }
        response = await execute(`Bearer ${refreshed}`);
      }
      const replayed = headerOf(response, 'idempotency-replayed');
      return {
        data: response.data,
        status: response.status,
        etag: headerOf(response, 'etag'),
        location: headerOf(response, 'location'),
        idempotencyReplayed:
          replayed === 'true' ? true : replayed === 'false' ? false : null,
        traceId: safeTraceId(headerOf(response, 'x-trace-id')),
      };
    } catch (error) {
      throw toApiError(error);
    }
  };

  return {
    request,
    requestData: async <T>(options: RequestOptions) =>
      (await request<T>(options)).data,
    setAdapter: (adapter) => {
      client.defaults.adapter = adapter;
    },
  };
}

let defaultTransport: ApiTransport | null = null;
const transport = () => {
  if (!defaultTransport) {
    defaultTransport = createApiTransport(process.env.EXPO_PUBLIC_API_BASE_URL);
  }
  return defaultTransport;
};

export const request = <T>(options: RequestOptions) =>
  transport().request<T>(options);

export const requestData = <T>(options: RequestOptions) =>
  transport().requestData<T>(options);
