import test from 'node:test';
import assert from 'node:assert/strict';
import { PanoramaEngine } from '../src/panorama.js';
import { FALLBACK_CHAINS } from '../src/lib/fallback-chain-data.js';
import {
  getOpenAIImageFallbackChain,
} from '../src/lib/openai-image-fallback.js';

test('OpenAI panorama generation prefers GPT Image 2.6 without a retired-model fallback', () => {
  assert.deepEqual(
    getOpenAIImageFallbackChain().map(({ id, quality }) => ({ id, quality })),
    [
      { id: 'gpt-image-2.6-sunburst', quality: 'xhigh' },
    ],
  );
});

test('STEP2 sends 2.6 first and displays the same provider fallback route', async (t) => {
  const engine = new PanoramaEngine();
  engine.setApiKey('sk-test');
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({data:[{b64_json:'dGVzdA=='}]}));
  });

  await engine._callOpenAIImage('panorama', '2048x1024', { panorama: true });
  assert.deepEqual(requests.map(({model,quality}) => [model,quality]), [['gpt-image-2.6-sunburst', 'xhigh']]);
  assert.deepEqual(FALLBACK_CHAINS.find(chain => chain.id === 'step2-openai').models.map(model => model.id),
    ['gpt-image-2.6-sunburst']);
});

test('STEP2 requests 2:1, sends the finished panorama and centered seam to Vision, and retries once', async (t) => {
  const engine = new PanoramaEngine();
  engine.setApiKey('sk-test');
  t.mock.method(engine, '_createSpatialLedger', async () => ({
    majorObjects: [], openings: [], architecture: [], lighting: '', density: 'normal',
  }));
  t.mock.method(engine, '_prepareOpenAIPanoramaReference', async () => ({}));
  t.mock.method(engine, '_preservePanoramaReference', async image => image);
  t.mock.method(engine, '_analyzeImageWithVision', async () => 'A station platform');
  const sizes = [];
  t.mock.method(engine, '_callOpenAIImage', async (_prompt, size, options) => {
    assert.equal(options?.panorama, true);
    sizes.push(size);
    return { base64: `raw-${sizes.length}`, mimeType: 'image/png' };
  });
  t.mock.method(engine, '_splitSwapImage', async (base64, mimeType) => ({
    base64: `swap-${base64}`, mimeType,
  }));
  const qaRequests = [];
  t.mock.method(engine, '_createPanoramaSeamView', async image => ({ ...image, base64: `perspective-${image.base64}` }));
  t.mock.method(engine, '_callOpenAIChat', async (messages, _model, responseFormat) => {
    assert.equal(responseFormat, 'json_object');
    const content = messages[0].content;
    assert.match(content[0].text, /wrap seam is centered/i);
    qaRequests.push(content.slice(1).map(part => part.image_url.url));
    return qaRequests.length === 1
      ? '{"verdict":"retry","issues":["Rail ends against pavement at the wrap seam"]}'
      : '{"verdict":"pass","issues":[]}';
  });

  const result = await engine.expandToPanorama('seed', 'image/png');
  assert.deepEqual(sizes, ['2048x1024', '2048x1024']);
  assert.deepEqual(qaRequests, [1, 2].map(index => [
    `data:image/png;base64,raw-${index}`,
    `data:image/png;base64,swap-raw-${index}`,
    `data:image/png;base64,perspective-raw-${index}`,
    'data:image/png;base64,seed',
  ]));
  assert.equal(result.base64, 'raw-2');

  sizes.length = 0;
  qaRequests.length = 0;
  t.mock.method(engine, '_callOpenAIChat', async () =>
    '{"verdict":"retry","issues":["Broken wrap seam"]}');
  await assert.rejects(engine.expandToPanorama('seed', 'image/png'), error => {
    assert.equal(error.code, 'panorama_quality_rejected');
    assert.match(error.message, /Broken wrap seam/);
    assert.equal(error.panorama.base64, 'raw-2');
    assert.equal(error.seamView.base64, 'swap-raw-2');
    return true;
  });
  assert.deepEqual(sizes, ['2048x1024', '2048x1024']);
});

