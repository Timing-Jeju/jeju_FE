/* eslint-env node, jest */

const {
  resolveStagingConfig,
  runStagingE2E,
  sanitizeResult,
} = require('../tooling/staging/run.cjs');

const successfulBody = (path) => {
  if (path.endsWith('/legal-documents') || path.endsWith('/places')) {
    return { items: [] };
  }
  if (path.endsWith('/saved-places')) {
    return { items: [{ placeId: 'place-1', memo: 'kept', etag: '"sp-1"' }] };
  }
  if (path.endsWith('/trips')) return { items: [{ tripId: 'trip-1' }] };
  if (path.endsWith('/me')) return { userId: 'user-1' };
  if (path.endsWith('/notification-preferences')) {
    return {
      nextDestinationDepartureEnabled: true,
      safetyBufferMinutes: 10,
    };
  }
  if (path.endsWith('/schedule')) return { scheduleVersion: {}, days: [] };
  if (path.endsWith('/trip-1')) return { tripId: 'trip-1' };
  return {};
};

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
    const body = successfulBody(path);
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

test('HTTP 200 Problem 응답도 endpoint와 전체 결과를 실패 처리한다', async () => {
  const fetchImpl = jest.fn(async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/me')) {
      return new Response(JSON.stringify({ code: 'AUTHENTICATION_REQUIRED' }), {
        status: 200,
        headers: { 'content-type': 'application/problem+json' },
      });
    }
    const body = successfulBody(path);
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

  expect(result.status).toBe('failed');
  expect(result.results).toContainEqual(
    expect.objectContaining({
      name: 'profile screen response',
      outcome: 'failed',
      status: 200,
      code: 'AUTHENTICATION_REQUIRED',
    }),
  );
});

test('2xx 비 JSON 또는 잘못된 endpoint shape를 성공으로 처리하지 않는다', async () => {
  const fetchImpl = jest.fn(async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/legal-documents')) {
      return new Response('<html>proxy login</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    const body =
      path.endsWith('/saved-places') || path.endsWith('/trips')
        ? { unexpected: true }
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

  expect(result.status).toBe('failed');
  expect(result.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'legal documents screen response',
        outcome: 'failed',
        code: 'INVALID_RESPONSE_MEDIA_TYPE',
      }),
      expect.objectContaining({
        name: 'saved places initial server read',
        outcome: 'failed',
        code: 'INVALID_RESPONSE_BODY',
      }),
    ]),
  );
});

test('반복 조회에서 saved-place memo/ETag가 유실되면 ID가 같아도 실패한다', async () => {
  let savedRead = 0;
  const fetchImpl = jest.fn(async (url) => {
    const path = new URL(url).pathname;
    let body = {};
    if (path.endsWith('/saved-places')) {
      savedRead += 1;
      body = {
        items: [
          savedRead === 1
            ? { placeId: 'place-1', memo: 'kept', etag: '"sp-1"' }
            : { placeId: 'place-1' },
        ],
      };
    } else if (path.endsWith('/trips')) {
      body = { items: [] };
    } else if (path.endsWith('/legal-documents') || path.endsWith('/places')) {
      body = { items: [] };
    }
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

  expect(result.status).toBe('failed');
  expect(result.results).toContainEqual(
    expect.objectContaining({
      name: 'saved places server read consistency',
      outcome: 'failed',
    }),
  );
});
