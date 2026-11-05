import test from 'node:test';
import assert from 'node:assert/strict';
import { PanoramaEngine } from '../src/panorama.js';

test('panorama QA compares the partial reference image alongside the full sphere and centered seam', async t => {
  const engine = new PanoramaEngine();
  engine.setApiKey('sk-test');
  let sent;
  t.mock.method(engine, '_callOpenAIChat', async messages => {
    sent = messages[0].content;
    return '{"verdict":"pass","issues":[]}';
  });
  const image = base64 => ({ base64, mimeType: 'image/png' });
  t.mock.method(engine, '_createPanoramaSeamView', async candidate => image(`perspective-${candidate.base64}`));
  await engine._runSpatialQa(image('whole'), {
    majorObjects: ['one red postbox'], openings: [], architecture: [], lighting: 'three visible lamps', density: 'normal',
  }, image('seam'), image('source'));
  assert.deepEqual(sent.filter(p => p.type === 'image_url').map(p => p.image_url.url),
    ['whole', 'seam', 'perspective-whole', 'source'].map(v => `data:image/png;base64,${v}`));
  assert.match(sent[0].text, /partial reference/i);
  assert.match(sent[0].text, /not.*global.*count/i);
});

test('the spatial inventory is extracted from the source pixels without an intermediate description', async t => {
  const engine = new PanoramaEngine();
  engine.setApiKey('sk-test');
  const calls = [];
  t.mock.method(engine, '_callOpenAIVisionWithFallback', async (...args) => {
    calls.push(args);
    return '{"majorObjects":["one postbox"],"openings":[],"architecture":[],"lighting":"overcast","density":"normal"}';
  });
  t.mock.method(engine, '_callOpenAIChatWithFallback', () => assert.fail('must not replace pixels with a text paraphrase'));
  const ledger = await engine._createSpatialLedger('actual-source', 'image/jpeg');
  assert.deepEqual(calls[0].slice(0, 2), ['actual-source', 'image/jpeg']);
  assert.equal(calls[0][2].responseFormat, 'json_object');
  assert.deepEqual(ledger.majorObjects, ['one postbox']);
});

test('OpenAI expansion carries reference pixels and mask into both initial and corrective edits', async t => {
  const engine = new PanoramaEngine();
  engine.setApiKey('sk-test');
  const reference = { image: new Blob(['projected pixels']), mask: new Blob(['unknown directions']) };
  const sourceCalls = [];
  engine._prepareOpenAIPanoramaReference = async (base64, mimeType) => {
    sourceCalls.push([base64, mimeType]);
    return reference;
  };
  const preserved = [];
  engine._preservePanoramaReference = async (candidate, actual) => {
    assert.equal(actual, reference);
    preserved.push(candidate.base64);
    return { ...candidate, base64: `anchored-${candidate.base64}` };
  };
  t.mock.method(engine, '_createSpatialLedger', async () => ({
    majorObjects: ['one red postbox'], openings: [], architecture: [], lighting: '', density: 'normal',
  }));
  t.mock.method(engine, '_analyzeImageWithVision', async () => 'A station');
  const requests = [];
  t.mock.method(engine, '_callOpenAIImage', async (prompt, size, options) => {
    requests.push({ prompt, size, options });
    assert.equal(options.edit?.image, reference.image, 'reference pixels must reach the image API');
    assert.equal(options.edit?.mask, reference.mask);
    return { base64: `candidate-${requests.length}`, mimeType: 'image/png' };
  });
  t.mock.method(engine, '_splitSwapImage', async base64 => ({ base64: `swap-${base64}`, mimeType: 'image/png' }));
  const qa = [];
  t.mock.method(engine, '_runSpatialQa', async image => {
    qa.push(image.base64);
    return qa.length === 1 ? { verdict: 'retry', issues: ['Broken floor outside the seam'] }
      : { verdict: 'pass', issues: [] };
  });

  const result = await engine.expandToPanorama('original-pixels', 'image/jpeg');
  assert.deepEqual(sourceCalls, [['original-pixels', 'image/jpeg']]);
  assert.deepEqual(qa, ['anchored-candidate-1', 'anchored-candidate-2']);
  assert.deepEqual(preserved, ['candidate-1', 'candidate-2']);
  assert.deepEqual(requests.map(r => r.size), ['2048x1024', '2048x1024']);
  assert.match(requests[1].prompt, /Broken floor outside the seam/);
  assert.equal(result.base64, 'anchored-candidate-2');
});