test('STEP2 rejects a decoded OpenAI image with 3:2 dimensions before canvas processing', async (t) => {
  const engine = new PanoramaEngine();
  t.mock.method(engine, '_createSpatialLedger', async () => ({
    majorObjects: [], openings: [], architecture: [], lighting: '', density: 'normal',
  }));
  t.mock.method(engine, '_analyzeImageWithVision', async () => 'A station platform');
  t.mock.method(engine, '_prepareOpenAIPanoramaReference', async () => ({ anchor: { width: 2048, height: 1024 } }));
  t.mock.method(engine, '_callOpenAIImage', async () => ({ base64: 'raw', mimeType: 'image/png' }));
  t.mock.method(engine, '_runSpatialQa', async () => assert.fail('invalid dimensions reached Vision QA'));
  const originalImage = globalThis.Image;
  t.after(() => { globalThis.Image = originalImage; });
  globalThis.Image = class {
    constructor() {
      this.width = this.naturalWidth = 1536;
      this.height = this.naturalHeight = 1024;
    }
    set src(_url) { queueMicrotask(() => this.onload()); }
  };
  engine.setApiKey('sk-test');

  await assert.rejects(engine.expandToPanorama('seed', 'image/png'), /2:1.*1536×1024/);
});

test('STEP2 edits a local seam defect once using the centered panorama and reinspects the result', async (t) => {
  const engine = new PanoramaEngine();
  engine.setApiKey('sk-test');
  t.mock.method(engine, '_createSpatialLedger', async () => ({
    majorObjects: [], openings: [], architecture: [], lighting: '', density: 'normal',
  }));
  t.mock.method(engine, '_analyzeImageWithVision', async () => 'A wood platform');
  t.mock.method(engine, '_prepareOpenAIPanoramaReference', async () => ({}));
  t.mock.method(engine, '_preservePanoramaReference', async image => image);
  const makeImage = base64 => ({ base64, mimeType: 'image/png' });
  const generate = t.mock.method(engine, '_callOpenAIImage', async () => makeImage('candidate'));
  t.mock.method(engine, '_splitSwapImage', async base64 => makeImage('shifted-' + base64));
  t.mock.method(engine, '_blendCenterSeam', async () => assert.fail('OpenAI must inspect the actual seam before any changes'));
  const edits = [];
  engine._repairOpenAISeam = async (image, issues) => {
    edits.push({ image, issues });
    return makeImage('repaired');
  };
  const inspected = [];
  t.mock.method(engine, '_createPanoramaSeamView', async image => makeImage('perspective-' + image.base64));
  t.mock.method(engine, '_callOpenAIChat', async ([{content}]) => {
    inspected.push(content.slice(1).map(part => part.image_url.url.split(',')[1]));
    return inspected.length === 1
      ? '{"verdict":"retry","issues":["Floor lines terminate at the seam"],"seamOnly":true}'
      : '{"verdict":"pass","issues":[],"seamOnly":false}';
  });

  const result = await engine.expandToPanorama('seed', 'image/png');
  assert.equal(generate.mock.callCount(), 1);
  assert.deepEqual(edits, [{ image: makeImage('shifted-candidate'), issues: ['Floor lines terminate at the seam'] }]);
  assert.deepEqual(inspected, [['candidate', 'shifted-candidate', 'perspective-candidate', 'seed'], ['repaired', 'shifted-repaired', 'perspective-repaired', 'seed']]);
  assert.equal(result.base64, 'repaired');
});

test('seam correction posts both the shifted image and mask as multipart data', async (t) => {
  const engine = new PanoramaEngine();
  engine.setApiKey('sk-test');
  const image = new Blob(['shifted panorama'], { type: 'image/png' });
  const mask = new Blob(['transparent center'], { type: 'image/png' });
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/images/edits');
    assert.equal(init.headers['Content-Type'], undefined);
    assert.equal(init.body.get('model'), 'gpt-image-2.6-sunburst');
    assert.equal(init.body.get('quality'), 'xhigh');
    assert.equal(init.body.get('size'), '2048x1024');
    assert.equal(await init.body.get('image').text(), 'shifted panorama');
    assert.equal(await init.body.get('mask').text(), 'transparent center');
    return new Response(JSON.stringify({data:[{b64_json:'dGVzdA=='}]}));
  });
  await engine._callOpenAIImage('repair the seam', '2048x1024', { panorama: true, edit: { image, mask } });
});
