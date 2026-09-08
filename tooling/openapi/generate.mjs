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
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== output)
    throw new Error('Generated OpenAPI types are out of date');
} else {
  writeFileSync(path, output);
}
