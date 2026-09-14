/* eslint-env node, jest */

const { readFileSync, readdirSync, statSync } = require('node:fs');
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

test('trip preference wrapper-only operation은 화면 연결로 표기하지 않는다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const wrapperOnly = new Set([
    'PUT /api/v1/trips/{tripId}/preferences',
    'PUT /api/v1/trips/{tripId}/place-preferences',
  ]);

  for (const domain of matrix.domains) {
    if (domain.operations.some((operation) => wrapperOnly.has(operation))) {
      expect(domain.screenState).toBe('deferred');
    }
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

test('외부 길찾기 matrix는 서버 operation 없이 목적지 전용 공식 계약과 코드 증거를 고정한다', () => {
  const matrix = json('contracts/screen-api.matrix.json');
  const navigation = matrix.externalNavigation;

  expect(navigation.providers).toEqual({
    primary: 'NAVER Maps app',
    httpsFallback: 'Google Maps',
  });
  expect(navigation.officialContracts.naverDeepLink).toBe(
    'https://guide.ncloud-docs.com/docs/en/maps-url-scheme',
  );
  expect(navigation.officialContracts.httpsFallback).toBe(
    'https://developers.google.com/maps/documentation/urls/get-started',
  );
  expect(navigation.serverOperations).toEqual([]);
  expect(navigation.transmittedQueryParameters.deepLink).toEqual([
    'dlat',
    'dlng',
    'dname',
    'appname',
  ]);
  expect(navigation.transmittedQueryParameters.httpsFallback).toEqual([
    'api',
    'destination',
  ]);
  expect(navigation.forbiddenQueryParameters).toEqual(
    expect.arrayContaining(['slat', 'slng', 'sname', 'currentLocation', 'gps']),
  );
  for (const field of ['callEvidence', 'responseEvidence', 'errorEvidence']) {
    const [path, token] = navigation[field].split('#');
    expect(read(path)).toContain(token);
  }
});

test('앱 소스에는 지도 SDK public client ID만 남고 client secret REST 호출은 없다', () => {
  const files = [];
  const visit = (path) => {
    for (const name of readdirSync(path)) {
      const entry = resolve(path, name);
      if (statSync(entry).isDirectory()) visit(entry);
      else if (/\.(ts|tsx|js)$/.test(name)) files.push(entry);
    }
  };
  visit(resolve(root, 'services'));
  const source = files.map((path) => readFileSync(path, 'utf8')).join('\n');
  const appConfig = read('app.config.js');

  expect(source).not.toMatch(/EXPO_PUBLIC_[A-Z0-9_]*(SECRET|SEARCH)/);
  expect(source).not.toMatch(
    /map-direction|map-geocode|openapi\.naver\.com\/v1\/search\/local/,
  );
  expect(appConfig).toContain('EXPO_PUBLIC_NCP_MAPS_CLIENT_ID');
  expect(appConfig).not.toMatch(/EXPO_PUBLIC_[A-Z0-9_]*(SECRET|SEARCH)/);
});
