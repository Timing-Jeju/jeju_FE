/* eslint-env node, jest */

const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { PLANNER_AVAILABLE } = require('@/services/plannerAvailability');

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path));
const json = (path) => JSON.parse(read(path).toString('utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('OpenAPI와 runtime manifest는 검증한 backend SHA/checksum에 고정된다', () => {
  const source = json('contracts/backend.source.json');
  expect(source.sourceCommit).toBe('9d8d3281bd36358d49988d7f64f6eab598994cd6');
  expect(source.sourceBranch).toBe('feat/53-generation-run-intake');
  expect(sha256(read('contracts/backend.openapi.json'))).toBe(
    source.sourceOpenApiSha256,
  );
  expect(sha256(read('contracts/backend.runtime.json'))).toBe(
    source.runtimeManifestSha256,
  );
});

test('runtime 43개 operation마다 실제 wrapper와 화면 선행 상태가 명시된다', () => {
  const source = json('contracts/backend.source.json');
  const runtime = json('contracts/backend.runtime.json');
  const coverage = json('contracts/backend.coverage.json');
  const operations = Object.keys(runtime.operations).sort();

  expect(operations).toHaveLength(43);
  expect(source.operations).toEqual(operations);
  expect(Object.keys(coverage.operations).sort()).toEqual(operations);
  expect(coverage.sourceCommit).toBe(source.sourceCommit);

  for (const operation of operations) {
    const entry = coverage.operations[operation];
    expect(entry.wrapper).toBe('connected');
    expect(['connected', 'deferred']).toContain(entry.screen);
    expect(entry.prerequisite.length).toBeGreaterThan(0);
    expect(read(`services/api/${entry.module}`).toString('utf8')).toContain(
      `export const ${entry.export}`,
    );
  }
});

test('공개 생성·조회·적용 계약을 인계해도 staging 검증 전에는 활성화하지 않는다', () => {
  const runtime = json('contracts/backend.runtime.json');
  const prefix = '/api/v1/trips/{tripId}/schedule-generations';
  expect(runtime.operations).toHaveProperty(`POST ${prefix}`);
  expect(runtime.operations).toHaveProperty(`GET ${prefix}/{runId}`);
  expect(runtime.operations).toHaveProperty(
    `POST ${prefix}/{runId}/candidates/{candidateId}/apply`,
  );
  expect(PLANNER_AVAILABLE).toBe(false);
});

test('저장 장소 목록 item ETag와 수정/삭제 concurrency 계약을 고정한다', () => {
  const openapi = json('contracts/backend.openapi.json');
  const runtime = json('contracts/backend.runtime.json');
  const savedPlace = openapi.components.schemas.SavedPlaceResponse;
  expect(savedPlace.required).toContain('etag');
  expect(savedPlace.properties.etag.pattern).toBe('^"[A-Za-z0-9._:-]{1,128}"$');

  const itemPath = openapi.paths['/api/v1/me/saved-places/{placeId}'];
  expect(itemPath.patch.parameters.map((value) => value.name)).toContain(
    'If-Match',
  );
  const deleteIfMatch = itemPath.delete.parameters.find(
    (value) => value.name === 'If-Match',
  );
  expect(deleteIfMatch).toMatchObject({
    in: 'header',
    required: true,
  });
  expect(itemPath.delete.responses).toEqual(
    expect.objectContaining({
      204: expect.any(Object),
      400: expect.any(Object),
      404: expect.any(Object),
      409: expect.any(Object),
    }),
  );
  expect(
    runtime.operations['DELETE /api/v1/me/saved-places/{placeId}'],
  ).toMatchObject({
    statuses: [204, 400, 401, 403, 404, 409, 500],
    problems: {
      400: ['INVALID_REQUEST', expect.any(String)],
      404: ['SAVED_PLACE_NOT_FOUND', expect.any(String)],
      409: ['SAVED_PLACE_VERSION_CONFLICT', expect.any(String)],
    },
  });
});
