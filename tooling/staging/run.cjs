/* eslint-env node */

const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_TRACE_ID = /^[A-Za-z0-9._:-]{1,128}$/;

function resolveStagingConfig(env) {
  const missing = ['STAGING_API_BASE_URL', 'STAGING_ACCESS_TOKEN'].filter(
    (name) => !env[name]?.trim(),
  );
  if (missing.length) return { status: 'blocked', missing };

  let url;
  try {
    url = new URL(env.STAGING_API_BASE_URL);
  } catch {
    throw new Error('HTTPS staging origin이 필요합니다.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('HTTPS staging origin이 필요합니다.');
  }

  return {
    status: 'ready',
    origin: url.origin,
    accessToken: env.STAGING_ACCESS_TOKEN.trim(),
  };
}

function sanitizeResult(value) {
  return Object.fromEntries(
    ['name', 'outcome', 'status', 'code', 'traceId', 'reason']
      .filter((key) => value[key] !== undefined && value[key] !== null)
      .map((key) => [key, value[key]]),
  );
}

const stableIds = (value, key) => {
  if (!value || !Array.isArray(value.items)) return null;
  const ids = value.items.map((item) => item?.[key]);
  return ids.every((id) => typeof id === 'string') ? ids : null;
};

async function runStagingE2E(config, fetchImpl = globalThis.fetch) {
  if (config.status !== 'ready') return config;
  if (typeof fetchImpl !== 'function') throw new Error('fetch unavailable');

  const results = [];
  const request = async (name, path, authenticated = true) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetchImpl(`${config.origin}/api/v1${path}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json, application/problem+json',
          ...(authenticated
            ? { Authorization: `Bearer ${config.accessToken}` }
            : {}),
        },
        redirect: 'error',
        signal: controller.signal,
      });
      let body = null;
      try {
        body = await response.json();
      } catch {
        // 204 또는 빈 오류 응답의 원문은 결과에 보존하지 않는다.
      }
      const candidateCode = body?.code;
      const candidateTrace = response.headers.get('x-trace-id');
      const result = sanitizeResult({
        name,
        outcome: response.ok ? 'passed' : 'failed',
        status: response.status,
        code:
          typeof candidateCode === 'string' && SAFE_CODE.test(candidateCode)
            ? candidateCode
            : undefined,
        traceId:
          candidateTrace && SAFE_TRACE_ID.test(candidateTrace)
            ? candidateTrace
            : undefined,
      });
      results.push(result);
      return { response, body };
    } catch (error) {
      results.push(
        sanitizeResult({
          name,
          outcome: 'failed',
          status: 0,
          code:
            error?.name === 'AbortError'
              ? 'CLIENT_TIMEOUT'
              : 'CLIENT_NETWORK_ERROR',
        }),
      );
      return { response: null, body: null };
    } finally {
      clearTimeout(timeout);
    }
  };

  await request('legal documents screen response', '/legal-documents', false);
  await request('places screen response', '/places?size=1', false);
  const profile = await request('profile restart hydration', '/me');
  const savedFirst = await request(
    'saved places initial hydration',
    '/me/saved-places?size=20',
  );
  const tripsFirst = await request('trips initial hydration', '/trips?size=20');
  await request(
    'notification preferences restart hydration',
    '/me/notification-preferences',
  );

  const savedRestart = await request(
    'saved places restart hydration',
    '/me/saved-places?size=20',
  );
  const tripsRestart = await request(
    'trips restart hydration',
    '/trips?size=20',
  );

  const savedBefore = stableIds(savedFirst.body, 'placeId');
  const savedAfter = stableIds(savedRestart.body, 'placeId');
  const tripBefore = stableIds(tripsFirst.body, 'tripId');
  const tripAfter = stableIds(tripsRestart.body, 'tripId');
  for (const [name, before, after] of [
    ['saved places restart equality', savedBefore, savedAfter],
    ['trips restart equality', tripBefore, tripAfter],
  ]) {
    results.push(
      sanitizeResult({
        name,
        outcome:
          before && after && JSON.stringify(before) === JSON.stringify(after)
            ? 'passed'
            : 'failed',
        reason:
          before && after
            ? undefined
            : '응답 page의 canonical ID 배열을 확인할 수 없습니다.',
      }),
    );
  }

  const tripId = tripBefore?.[0];
  if (tripId) {
    await request(
      'trip detail response',
      `/trips/${encodeURIComponent(tripId)}`,
    );
    await request(
      'schedule restart hydration',
      `/trips/${encodeURIComponent(tripId)}/schedule`,
    );
  } else {
    results.push(
      sanitizeResult({
        name: 'trip detail and schedule hydration',
        outcome: 'blocked',
        reason: 'staging 계정에 조회 가능한 trip fixture가 필요합니다.',
      }),
    );
  }

  if (!profile.response?.ok) {
    results.push(
      sanitizeResult({
        name: 'authenticated account boundary',
        outcome: 'blocked',
        reason: '유효한 격리 staging Supabase access token이 필요합니다.',
      }),
    );
  }

  const failed = results.some((result) => result.outcome === 'failed');
  const blocked = results.some((result) => result.outcome === 'blocked');
  return {
    status: failed ? 'failed' : blocked ? 'blocked' : 'passed',
    results,
  };
}

async function main() {
  let config;
  try {
    config = resolveStagingConfig(process.env);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ status: 'blocked', reason: error.message }, null, 2)}\n`,
    );
    process.exitCode = 2;
    return;
  }

  if (config.status === 'blocked') {
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

  const result = await runStagingE2E(config);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode =
    result.status === 'passed' ? 0 : result.status === 'blocked' ? 2 : 1;
}

module.exports = { resolveStagingConfig, runStagingE2E, sanitizeResult };

if (require.main === module) void main();
