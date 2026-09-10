/* eslint-env node */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [openApiPath, runtimeManifestPath, sourceCommit] = process.argv.slice(2);
if (
  !openApiPath ||
  !runtimeManifestPath ||
  !/^[0-9a-f]{40}$/.test(sourceCommit ?? '')
) {
  throw new Error(
    'Usage: node tooling/openapi/import-backend.mjs <OpenAPI JSON> <runtime manifest JSON> <verified commit SHA>',
  );
}

const openApiRaw = readFileSync(openApiPath);
const runtimeManifestRaw = readFileSync(runtimeManifestPath);
const openApi = JSON.parse(openApiRaw);
const runtimeManifest = JSON.parse(runtimeManifestRaw);
const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const openApiOperations = [];
for (const [path, pathItem] of Object.entries(openApi.paths ?? {})) {
  for (const method of Object.keys(pathItem)) {
    if (methods.has(method))
      openApiOperations.push(`${method.toUpperCase()} ${path}`);
  }
}
openApiOperations.sort();
const runtimeOperations = Object.keys(runtimeManifest.operations ?? {}).sort();
if (JSON.stringify(openApiOperations) !== JSON.stringify(runtimeOperations)) {
  throw new Error('Runtime manifest and public OpenAPI operations differ');
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

writeFileSync('contracts/backend.openapi.json', openApiRaw);
writeFileSync('contracts/backend.runtime.json', runtimeManifestRaw);
writeFileSync(
  'contracts/backend.source.json',
  `${JSON.stringify(
    {
      repository: 'Timing-Jeju/jeju_BE',
      sourceBranch: 'develop',
      sourceCommit,
      sourceOpenApiSha256: sha256(openApiRaw),
      runtimeManifestSha256: sha256(runtimeManifestRaw),
      operations: runtimeOperations,
    },
    null,
    2,
  )}\n`,
);
