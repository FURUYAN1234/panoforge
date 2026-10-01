import test from 'node:test';
import assert from 'node:assert/strict';
import { PanoramaEngine } from '../src/panorama.js';
import { FALLBACK_CHAINS } from '../src/lib/fallback-chain-data.js';

const complete = (content = 'scene result') => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content } }] }) });

test('Sol text/vision requests and legacy fallback preserve their parameters', async () => {
  const original = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const requests = [];
  const deadlines = [];
  globalThis.setTimeout = (callback, ms, ...args) => { deadlines.push(ms); return originalSetTimeout(callback, ms, ...args); };
  globalThis.fetch = async (_url, init) => { requests.push(JSON.parse(init.body)); return complete(); };
  try {
    const engine = new PanoramaEngine(); engine.setApiKey('sk-test');
    assert.equal(await engine._callOpenAIChatWithFallback([{ role: 'user', content: 'scene' }]), 'scene result');
    assert.equal(requests[0].model, 'gpt-6.1-sol');
    assert.equal(requests[0].max_completion_tokens, 32768);
    assert.equal(requests[0].temperature, undefined);
    assert.equal(requests[0].max_tokens, undefined);
    await engine._callOpenAIVisionWithFallback('sample', 'image/png');
    assert.equal(requests[1].model, 'gpt-6.1-sol');
    assert.equal(requests[1].messages[0].content[1].image_url.detail, 'high');
    await engine._callOpenAIChat([], 'gpt-4.1');
    assert.equal(requests[2].temperature, 0.7);
    assert.equal(requests[2].max_completion_tokens, undefined);
    assert.deepEqual(deadlines, [120000, 120000, 25000]);
  } finally { globalThis.fetch = original; globalThis.setTimeout = originalSetTimeout; }
});

test('unavailable Sol falls back to 6 Sol and retries the selection on every new call', async () => {
  const original = globalThis.fetch;
  try {
    for (const operation of ['text', 'vision']) {
      const calls = [];
      globalThis.fetch = async (_url, init) => {
        const model = JSON.parse(init.body).model; calls.push(model);
        return model === 'gpt-6.1-sol'
          ? { ok: false, status: 404, json: async () => ({ error: { message: 'model unavailable' } }) }
          : complete('legacy result');
      };
      const engine = new PanoramaEngine(); engine.setApiKey('sk-test');
      const run = () => operation === 'text' ? engine._callOpenAIChatWithFallback([]) : engine._callOpenAIVisionWithFallback('sample', 'image/png');
      assert.equal(await run(), 'legacy result');
      assert.deepEqual(calls, ['gpt-6.1-sol', 'gpt-6-sol']);
      calls.length = 0;
      await run();
      assert.deepEqual(calls, ['gpt-6.1-sol', 'gpt-6-sol']);
    }
  } finally { globalThis.fetch = original; }
});

test('truncation, refusal, content filtering, auth and quota fail closed without paid fallback', async () => {
  const original = globalThis.fetch;
  try {
    const responses = [
      { ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: 'partial' } }] }) },
      { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { refusal: 'blocked' } }] }) },
      { ok: true, json: async () => ({ choices: [{ finish_reason: 'content_filter', message: { content: 'partial' } }] }) },
      ...[401, 403, 429].map((status) => ({ ok: false, status, json: async () => ({ error: { message: 'blocked' } }) })),
    ];
    for (const response of responses) {
      for (const operation of ['text', 'vision']) {
        const calls = [];
        globalThis.fetch = async (_url, init) => { calls.push(JSON.parse(init.body).model); return response; };
        const engine = new PanoramaEngine(); engine.setApiKey('sk-test');
        await assert.rejects(operation === 'text' ? engine._callOpenAIChatWithFallback([]) : engine._callOpenAIVisionWithFallback('sample', 'image/png'));
        assert.deepEqual(calls, ['gpt-6.1-sol']);
      }
    }
  } finally { globalThis.fetch = original; }
});

test('displayed text and vision fallback chains match the Sol-first runtime', () => {
  for (const id of ['suggest-scene-openai', 'suggest-style-openai', 'step2-analyze-openai']) {
    const ids = FALLBACK_CHAINS.find((chain) => chain.id === id).models.map((model) => model.id);
    assert.deepEqual(ids, ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-sol', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-6-luna', 'gpt-5.6-luna', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o']);
  }
});
