import { AxiosError, type AxiosResponse } from 'axios';

import { request, requestData } from '@/services/api/http';
import {
  ApiError,
  CLIENT_NETWORK_ERROR,
  type ProblemDetails,
} from '@/services/api/problem';
import { setAccessTokenProvider } from '@/services/api/session';

const mockRequest = jest.fn();

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      // http.ts 가 모듈 로드 시점에 create 를 부르므로 request 는 호출 시점에 mock 을 찾게 한다
      create: jest.fn(() => ({
        request: (...args: unknown[]) => mockRequest(...args),
      })),
    },
  };
});

jest.mock('@/services/api/config', () => ({
  API_BASE_URL: 'http://test.local',
  API_PREFIX: '/api/v1',
  API_TIMEOUT_MS: 1000,
  isApiConfigured: () => true,
}));

const ok = (
  data: unknown = {},
  headers: Record<string, string> = {},
  status = 200,
) => ({ data, status, headers });

/** 서버가 내려준 오류 응답을 axios 오류로 감싼다 */
const failure = (
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
) =>
  new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
    headers,
    statusText: '',
    config: {},
  } as unknown as AxiosResponse);

const problem: ProblemDetails = {
  type: 'https://timing-jeju.example/problems/conflict',
  title: 'Conflict',
  status: 409,
  detail: '이미 찜한 장소입니다.',
  instance: 'urn:timing-jeju:problem:trace-1',
  code: 'SAVED_PLACE_ALREADY_EXISTS',
  traceId: 'trace-1',
  fieldErrors: [{ field: 'placeId', reason: 'duplicate' }],
};

const sentConfig = () => mockRequest.mock.calls[0][0];

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue(ok());
  setAccessTokenProvider(() => null);
});

