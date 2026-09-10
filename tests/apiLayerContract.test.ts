import axios, { AxiosError, AxiosHeaders } from 'axios';

import {
  assertIdempotencyKey,
  createIdempotencyKey,
  isValidIdempotencyKey,
} from '@/services/api/idempotency';
import { createApiTransport, type ApiTransport } from '@/services/api/http';
import { ApiError } from '@/services/api/problem';

jest.mock('@/services/auth', () => ({
  getAccessToken: jest.fn(async () => 'synthetic-access'),
}));

const origin = 'https://backend.example.invalid';

const makeTransport = (
  accessToken: () => Promise<string | null> = async () => 'synthetic-access',
): ApiTransport => createApiTransport(origin, accessToken);

test.each(['a', 'same replay key', '~'.repeat(128)])(
  'Idempotency-Key는 1~128자 printable ASCII를 허용한다: %s',
  (key) => expect(isValidIdempotencyKey(key)).toBe(true),
);

test.each(['', 'a'.repeat(129), 'line\nbreak', 'tab\tkey', '키'])(
  '비정상 Idempotency-Key를 외부 요청 전에 거부한다',
  (key) => {
    expect(isValidIdempotencyKey(key)).toBe(false);
    expect(() => assertIdempotencyKey(key)).toThrow(ApiError);
  },
);

test('생성된 Idempotency-Key도 공개 계약을 만족한다', () => {
  expect(isValidIdempotencyKey(createIdempotencyKey())).toBe(true);
});

