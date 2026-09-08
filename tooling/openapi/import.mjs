/* eslint-env node */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [sourcePath, sourceCommit] = process.argv.slice(2);
if (!sourcePath || !/^[0-9a-f]{40}$/.test(sourceCommit ?? '')) {
  throw new Error(
    'Usage: node tooling/openapi/import.mjs <Spring OpenAPI JSON> <verified commit SHA>',
  );
}
const raw = readFileSync(sourcePath);
const source = JSON.parse(raw);
const paths = {};
for (const path of ['/api/v1/places', '/api/v1/places/{placeId}']) {
  if (!source.paths[path]?.get)
    throw new Error('Required place operation is missing');
  paths[path] = { get: source.paths[path].get };
}
const components = { securitySchemes: source.components.securitySchemes ?? {} };
const visited = new Set();
function collect(value) {
  if (!value || typeof value !== 'object') return;
  if (value.$ref) {
    const ref = value.$ref;
    if (!ref.startsWith('#/components/'))
      throw new Error('Only local component references are supported');
    if (!visited.has(ref)) {
      visited.add(ref);
      const [, , kind, name] = ref.split('/');
      const component = source.components[kind]?.[name];
      if (!component) throw new Error('Missing referenced component');
      components[kind] ??= {};
      components[kind][name] = component;
      collect(component);
    }
  }
  for (const child of Object.values(value)) collect(child);
}
collect(paths);
const exported =
  JSON.stringify(
    { openapi: source.openapi, info: source.info, paths, components },
    null,
    2,
  ) + '\n';
const sha = (value) => createHash('sha256').update(value).digest('hex');
writeFileSync('contracts/places.openapi.json', exported);
writeFileSync(
  'contracts/places.source.json',
  JSON.stringify(
    {
      repository: 'Timing-Jeju/jeju_BE',
      sourceCommit,
      sourceOpenApiSha256: sha(raw),
      exportedSha256: sha(exported),
      operations: Object.keys(paths).map((path) => `GET ${path}`),
    },
    null,
    2,
  ) + '\n',
);
