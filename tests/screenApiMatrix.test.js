/* eslint-env node, jest */

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));

test('화면 API matrix는 runtime 37개 operation을 누락·중복 없이 감사한다', () => {
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
    expect(domain.restartHydration.length).toBeGreaterThan(0);
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
