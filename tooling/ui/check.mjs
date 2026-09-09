import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../..');
const baselinePath = path.join(import.meta.dirname, 'original-styles.json');
const baselineRef = '3c280a1cc05c73150e6f0bb1174443906de04f91';
const printer = ts.createPrinter({ removeComments: true });
function styles(source, filename) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const blocks = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(file) === 'StyleSheet.create'
    ) {
      blocks.push(
        printer.printNode(ts.EmitHint.Unspecified, node.arguments[0], file),
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return blocks.length
    ? crypto.createHash('sha256').update(blocks.join('\n')).digest('hex')
    : null;
}
if (process.argv.includes('--original')) {
  const files = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', baselineRef, '--', 'app', 'components'],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n');
  const hashes = {};
  for (const filename of files.filter((name) => name.endsWith('.tsx'))) {
    const hash = styles(
      execFileSync('git', ['show', `${baselineRef}:${filename}`], {
        cwd: root,
        encoding: 'utf8',
      }),
      filename,
    );
    if (hash) hashes[filename] = hash;
  }
  process.stdout.write(JSON.stringify({ baselineRef, hashes }, null, 2) + '\n');
} else {
  const { hashes } = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const failures = [];
  for (const [filename, expected] of Object.entries(hashes)) {
    const target = path.join(root, filename);
    if (
      !fs.existsSync(target) ||
      styles(fs.readFileSync(target, 'utf8'), filename) !== expected
    )
      failures.push(filename);
  }
  if (failures.length)
    throw new Error(`기존 스타일 변경 감지: ${failures.join(', ')}`);
  process.stdout.write(
    `기존 ${Object.keys(hashes).length}개 파일 StyleSheet 일치 (화면 시각 비교를 대체하지 않음)\n`,
  );
}
