import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('the standard deploy path runs release preflight with the current version notes', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(packageJson.scripts['release:preflight'], /release_preflight\.mjs/);
  assert.match(packageJson.scripts.deploy, /^npm run release:preflight && gh-pages -d dist$/);
});

test('release preflight defaults to the current version bilingual notes', () => {
  const result = spawnSync(process.execPath, ['scripts/release_preflight.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RELEASE_PREFLIGHT_OK version=v1\.4\.1/);
  assert.match(result.stdout, /docs[\\/]releases[\\/]v1\.4\.1\.md/);
});

test('release preflight accepts the current bilingual v1.4.1 release contract', () => {
  const result = spawnSync(process.execPath, ['scripts/release_preflight.mjs', '--notes', 'docs/releases/v1.4.1.md'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RELEASE_PREFLIGHT_OK version=v1\.4\.1/);
});

test('release notes use the exact per-bullet English / Japanese public format', () => {
  const notes = readFileSync('docs/releases/v1.4.1.md', 'utf8');
  for (const line of notes.split(/\r?\n/).filter((value) => value.startsWith('- '))) {
    assert.match(line, /\/ .*?[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, line);
  }
});

test('release preflight fails closed before a release when its bilingual notes are absent', () => {
  const result = spawnSync(process.execPath, ['scripts/release_preflight.mjs', '--notes', 'docs/releases/does-not-exist.md'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /RELEASE_PREFLIGHT_FAILED/);
  assert.match(`${result.stdout}\n${result.stderr}`, /release notes file is missing/);
});

test('release-note renderer produces the fixed English / Japanese format', () => {
  const folder = mkdtempSync(join(tmpdir(), 'background-release-notes-'));
  const input = join(folder, 'release.json');
  const output = join(folder, 'release.md');
  writeFileSync(input, JSON.stringify({ sections: [{ en: 'Verification', ja: '\u691c\u8a3c', items: [{ en: 'Tests passed', ja: '\u30c6\u30b9\u30c8\u901a\u904e' }] }] }), 'utf8');
  const result = spawnSync(process.execPath, ['scripts/render_release_notes.mjs', '--input', input, '--output', output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(output, 'utf8'), '## Verification / 検証\n\n- Tests passed / テスト通過\n');
});

test('release-note renderer rejects a missing Japanese field', () => {
  const folder = mkdtempSync(join(tmpdir(), 'background-release-notes-'));
  const input = join(folder, 'release.json');
  const output = join(folder, 'release.md');
  writeFileSync(input, JSON.stringify({ sections: [{ en: 'Verification', ja: '\u691c\u8a3c', items: [{ en: 'Tests passed', ja: '' }] }] }), 'utf8');
  const result = spawnSync(process.execPath, ['scripts/render_release_notes.mjs', '--input', input, '--output', output], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /Each release item requires English and Japanese text/);
});
