/* eslint-env node, jest */

const {
  resolveStagingConfig,
  runStagingE2E,
  sanitizeResult,
} = require('../tooling/staging/run.cjs');

test('staging host와 계정 token 누락은 성공 대신 blocker로 보고한다', () => {
  expect(resolveStagingConfig({})).toEqual({
    status: 'blocked',
    missing: ['STAGING_API_BASE_URL', 'STAGING_ACCESS_TOKEN'],
  });
});

test.each([
  ['http://staging.example.com', 'HTTPS staging origin이 필요합니다.'],
  [
    'https://user:secret@staging.example.com',
    'HTTPS staging origin이 필요합니다.',
  ],
  ['https://staging.example.com/api', 'HTTPS staging origin이 필요합니다.'],
])('안전하지 않은 staging origin을 거부한다: %s', (origin, message) => {
  expect(() =>
    resolveStagingConfig({
      STAGING_API_BASE_URL: origin,
      STAGING_ACCESS_TOKEN: 'synthetic-token',
    }),
  ).toThrow(message);
});

test('결과에는 token과 응답 원문이 남지 않는다', () => {
  const value = sanitizeResult({
    name: 'profile hydration',
    status: 503,
    code: 'PROFILE_DATA_UNAVAILABLE',
    traceId: 'safe-trace-1',
    authorization: 'Bearer secret',
    body: { detail: 'private response' },
  });

  expect(value).toEqual({
    name: 'profile hydration',
    status: 503,
    code: 'PROFILE_DATA_UNAVAILABLE',
    traceId: 'safe-trace-1',
  });
  expect(JSON.stringify(value)).not.toMatch(/secret|private response|Bearer/);
});

test('실제 HTTP harness는 GET hydration만 수행하고 공개 요청에 token을 붙이지 않는다', async () => {
  const requests = [];
  const fetchImpl = jest.fn(async (url, init) => {
    requests.push({ url, init });
    const path = new URL(url).pathname;
    const body = path.endsWith('/saved-places')
      ? { items: [{ placeId: 'place-1' }] }
      : path.endsWith('/trips')
        ? { items: [{ tripId: 'trip-1' }] }
        : path.endsWith('/me')
          ? { userId: 'user-1' }
          : {};
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  const result = await runStagingE2E(
    {
      status: 'ready',
      origin: 'https://staging.example.com',
      accessToken: 'secret-token',
    },
    fetchImpl,
  );

  expect(result.status).toBe('passed');
  expect(requests.every(({ init }) => init.method === 'GET')).toBe(true);
  expect(
    requests
      .filter(({ url }) => /legal-documents|\/places\?/.test(url))
      .every(({ init }) => init.headers.Authorization === undefined),
  ).toBe(true);
  expect(
    requests
      .filter(({ url }) => !/legal-documents|\/places\?/.test(url))
      .every(
        ({ init }) => init.headers.Authorization === 'Bearer secret-token',
      ),
  ).toBe(true);
  expect(JSON.stringify(result)).not.toContain('secret-token');
});
