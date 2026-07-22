import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const notesIndex = process.argv.indexOf('--notes');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const expectedBadge = `v${version}`;
if (notesIndex >= 0 && !process.argv[notesIndex + 1]) {
  throw new Error('Usage: node scripts/release_preflight.mjs [--notes <release-notes.md>]');
}
const notesPath = resolve(root, notesIndex >= 0 ? process.argv[notesIndex + 1] : `docs/releases/${expectedBadge}.md`);
const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');
const main = readFileSync(resolve(root, 'src/main.js'), 'utf8');
const engine = readFileSync(resolve(root, 'src/panorama.js'), 'utf8');
const notes = existsSync(notesPath) ? readFileSync(notesPath, 'utf8') : '';
const currentReadme = readme.split(/^## .*ChangeLog/m)[0];
const hasJapanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const failures = [];

if (!index.includes(expectedBadge)) failures.push(`index.html must show ${expectedBadge}`);
if (!readme.includes(`**${expectedBadge}**`)) failures.push(`README title must show ${expectedBadge}`);
if (!readme.includes(`current public line is **${expectedBadge}**`)) failures.push(`README current-release line must show ${expectedBadge}`);
if (/2\s*[〜~]\s*5\s*分|2-5 minutes/i.test(currentReadme)) failures.push('README current section contains stale OpenAI timing');
if (!currentReadme.includes('600 seconds (10 minutes)') || !currentReadme.includes('最大10分')) failures.push('README must document the shared 600-second OpenAI limit');
if (!main.includes('resetProviderGenerationSession') || !engine.includes("this.activeEngine === 'openai'")) failures.push('provider-isolation implementation is missing');
if (!notes) failures.push(`release notes file is missing: ${notesPath}`);
if (!/[A-Za-z]/.test(notes) || !hasJapanese.test(notes)) failures.push('release notes must contain both English and Japanese');
if (!/##\s+.+\/.+/.test(notes)) failures.push('release notes must use bilingual section headings');

if (failures.length) throw new Error(`RELEASE_PREFLIGHT_FAILED\n- ${failures.join('\n- ')}`);
console.log(`RELEASE_PREFLIGHT_OK version=${expectedBadge} notes=${notesPath}`);
