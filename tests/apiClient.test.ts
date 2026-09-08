import axios, { AxiosError, AxiosHeaders } from 'axios';
import { createApiClient, ApiError } from '@/services/apiClient';
jest.mock('@/services/auth', () => ({ getAccessToken: jest.fn() }));

const makeClient = () =>
  createApiClient(
    'https://backend.example.invalid',
    async () => 'synthetic-access',
  );

test('인증된 상대 API 요청만 서버에 전달한다', async () => {
  const client = makeClient();
  const adapter = jest.fn(async (config) => ({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
  client.defaults.adapter = adapter;
  await client.get('/api/v1/me');
  expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe(
    'Bearer synthetic-access',
  );
  await expect(
    client.get('https://other.example.invalid/api/v1/me'),
  ).rejects.toBeInstanceOf(ApiError);
  await expect(
    client.get('//other.example.invalid/api/v1/me'),
  ).rejects.toBeInstanceOf(ApiError);
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('baseURL 재정의로 사용자 토큰을 다른 호스트에 보낼 수 없다', async () => {
  const client = makeClient();
  const adapter = jest.fn();
  client.defaults.adapter = adapter;
  await expect(
    client.get('/api/v1/me', { baseURL: 'https://other.example.invalid' }),
  ).rejects.toBeInstanceOf(ApiError);
  expect(adapter).not.toHaveBeenCalled();
});

test('인증 실패를 자동 재전송하지 않고 비밀정보 없는 오류로 변환한다', async () => {
  const client = makeClient();
  const adapter = jest.fn(async (config) => {
    throw new AxiosError(
      'raw token and provider body',
      'ERR_BAD_REQUEST',
      config,
      {},
      {
        status: 401,
        statusText: 'Unauthorized',
        config,
        headers: new AxiosHeaders(),
        data: { code: 'INVALID_ACCESS_TOKEN', detail: 'private body' },
      },
    );
  });
  client.defaults.adapter = adapter;
  try {
    await client.post(
      '/api/v1/trips',
      {},
      { headers: { 'Idempotency-Key': 'same-key' } },
    );
    throw new Error('요청이 실패해야 합니다');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: 'INVALID_ACCESS_TOKEN' });
    expect(JSON.stringify(error)).not.toMatch(
      /synthetic-access|private body|raw token/,
    );
    expect(axios.isAxiosError(error)).toBe(false);
  }
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('주소 미설정은 외부 요청 전에 실패한다', async () => {
  const client = createApiClient(undefined, async () => 'synthetic-access');
  const adapter = jest.fn();
  client.defaults.adapter = adapter;
  await expect(client.get('/api/v1/me')).rejects.toBeInstanceOf(ApiError);
  expect(adapter).not.toHaveBeenCalled();
});