test('필수 인증 요청만 현재 토큰을 붙이고 mutation을 자동 재시도하지 않는다', async () => {
  const transport = makeTransport();
  const adapter = jest.fn(async (config) => ({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
  transport.setAdapter(adapter);

  await transport.request({
    method: 'POST',
    path: '/trips',
    auth: 'required',
    body: {},
    headers: { 'Idempotency-Key': 'same replay key' },
  });

  const request = adapter.mock.calls[0][0];
  expect(request.url).toBe('/api/v1/trips');
  expect(request.headers.get('Authorization')).toBe('Bearer synthetic-access');
  expect(request.headers.get('Idempotency-Key')).toBe('same replay key');
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('실패한 mutation도 자동 재시도하지 않는다', async () => {
  const transport = makeTransport();
  const adapter = jest.fn(async (config) => {
    throw new AxiosError('network failure', 'ERR_NETWORK', config);
  });
  transport.setAdapter(adapter);

  await expect(
    transport.request({
      method: 'POST',
      path: '/trips',
      auth: 'required',
      body: {},
      headers: { 'Idempotency-Key': 'same replay key' },
    }),
  ).rejects.toMatchObject({ code: 'CLIENT_NETWORK_ERROR' });
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('GET 401은 세션을 한 번 갱신하고 회전된 토큰으로 한 번만 복구한다', async () => {
  const accessToken = jest
    .fn<Promise<string | null>, [boolean?]>()
    .mockResolvedValueOnce('expired-access')
    .mockResolvedValueOnce('rotated-access');
  const transport = makeTransport(accessToken);
  const adapter = jest
    .fn()
    .mockImplementationOnce(async (config) => {
      throw new AxiosError(
        'expired',
        'ERR_BAD_RESPONSE',
        config,
        {},
        {
          status: 401,
          statusText: 'Unauthorized',
          config,
          headers: new AxiosHeaders(),
          data: { code: 'INVALID_ACCESS_TOKEN' },
        },
      );
    })
    .mockImplementationOnce(async (config) => ({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
  transport.setAdapter(adapter);

  await expect(
    transport.request({ method: 'GET', path: '/me', auth: 'required' }),
  ).resolves.toMatchObject({ data: { ok: true } });
  expect(accessToken).toHaveBeenNthCalledWith(1, false);
  expect(accessToken).toHaveBeenNthCalledWith(2, true);
  expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBe(
    'Bearer rotated-access',
  );
  expect(adapter).toHaveBeenCalledTimes(2);
});

test('PATCH 401은 세션을 임의 갱신하거나 mutation을 재전송하지 않는다', async () => {
  const accessToken = jest.fn(async () => 'expired-access');
  const transport = makeTransport(accessToken);
  const adapter = jest.fn(async (config) => {
    throw new AxiosError(
      'expired',
      'ERR_BAD_RESPONSE',
      config,
      {},
      {
        status: 401,
        statusText: 'Unauthorized',
        config,
        headers: new AxiosHeaders(),
        data: { code: 'INVALID_ACCESS_TOKEN' },
      },
    );
  });
  transport.setAdapter(adapter);

  await expect(
    transport.request({
      method: 'PATCH',
      path: '/me',
      auth: 'required',
      body: { nickname: '새 닉네임' },
    }),
  ).rejects.toMatchObject({ status: 401, code: 'INVALID_ACCESS_TOKEN' });
  expect(accessToken).toHaveBeenCalledTimes(1);
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('401/403/409/412/429/5xx Problem은 stable code만 남긴다', async () => {
  for (const [status, code] of [
    [401, 'INVALID_ACCESS_TOKEN'],
    [403, 'AUTH_ACCESS_DENIED'],
    [409, 'TRIP_VERSION_CONFLICT'],
    [412, 'PRECONDITION_FAILED'],
    [429, 'RATE_LIMITED'],
    [503, 'TRIP_DATA_UNAVAILABLE'],
  ] as const) {
    const transport = makeTransport();
    const adapter = jest.fn(async (config) => {
      throw new AxiosError(
        'raw token synthetic-access',
        'ERR_BAD_RESPONSE',
        config,
        {},
        {
          status,
          statusText: 'failed',
          config,
          headers: new AxiosHeaders({ 'x-trace-id': 'safe-trace' }),
          data: {
            code,
            detail: 'private provider body synthetic-access',
            token: 'synthetic-access',
          },
        },
      );
    });
    transport.setAdapter(adapter);

    try {
      await transport.request({
        method: 'GET',
        path: '/trips',
        auth: 'required',
      });
      throw new Error('요청이 실패해야 합니다');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status, code, traceId: 'safe-trace' });
      expect(JSON.stringify(error)).not.toMatch(
        /synthetic-access|private provider body|raw token|config|problem|cause/,
      );
      expect(axios.isAxiosError(error)).toBe(false);
    }
    expect(adapter).toHaveBeenCalledTimes(1);
  }
});

test('알 수 없는 Problem code와 원문은 앱 오류에 보존하지 않는다', async () => {
  const transport = makeTransport();
  const adapter = jest.fn(async (config) => {
    throw new AxiosError(
      'private raw message',
      'ERR_BAD_RESPONSE',
      config,
      {},
      {
        status: 500,
        statusText: 'failed',
        config,
        headers: new AxiosHeaders(),
        data: { code: 'ATTACKER_CONTROLLED', detail: 'private raw detail' },
      },
    );
  });
  transport.setAdapter(adapter);

  await expect(
    transport.request({ method: 'GET', path: '/trips', auth: 'required' }),
  ).rejects.toMatchObject({ status: 500, code: 'SERVICE_UNAVAILABLE' });
  await transport
    .request({ method: 'GET', path: '/trips', auth: 'required' })
    .catch((error) => {
      expect(JSON.stringify(error)).not.toMatch(/ATTACKER|private raw/);
    });
});

test('알려진 code도 계약과 다른 status면 신뢰하지 않는다', async () => {
  const transport = makeTransport();
  const adapter = jest.fn(async (config) => {
    throw new AxiosError(
      'raw',
      'ERR_BAD_RESPONSE',
      config,
      {},
      {
        status: 500,
        statusText: 'failed',
        config,
        headers: new AxiosHeaders(),
        data: { code: 'INVALID_ACCESS_TOKEN' },
      },
    );
  });
  transport.setAdapter(adapter);
  await expect(
    transport.request({ method: 'GET', path: '/trips', auth: 'required' }),
  ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 500 });
});

test('외부 origin, 누락 token, stale ETag를 요청 전에 거부한다', async () => {
  expect(() =>
    createApiTransport('https://user:secret@example.invalid'),
  ).toThrow(ApiError);

  const transport = makeTransport(async () => null);
  const adapter = jest.fn();
  transport.setAdapter(adapter);
  await expect(
    transport.request({ method: 'GET', path: '/trips', auth: 'required' }),
  ).rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
  await expect(
    transport.request({
      method: 'PATCH',
      path: '/trips/id',
      auth: 'required',
      body: {},
      headers: { 'If-Match': 'W/"stale"' },
    }),
  ).rejects.toMatchObject({ code: 'INVALID_ETAG' });
  await expect(
    transport.request({
      method: 'GET',
      path: 'https://other.example.invalid/api/v1/trips',
      auth: 'required',
    }),
  ).rejects.toMatchObject({ code: 'INVALID_API_TARGET' });
  expect(adapter).not.toHaveBeenCalled();
});

test('ETag와 cursor는 해석하지 않고 다음 요청에 그대로 전달한다', async () => {
  const transport = makeTransport();
  const adapter = jest.fn(async (config) => ({
    data: { items: [], page: { hasNext: false, nextCursor: null, size: 20 } },
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders({ etag: '"trip-id-r2"' }),
    config,
  }));
  transport.setAdapter(adapter);

  const response = await transport.request({
    method: 'GET',
    path: '/trips',
    auth: 'required',
    params: { cursor: 'opaque+/=cursor' },
  });
  expect(adapter.mock.calls[0][0].params.cursor).toBe('opaque+/=cursor');
  expect(response.etag).toBe('"trip-id-r2"');
});
