/* eslint-env node */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import openapiTS, { astToString } from 'openapi-typescript';

const raw = readFileSync('contracts/places.openapi.json');
const manifest = JSON.parse(readFileSync('contracts/places.source.json'));
if (
  createHash('sha256').update(raw).digest('hex') !== manifest.exportedSha256
) {
  throw new Error('OpenAPI source checksum mismatch');
}
const output = astToString(await openapiTS(JSON.parse(raw)));
const path = 'services/generated/places.d.ts';
const backendRaw = readFileSync('contracts/backend.openapi.json');
const backendRuntimeRaw = readFileSync('contracts/backend.runtime.json');
const backendManifest = JSON.parse(
  readFileSync('contracts/backend.source.json', 'utf8'),
);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
if (
  sha256(backendRaw) !== backendManifest.sourceOpenApiSha256 ||
  sha256(backendRuntimeRaw) !== backendManifest.runtimeManifestSha256
) {
  throw new Error('Backend OpenAPI source checksum mismatch');
}
const backendOpenApi = JSON.parse(backendRaw);
const backendRuntime = JSON.parse(backendRuntimeRaw);
const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const openApiOperations = [];
for (const [operationPath, pathItem] of Object.entries(backendOpenApi.paths)) {
  for (const method of Object.keys(pathItem)) {
    if (methods.has(method))
      openApiOperations.push(`${method.toUpperCase()} ${operationPath}`);
  }
}
openApiOperations.sort();
const runtimeOperations = Object.keys(backendRuntime.operations).sort();
const coverage = JSON.parse(
  readFileSync('contracts/backend.coverage.json', 'utf8'),
);
const coverageOperations = Object.keys(coverage.operations ?? {}).sort();
if (
  JSON.stringify(openApiOperations) !== JSON.stringify(runtimeOperations) ||
  JSON.stringify(runtimeOperations) !==
    JSON.stringify([...backendManifest.operations].sort()) ||
  JSON.stringify(runtimeOperations) !== JSON.stringify(coverageOperations) ||
  coverage.sourceCommit !== backendManifest.sourceCommit
) {
  throw new Error('Backend runtime manifest coverage mismatch');
}
for (const operation of runtimeOperations) {
  const entry = coverage.operations[operation];
  if (
    entry.wrapper !== 'connected' ||
    !['connected', 'deferred'].includes(entry.screen) ||
    typeof entry.prerequisite !== 'string'
  ) {
    throw new Error(`Invalid wrapper coverage entry: ${operation}`);
  }
  const source = readFileSync(`services/api/${entry.module}`, 'utf8');
  if (!source.includes(`export const ${entry.export}`)) {
    throw new Error(`Wrapper export is missing: ${operation}`);
  }
}
const backendOutput = astToString(await openapiTS(backendOpenApi));
const backendPath = 'services/generated/backend.d.ts';
const problemCodes = new Set(
  Object.keys(backendRuntime.runtimeProblemDefinitions ?? {}),
);
const problemStatuses = new Map();
const addProblemStatus = (code, status) => {
  problemCodes.add(code);
  const statuses = problemStatuses.get(code) ?? new Set();
  statuses.add(Number(status));
  problemStatuses.set(code, statuses);
};
for (const operation of Object.values(backendRuntime.operations)) {
  for (const [status, value] of Object.entries(operation.problems ?? {})) {
    if (Array.isArray(value) && typeof value[0] === 'string')
      addProblemStatus(value[0], status);
  }
  for (const [status, values] of Object.entries(operation.problemSets ?? {})) {
    for (const value of values) {
      if (Array.isArray(value) && typeof value[0] === 'string')
        addProblemStatus(value[0], status);
    }
  }
}
const statusEntries = [...problemStatuses]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(
    ([code, statuses]) =>
      `  ${code}: [${[...statuses].sort((a, b) => a - b).join(', ')}],`,
  )
  .join('\n');
const serializedProblemCodes = [...problemCodes]
  .sort()
  .map((code) => `  '${code}',`)
  .join('\n');
const runtimeContractOutput = `/** Generated from contracts/backend.runtime.json. */\nexport const STABLE_PROBLEM_CODES = new Set<string>([\n${serializedProblemCodes}\n]);\n\nexport const STABLE_PROBLEM_STATUSES: Record<string, readonly number[]> = {\n${statusEntries}\n};\n`;
const runtimeContractPath = 'services/generated/backendRuntime.ts';
const coverageOutput = [
  '# Spring API wrapper coverage',
  '',
  `Backend: \`Timing-Jeju/jeju_BE@${backendManifest.sourceCommit}\` (\`${backendManifest.sourceBranch}\`)`,
  '',
  '| Operation | Wrapper | 화면 연결 | 선행 조건 |',
  '| --- | --- | --- | --- |',
  ...runtimeOperations.map((operation) => {
    const entry = coverage.operations[operation];
    return `| \`${operation}\` | \`${entry.module}#${entry.export}\` | ${entry.screen} | ${entry.prerequisite} |`;
  }),
  '',
  '화면 연결이 `deferred`인 항목은 wrapper가 있어도 실제 화면 invocation이 없거나 기능 gate가 닫혀 있다. 일정 생성·조회·적용 endpoint는 표에 포함하지만 `PLANNER_AVAILABLE=false` 동안 deferred로 유지한다.',
  '',
].join('\n');
const coveragePath = 'docs/backend-api-coverage.md';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== output)
    throw new Error('Generated OpenAPI types are out of date');
  if (readFileSync(backendPath, 'utf8') !== backendOutput)
    throw new Error('Generated backend OpenAPI types are out of date');
  if (readFileSync(runtimeContractPath, 'utf8') !== runtimeContractOutput)
    throw new Error('Generated backend runtime contract is out of date');
  if (readFileSync(coveragePath, 'utf8') !== coverageOutput)
    throw new Error('Generated backend wrapper coverage is out of date');
} else {
  writeFileSync(path, output);
  writeFileSync(backendPath, backendOutput);
  writeFileSync(runtimeContractPath, runtimeContractOutput);
  writeFileSync(coveragePath, coverageOutput);
}
