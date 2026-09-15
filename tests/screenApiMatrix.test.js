/* eslint-env node, jest */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

test('화면 API matrix는 runtime 43개 operation을 누락·중복 없이 감사한다', () => {
  const runtime = json('contracts/backend.runtime.json');
  const matrix = json('contracts/screen-api.matrix.json');
  const operations = matrix.domains.flatMap((domain) => domain.operations);

  expect(operations.sort()).toEqual(Object.keys(runtime.operations).sort());
  expect(new Set(operations).size).toBe(operations.length);
  expect(operations).toHaveLength(43);
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

test('43개 operation의 matrix와 coverage 상태가 전수 일치하고 28개만 실제 호출로 연결한다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const coverage = json('contracts/backend.coverage.json');
  const operationStates = new Map(
    matrix.domains.flatMap((domain) =>
      domain.operations.map((operation) => [operation, domain.screenState]),
    ),
  );

  expect(operationStates.size).toBe(43);
  expect(
    [...operationStates.values()].filter((state) => state === 'connected'),
  ).toHaveLength(28);
  expect(
    [...operationStates.values()].filter((state) => state === 'deferred'),
  ).toHaveLength(15);
  for (const [operation, state] of operationStates) {
    expect(coverage.operations[operation].screen).toBe(state);
  }
});

test('wrapper action만 있고 화면 invocation이 없는 trip DELETE와 notification 설정은 deferred다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const operationStates = Object.fromEntries(
    matrix.domains.flatMap((domain) =>
      domain.operations.map((operation) => [operation, domain.screenState]),
    ),
  );

  expect(operationStates['DELETE /api/v1/trips/{tripId}']).toBe('deferred');
  expect(operationStates['GET /api/v1/me/notification-preferences']).toBe(
    'deferred',
  );
  expect(operationStates['PATCH /api/v1/me/notification-preferences']).toBe(
    'deferred',
  );
});

test('coverage 문서는 실제 generation endpoint를 표에 포함하고 flag-off 상태를 설명한다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const docs = read('docs/backend-api-coverage.md');

  expect(matrix.sourceFrontendCommit).toBe(
    '527579307490c8dfb744bd2cae5f3459bcd3d12e',
  );
  expect(docs).toContain('`POST /api/v1/trips/{tripId}/schedule-generations`');
  expect(docs).toContain('`PLANNER_AVAILABLE=false`');
  expect(docs).not.toContain(
    '공개 Spring endpoint가 없는 AI 생성·조회·적용은 이 표와 wrapper에 포함하지 않는다',
  );
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

test('deferred 화면은 blocker를 유지하고 서버 AI planner는 활성화한다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const deferred = matrix.domains.filter(
    (domain) => domain.screenState === 'deferred',
  );
  const planner = read('services/plannerAvailability.ts');

  expect(deferred.length).toBeGreaterThan(0);
  expect(
    deferred.every((domain) => domain.restartHydration.startsWith('blocked:')),
  ).toBe(true);
  expect(planner).toContain('PLANNER_AVAILABLE = true');
  expect(planner).toContain('LIVE_GUIDANCE_AVAILABLE = false');
});

test('반복 GET을 앱 재시작 hydration 완료 증거로 과대평가하지 않는다', () => {
  const matrix = json('contracts/screen-api.matrix.json');

  expect(matrix.stagingVerification.serverReadConsistency).toMatch(/^blocked:/);
  expect(matrix.stagingVerification.appRestartHydration).toMatch(/^blocked:/);
});