describe('인증 모드', () => {
  it('none 은 Authorization 을 보내지 않는다', async () => {
    setAccessTokenProvider(() => 'token');
    await request({
      method: 'GET',
      path: '/auth/social/providers',
      auth: 'none',
    });
    expect(sentConfig().headers.Authorization).toBeUndefined();
  });

  it('optional 은 토큰이 있을 때만 붙인다', async () => {
    await request({ method: 'GET', path: '/places', auth: 'optional' });
    expect(sentConfig().headers.Authorization).toBeUndefined();

    mockRequest.mockClear();
    setAccessTokenProvider(() => 'token');
    await request({ method: 'GET', path: '/places', auth: 'optional' });
    expect(sentConfig().headers.Authorization).toBe('Bearer token');
  });

  it('required 는 토큰이 없으면 호출 없이 AUTHENTICATION_REQUIRED 를 던진다', async () => {
    const call = request({ method: 'GET', path: '/me', auth: 'required' });

    await expect(call).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      status: 401,
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('required 는 토큰이 있으면 Bearer 로 붙인다', async () => {
    setAccessTokenProvider(() => 'token');
    await request({ method: 'GET', path: '/me', auth: 'required' });
    expect(sentConfig().headers.Authorization).toBe('Bearer token');
  });

  it('naver 는 Supabase 토큰 대신 provider 토큰을 보낸다', async () => {
    setAccessTokenProvider(() => 'supabase-token');
    await request({
      method: 'GET',
      path: '/auth/social/naver/userinfo',
      auth: 'naver',
      naverAccessToken: 'naver-token',
    });
    expect(sentConfig().headers.Authorization).toBe('Bearer naver-token');
  });
});

describe('요청 조립', () => {
  it('값이 없는 query 는 통째로 뺀다', async () => {
    await request({
      method: 'GET',
      path: '/places',
      auth: 'none',
      params: { query: '오름', category: undefined, cursor: null, size: 0 },
    });
    expect(sentConfig().params).toEqual({ query: '오름', size: 0 });

    mockRequest.mockClear();
    await request({
      method: 'GET',
      path: '/places',
      auth: 'none',
      params: { a: undefined },
    });
    expect(sentConfig().params).toBeUndefined();
  });

  it('body 가 있을 때만 Content-Type 을 붙이고 추가 헤더를 합친다', async () => {
    await request({ method: 'DELETE', path: '/trips/1', auth: 'none' });
    expect(sentConfig().headers['Content-Type']).toBeUndefined();
    expect(sentConfig().headers.Accept).toBe(
      'application/json, application/problem+json',
    );

    mockRequest.mockClear();
    await request({
      method: 'POST',
      path: '/trips',
      auth: 'none',
      body: { title: '제주' },
      headers: { 'Idempotency-Key': 'key-1' },
    });
    expect(sentConfig()).toMatchObject({
      method: 'POST',
      url: '/trips',
      data: { title: '제주' },
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'key-1',
      },
    });
  });
});

describe('응답 헤더', () => {
  it('ETag · Location · Trace-Id 를 읽고 Idempotency-Replayed 는 boolean 으로 바꾼다', async () => {
    mockRequest.mockResolvedValue(
      ok(
        { tripId: 't1' },
        {
          etag: '"trip-t1-r1"',
          location: '/api/v1/trips/t1',
          'x-trace-id': 'trace-9',
          'idempotency-replayed': 'true',
        },
        201,
      ),
    );

    const response = await request<{ tripId: string }>({
      method: 'POST',
      path: '/trips',
      auth: 'none',
      body: {},
    });

    expect(response).toEqual({
      data: { tripId: 't1' },
      status: 201,
      etag: '"trip-t1-r1"',
      location: '/api/v1/trips/t1',
      idempotencyReplayed: true,
      traceId: 'trace-9',
    });
  });

  it('없는 헤더는 null 이고 replayed 는 false 도 구분한다', async () => {
    mockRequest.mockResolvedValue(ok({}, { 'idempotency-replayed': 'false' }));

    const response = await request({ method: 'GET', path: '/x', auth: 'none' });

    expect(response.etag).toBeNull();
    expect(response.location).toBeNull();
    expect(response.traceId).toBeNull();
    expect(response.idempotencyReplayed).toBe(false);
  });

  it('requestData 는 body 만 돌려준다', async () => {
    mockRequest.mockResolvedValue(ok({ items: [] }));
    await expect(
      requestData({ method: 'GET', path: '/x', auth: 'none' }),
    ).resolves.toEqual({ items: [] });
  });
});

describe('오류 정규화', () => {
  it('Problem Details 는 code · detail · fieldErrors · traceId 를 그대로 옮긴다', async () => {
    mockRequest.mockRejectedValue(failure(409, problem));

    const error = await request({
      method: 'POST',
      path: '/me/saved-places',
      auth: 'none',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'SAVED_PLACE_ALREADY_EXISTS',
      status: 409,
      detail: '이미 찜한 장소입니다.',
      traceId: 'trace-1',
      fieldErrors: [{ field: 'placeId', reason: 'duplicate' }],
      problem,
    });
  });

  it('traceId 가 빠진 body 는 Problem Details 로 보지 않고 status 만 남긴다', async () => {
    mockRequest.mockRejectedValue(
      failure(404, { ...problem, traceId: undefined, code: 'PLACE_NOT_FOUND' }),
    );

    const error = await request({
      method: 'GET',
      path: '/places/x',
      auth: 'none',
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: CLIENT_NETWORK_ERROR, status: 404 });
  });

  it('Problem Details 가 아닌 오류 body(프록시 오류 등)는 status 만 남긴다', async () => {
    mockRequest.mockRejectedValue(
      failure(502, '<html>Bad Gateway</html>', { 'x-trace-id': 'gw-1' }),
    );

    const error = await request({
      method: 'GET',
      path: '/places',
      auth: 'none',
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: CLIENT_NETWORK_ERROR,
      status: 502,
      traceId: 'gw-1',
    });
  });

  it('응답 자체가 없으면(timeout · 연결 실패) status 0 이다', async () => {
    mockRequest.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));

    const error = await request({
      method: 'GET',
      path: '/places',
      auth: 'none',
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: CLIENT_NETWORK_ERROR,
      status: 0,
      detail: '서버에 연결하지 못했습니다.',
    });
  });

  it('axios 오류가 아닌 예외도 네트워크 오류로 감싼다', async () => {
    mockRequest.mockRejectedValue(new Error('unexpected'));

    const error = await request({
      method: 'GET',
      path: '/places',
      auth: 'none',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: CLIENT_NETWORK_ERROR, status: 0 });
  });
});
