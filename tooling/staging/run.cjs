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

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isPage = (value) => isRecord(value) && Array.isArray(value.items);
const isProfile = (value) =>
  isRecord(value) && typeof value.userId === 'string';
const isPreference = (value) =>
  isRecord(value) &&
  typeof value.nextDestinationDepartureEnabled === 'boolean' &&
  Number.isInteger(value.safetyBufferMinutes);
const isTrip = (value) => isRecord(value) && typeof value.tripId === 'string';
const isSchedule = (value) =>
  isRecord(value) &&
  isRecord(value.scheduleVersion) &&
  Array.isArray(value.days);
const pageSnapshot = (value) =>
  isPage(value) ? JSON.stringify(value.items) : null;

async function runStagingE2E(config, fetchImpl = globalThis.fetch) {
  if (config.status !== 'ready') return config;
  if (typeof fetchImpl !== 'function') throw new Error('fetch unavailable');

  const results = [];
  const request = async (
    name,
    path,
    authenticated = true,
    validateBody = isRecord,
  ) => {
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
      const mediaType = (response.headers.get('content-type') ?? '')
        .split(';', 1)[0]
        .trim()
        .toLowerCase();
      const jsonMediaType =
        mediaType === 'application/json' ||
        /^application\/[a-z0-9.-]+\+json$/.test(mediaType);
      let body = null;
      let parsed = false;
      if (jsonMediaType) {
        try {
          body = await response.json();
          parsed = true;
        } catch {
          // 응답 원문은 결과에 보존하지 않는다.
        }
      }
      const candidateCode = body?.code;
      const candidateTrace = response.headers.get('x-trace-id');
      const problemShape =
        mediaType === 'application/problem+json' ||
        (isRecord(body) &&
          typeof candidateCode === 'string' &&
          SAFE_CODE.test(candidateCode) &&
          (typeof body.status === 'number' ||
            typeof body.type === 'string' ||
            typeof body.title === 'string' ||
            typeof body.detail === 'string'));
      const validBody = parsed && validateBody(body);
      const passed = response.ok && !problemShape && validBody;
      const boundaryCode = !jsonMediaType
        ? 'INVALID_RESPONSE_MEDIA_TYPE'
        : !parsed || (!problemShape && !validBody)
          ? 'INVALID_RESPONSE_BODY'
          : undefined;
      const result = sanitizeResult({
        name,
        outcome: passed ? 'passed' : 'failed',
        status: response.status,
        code:
          typeof candidateCode === 'string' && SAFE_CODE.test(candidateCode)
            ? candidateCode
            : boundaryCode,
        traceId:
          candidateTrace && SAFE_TRACE_ID.test(candidateTrace)
            ? candidateTrace
            : undefined,
      });
      results.push(result);
      return { response, body, passed };
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

  await request(
    'legal documents screen response',
    '/legal-documents',
    false,
    isPage,
  );
  await request('places screen response', '/places?size=1', false, isPage);
  const profile = await request(
    'profile screen response',
    '/me',
    true,
    isProfile,
  );
  const savedFirst = await request(
    'saved places initial server read',
    '/me/saved-places?size=20',
    true,
    isPage,
  );
  const tripsFirst = await request(
    'trips initial server read',
    '/trips?size=20',
    true,
    isPage,
  );
  await request(
    'notification preferences screen response',
    '/me/notification-preferences',
    true,
    isPreference,
  );

  const savedRestart = await request(
    'saved places repeated server read',
    '/me/saved-places?size=20',
    true,
    isPage,
  );
  const tripsRestart = await request(
    'trips repeated server read',
    '/trips?size=20',
    true,
    isPage,
  );

  const savedBefore = pageSnapshot(savedFirst.body);
  const savedAfter = pageSnapshot(savedRestart.body);
  const tripBefore = pageSnapshot(tripsFirst.body);
  const tripAfter = pageSnapshot(tripsRestart.body);
  for (const [name, before, after] of [
    ['saved places server read consistency', savedBefore, savedAfter],
    ['trips server read consistency', tripBefore, tripAfter],
  ]) {
    results.push(
      sanitizeResult({
        name,
        outcome:
          before !== null && after !== null && before === after
            ? 'passed'
            : 'failed',
        reason:
          before !== null && after !== null
            ? undefined
            : '응답 page의 전체 item 배열을 확인할 수 없습니다.',
      }),
    );
  }

  const tripId = isPage(tripsFirst.body)
    ? tripsFirst.body.items[0]?.tripId
    : null;
  if (tripId) {
    await request(
      'trip detail response',
      `/trips/${encodeURIComponent(tripId)}`,
      true,
      isTrip,
    );
    await request(
      'schedule server response',
      `/trips/${encodeURIComponent(tripId)}/schedule`,
      true,
      isSchedule,
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

  if (!profile.passed) {
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
