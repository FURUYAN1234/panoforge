import { readFileSync, writeFileSync } from 'node:fs';

const inputIndex = process.argv.indexOf('--input');
const outputIndex = process.argv.indexOf('--output');
if (inputIndex < 0 || outputIndex < 0 || !process.argv[inputIndex + 1] || !process.argv[outputIndex + 1]) {
  throw new Error('Usage: node scripts/render_release_notes.mjs --input <release.json> --output <release.md>');
}

const source = JSON.parse(readFileSync(process.argv[inputIndex + 1], 'utf8'));
if (!Array.isArray(source.sections) || source.sections.length === 0) throw new Error('Release data must contain sections.');
const japanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const lines = [];
for (const section of source.sections) {
  if (!section.en || !section.ja || !japanese.test(section.ja) || !Array.isArray(section.items) || section.items.length === 0) {
    throw new Error('Each section requires English/Japanese heading and at least one item.');
  }
  lines.push(`## ${section.en} / ${section.ja}`, '');
  for (const item of section.items) {
    if (!item.en || !item.ja || !japanese.test(item.ja)) throw new Error('Each release item requires English and Japanese text.');
    lines.push(`- ${item.en} / ${item.ja}`);
  }
  lines.push('');
}
writeFileSync(process.argv[outputIndex + 1], `${lines.join('\n').trimEnd()}\n`, 'utf8');
console.log(`RELEASE_NOTES_RENDERED output=${process.argv[outputIndex + 1]}`);
