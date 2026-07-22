import test from 'node:test';
import assert from 'node:assert/strict';
import { FallbackChainViewer } from '../src/components/FallbackChainViewer.js';

test('model-chain text labels every provider fallback as provider-local', () => {
  const text = new FallbackChainViewer().generateText();
  assert.match(text, /Gemini never calls OpenAI, and OpenAI never calls Gemini/);
  assert.match(text, /--- \[Gemini only\] STEP 1:/);
  assert.match(text, /--- \[OpenAI only\] STEP 1:/);
  assert.doesNotMatch(text, /\[Gemini\] \([^\n]+\)\n(?:.|\n)*?\[OpenAI\] \(/);
});
