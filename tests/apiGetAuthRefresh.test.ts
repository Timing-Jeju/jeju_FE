import { AxiosError, AxiosHeaders } from 'axios';

import { createApiTransport } from '@/services/api/http';

jest.mock('@/services/api/session', () => ({
  getAccessToken: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

const unauthorized = (config: Record<string, unknown>) =>
  new AxiosError(
    'private response',
    'ERR_BAD_REQUEST',
    config as never,
    {},
    {
      status: 401,
      statusText: 'Unauthorized',
      config: config as never,
      headers: new AxiosHeaders(),
      data: { code: 'INVALID_ACCESS_TOKEN', detail: 'private body' },
    },
  );

test('GET 401만 토큰을 한 번 갱신하고 새 토큰으로 한 번 재요청한다', async () => {
  const refresh = jest.fn(async () => 'fresh-token');
  const transport = createApiTransport(
    'https://backend.example.invalid',
    async () => 'expired-token',
    refresh,
  );
  const adapter = jest
    .fn()
    .mockImplementationOnce(async (config) => {
      throw unauthorized(config);
    })
    .mockImplementationOnce(async (config) => ({
      data: { items: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
  transport.setAdapter(adapter);

  await transport.requestData({
    method: 'GET',
    path: '/me/saved-places',
    auth: 'required',
  });

  expect(refresh).toHaveBeenCalledTimes(1);
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe(
    'Bearer expired-token',
  );
  expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBe(
    'Bearer fresh-token',
  );
});

test('mutation 401은 토큰 갱신이나 자동 재시도를 하지 않는다', async () => {
  const refresh = jest.fn(async () => 'fresh-token');
  const transport = createApiTransport(
    'https://backend.example.invalid',
    async () => 'expired-token',
    refresh,
  );
  const adapter = jest.fn(async (config) => {
    throw unauthorized(config);
  });
  transport.setAdapter(adapter);

  await expect(
    transport.request({
      method: 'POST',
      path: '/me/saved-places',
      auth: 'required',
      body: { placeId: '34000000-0000-4000-8000-000000000001' },
      headers: { 'Idempotency-Key': 'saved-place-key' },
    }),
  ).rejects.toMatchObject({ status: 401 });
  expect(refresh).not.toHaveBeenCalled();
  expect(adapter).toHaveBeenCalledTimes(1);
});
