/* eslint-env node, jest */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

test('화면 API matrix는 runtime 38개 operation을 누락·중복 없이 감사한다', () => {
  const runtime = json('contracts/backend.runtime.json');
  const matrix = json('contracts/screen-api.matrix.json');
  const operations = matrix.domains.flatMap((domain) => domain.operations);

  expect(operations.sort()).toEqual(Object.keys(runtime.operations).sort());
  expect(new Set(operations).size).toBe(operations.length);
});

test('각 화면은 호출·응답·오류·재시작 hydration 증거를 가진다', () => {
  const matrix = json('contracts/screen-api.matrix.json');

  for (const domain of matrix.domains) {
    expect(['connected', 'deferred']).toContain(domain.screenState);
    for (const field of ['callEvidence', 'responseEvidence', 'errorEvidence']) {
      const [path, token] = domain[field].split('#');
      expect(read(path)).toContain(token);
    }
    if (domain.screenState === 'connected') {
      expect(Object.keys(domain.operationEvidence).sort()).toEqual(
        [...domain.operations].sort(),
      );
      for (const evidence of Object.values(domain.operationEvidence)) {
        const [path, token] = evidence.split('#');
        expect(path.startsWith('services/api/')).toBe(false);
        expect(read(path)).toContain(token);
      }
    }
    expect(domain.restartHydration.length).toBeGreaterThan(0);
  }
});

test('operation별 연결 상태는 matrix와 coverage가 일치하고 실제 orchestration 증거를 가리킨다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const coverage = json('contracts/backend.coverage.json');
  const connected = new Set([
    'PUT /api/v1/trips/{tripId}/place-preferences',
    'PUT /api/v1/trips/{tripId}/planner-conditions',
    'PUT /api/v1/trips/{tripId}/transport-event',
    'DELETE /api/v1/trips/{tripId}/transport-event',
  ]);

  for (const operation of connected) {
    const domain = matrix.domains.find((candidate) =>
      candidate.operations.includes(operation),
    );
    expect(domain.screenState).toBe('connected');
    expect(coverage.operations[operation].screen).toBe('connected');
    const [path, token] = domain.operationEvidence[operation].split('#');
    expect(path.startsWith('services/api/')).toBe(false);
    expect(read(path)).toContain(token);
  }
});

test('wrapper-only와 feature-flag 차단 operation만 연결된 operation과 분리해 deferred로 둔다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const deferred = [
    'PUT /api/v1/trips/{tripId}/preferences',
    'POST /api/v1/trips/{tripId}/accommodations',
    'PATCH /api/v1/trips/{tripId}/accommodations/{accommodationId}',
    'DELETE /api/v1/trips/{tripId}/accommodations/{accommodationId}',
    'POST /api/v1/trips/{tripId}/schedule-generations',
    'GET /api/v1/trips/{tripId}/schedule-generations/{runId}',
    'GET /api/v1/trips/{tripId}/schedule-versions/{versionId}',
    'POST /api/v1/trips/{tripId}/schedule-generations/{runId}/candidates/{candidateId}/apply',
  ];

  for (const operation of deferred) {
    const domain = matrix.domains.find((candidate) =>
      candidate.operations.includes(operation),
    );
    expect(domain.screenState).toBe('deferred');
  }
});

test('deferred 화면은 blocker를 숨기지 않고 AI planner는 계속 비활성이다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const deferred = matrix.domains.filter(
    (domain) => domain.screenState === 'deferred',
  );
  const planner = read('services/plannerAvailability.ts');

  expect(deferred.length).toBeGreaterThan(0);
  expect(
    deferred.every((domain) => domain.restartHydration.startsWith('blocked:')),
  ).toBe(true);
  expect(planner).toContain('PLANNER_AVAILABLE = false');
});

test('반복 GET을 앱 재시작 hydration 완료 증거로 과대평가하지 않는다', () => {
  const matrix = json('contracts/screen-api.matrix.json');

  expect(matrix.stagingVerification.serverReadConsistency).toMatch(/^blocked:/);
  expect(matrix.stagingVerification.appRestartHydration).toMatch(/^blocked:/);
});
