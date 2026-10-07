import test from 'node:test';
import assert from 'node:assert/strict';
import { PanoramaEngine } from '../src/panorama.js';
import { FALLBACK_CHAINS } from '../src/lib/fallback-chain-data.js';

test('image creation and panorama repair send Nano Banana 2.1 through Interactions with references intact', async () => {
  const requests = [];
  const engine = new PanoramaEngine();
  engine.activeEngine = 'gemini';
  engine.geminiClient = { interactions: { create: async request => {
    requests.push(request);
    return {status:'completed', steps:[{content:[{type:'image',data:'cmVzdWx0',mime_type:'image/jpeg'}]}]};
  } } };
  assert.deepEqual(await engine.generateImage('Quiet library','watercolor'), {base64:'cmVzdWx0',mimeType:'image/jpeg'});
  await engine._regenerateForSpatialIssues('c291cmNl','image/png',{majorObjects:[],openings:[],architecture:[],density:'normal'},['seam mismatch']);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.model, 'gemini-nano-banana-2.1');
    assert.equal(request.response_format.type, 'image');
    assert.equal(request.contents, undefined);
  }
  assert.equal(requests[0].input.some(part => part.type === 'image'), false);
  assert.deepEqual(requests[1].input[0], {type:'image',mime_type:'image/png',data:'c291cmNl'});
  for (const id of ['step1-gemini','step2-gemini']) {
    assert.deepEqual(FALLBACK_CHAINS.find(c => c.id === id).models.map(m => m.id), ['gemini-nano-banana-2.1']);
  }
});

test('missing image never succeeds or switches to the retired image model', async () => {
  let calls = 0;
  const engine = new PanoramaEngine();
  engine.activeEngine = 'gemini';
  engine.geminiClient = {interactions:{create:async () => {calls++; return {status:'completed',steps:[]};}}};
  await assert.rejects(engine.generateImage('library','ink'));
  assert.equal(calls, 1);
  assert.equal(engine.lastSuccessImageModel, null);
});
