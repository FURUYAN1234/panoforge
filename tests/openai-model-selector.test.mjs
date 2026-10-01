import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PanoramaEngine } from '../src/panorama.js';
import { OPENAI_MODELS, DEFAULT_OPENAI_MODEL_ID, getOpenAIModelRoute, formatOpenAIModelPrice, formatOpenAIModelRouteStatus } from '../src/lib/openai-models.js';

test('catalog matches all canonical Nano IDs and prices while the product copy stays panorama-specific', () => {
  const canonical = JSON.parse(readFileSync(new URL('../../nano-banana-pro/src/config/openai-scenario-models.json', import.meta.url)));
  assert.deepEqual(OPENAI_MODELS.map(({ id, inputPriceUsdPerM, outputPriceUsdPerM }) => ({ id, inputPriceUsdPerM, outputPriceUsdPerM })),
    canonical.models.map(({ id, inputPriceUsdPerM, outputPriceUsdPerM }) => ({ id, inputPriceUsdPerM, outputPriceUsdPerM })));
  assert.equal(OPENAI_MODELS.length, 11);
  assert.equal(OPENAI_MODELS[0].id, 'gpt-6-astra');
  assert.equal(DEFAULT_OPENAI_MODEL_ID, 'gpt-6.1-sol');
  assert.equal(getOpenAIModelRoute()[0].id, DEFAULT_OPENAI_MODEL_ID);
  assert.equal(getOpenAIModelRoute().some((model) => model.id === 'gpt-6-astra'), false);
  assert.doesNotMatch(OPENAI_MODELS.map((model) => model.description).join(' '), /4コマ|シナリオ/);
  assert.match(formatOpenAIModelPrice('gpt-6.1-sol'), /入力 \$2 \/ 出力 \$10/);
  assert.throws(() => getOpenAIModelRoute('gpt-image-2'), /Unknown/);
});

test('every selectable model reaches real text and vision request payloads and route status', async () => {
  const original = globalThis.fetch;
  try {
    const requests = [];
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      requests.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'scene result' } }] }) };
    };
    for (const model of OPENAI_MODELS) {
      const engine = new PanoramaEngine(); engine.setApiKey('sk-test'); engine.setOpenAIModel(model.id);
      const events = []; engine.onOpenAIModelRoute = (event) => events.push(event);
      await engine._callOpenAIChatWithFallback([]);
      await engine._callOpenAIVisionWithFallback('sample', 'image/png');
      for (const request of requests.slice(-2)) {
        assert.equal(request.model, model.id);
        if (/^gpt-(?:6|5\.6)/.test(model.id)) {
          assert.equal(request.temperature, undefined);
          assert.equal(request.max_completion_tokens, 32768);
        } else {
          assert.equal(request.temperature, 0.7);
          assert.equal(request.max_completion_tokens, undefined);
        }
      }
      assert.deepEqual(events.filter((event) => event.phase !== 'idle').map(({ workflow, phase, modelId }) => `${workflow}:${phase}:${modelId}`),
        [`text:trying:${model.id}`, `text:adopted:${model.id}`, `vision:trying:${model.id}`, `vision:adopted:${model.id}`]);
      assert.match(formatOpenAIModelRouteStatus(events[0]), /試行中/);
      assert.match(formatOpenAIModelRouteStatus(events[1]), /採用/);
    }
  } finally { globalThis.fetch = original; }
});

test('Luna failure moves downward and selection is locked during a route', async () => {
  const original = globalThis.fetch;
  const calls = [];
  try {
    const engine = new PanoramaEngine(); engine.setApiKey('sk-test'); engine.setOpenAIModel('gpt-6-luna');
    const events = []; engine.onOpenAIModelRoute = (event) => events.push(event);
    globalThis.fetch = async (_url, init) => {
      const { model } = JSON.parse(init.body); calls.push(model);
      assert.throws(() => engine.setOpenAIModel('gpt-6-astra'), /処理中/);
      return model === 'gpt-6-luna'
        ? { ok: false, status: 404, json: async () => ({ error: { message: 'unavailable' } }) }
        : { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'lower result' } }] }) };
    };
    await engine._callOpenAIChatWithFallback([]);
    assert.deepEqual(calls, ['gpt-6-luna', 'gpt-5.6-luna']);
    const adopted = events.find((event) => event.phase === 'adopted');
    assert.deepEqual(adopted.attemptedModels, calls);
    assert.match(formatOpenAIModelRouteStatus(adopted), /選択 gpt-6-luna \/ 試行 gpt-6-luna → gpt-5.6-luna \/ 採用 gpt-5.6-luna/);
    assert.equal(engine.openAIRouteCount, 0);
    assert.throws(() => engine.setOpenAIModel('unknown'), /Unknown/);
    engine.setOpenAIModel('gpt-4o');
    assert.deepEqual(getOpenAIModelRoute('gpt-4o').map((model) => model.id), ['gpt-4o']);
  } finally { globalThis.fetch = original; }
});

test('OpenAI selection does not affect Gemini scene/style requests or invoke OpenAI', async () => {
  const original = globalThis.fetch;
  const engine = new PanoramaEngine(); engine.setApiKey('AIza-test'); engine.setOpenAIModel('gpt-6-astra');
  const geminiCalls = [];
  engine._callWithFallback = async (models, _kind, request) => {
    geminiCalls.push({ models, request });
    return { candidates: [{ content: { parts: [{ text: '森と湖の景色' }] } }] };
  };
  globalThis.fetch = async () => { throw new Error('Unexpected OpenAI invocation'); };
  try {
    assert.equal(await engine.suggestScene(), '森と湖の景色');
    assert.equal(await engine.suggestStyle('森'), '森と湖の景色');
    assert.equal(geminiCalls.length, 2);
    assert.equal(geminiCalls.every((call) => call.models.every((model) => model.id.startsWith('gemini-'))), true);
  } finally { globalThis.fetch = original; }
});

test('selector is OpenAI-only with explicit image boundary and accessible per-workflow statuses', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(html, /id="openai-model-panel" class="glass-card hidden"/);
  assert.match(html, /label[^>]*for="openai-model-select"/);
  assert.match(html, /id="openai-text-model-status" role="status" aria-live="polite"/);
  assert.match(html, /id="openai-vision-model-status" role="status" aria-live="polite"/);
  assert.match(html, /画像生成は専用の画像モデル/);
  assert.match(main, /openaiModelPanel\.classList\.toggle\('hidden', engineType !== 'openai'\)/);
  assert.match(main, /engine\.setOpenAIModel\(dom\.openaiModelSelect\.value\)/);
});
