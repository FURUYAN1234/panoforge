import test from 'node:test';
import assert from 'node:assert/strict';
import { FallbackChainViewer } from '../src/components/FallbackChainViewer.js';
import { FALLBACK_CHAINS } from '../src/lib/fallback-chain-data.js';
import { readFileSync } from 'node:fs';

test('Gemini suggestion runtime and model viewer share the supported stable catalog', () => {
  const expected=['gemini-3.8-flash','gemini-3.6-flash','gemini-3.5-flash-lite','gemini-3.1-flash-lite'];
  for (const chain of FALLBACK_CHAINS.filter(chain=>chain.id.endsWith('-gemini') && chain.id.startsWith('suggest-'))) {
    assert.deepEqual(chain.models.map(model=>model.id),expected);
  }
  const source=readFileSync(new URL('../src/panorama.js',import.meta.url),'utf8');
  assert.match(source,/GEMINI_TEXT_MODELS as TEXT_MODELS/);
  assert.doesNotMatch(source,/['"]gemini-2\.5-(?:flash|pro)['"]/);
});

test('model-chain text labels every provider fallback as provider-local', () => {
  const text = new FallbackChainViewer().generateText();
  assert.match(text, /Gemini never calls OpenAI, and OpenAI never calls Gemini/);
  assert.match(text, /--- \[Gemini only\] STEP 1:/);
  assert.match(text, /--- \[OpenAI only\] STEP 1:/);
  assert.doesNotMatch(text, /\[Gemini\] \([^\n]+\)\n(?:.|\n)*?\[OpenAI\] \(/);
});
