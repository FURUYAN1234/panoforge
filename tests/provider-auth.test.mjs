import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PanoramaEngine } from '../src/panorama.js';
import { classifyGeminiSdkAccessError, verifyApiKey } from '../src/lib/api-key.js';
import { createAiOperationManager } from '../src/lib/aiOperation.js';

const invalid = () => Response.json({ error: { code: 400, status:'INVALID_ARGUMENT',
  message:'API key not valid. fixture-only', details:[{reason:'API_KEY_INVALID'}] } }, {status:400});
const denied = () => Response.json({error:{status:'PERMISSION_DENIED'}}, {status:403});

test('non-generative API checks distinguish invalid, restricted, quota, and transport failures', async t => {
  let reply = () => Response.json({ models: [] });
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    requests.push(url);
    assert.ok(!init.method || init.method === 'GET');
    assert.equal(init.body, undefined);
    assert.ok(init.headers['x-goog-api-key'] || init.headers.Authorization);
    return reply();
  });
  assert.equal(await verifyApiKey('gemini', 'fixture-key'), true);
  reply = invalid;
  await assert.rejects(verifyApiKey('gemini', 'fixture-only'), error =>
    error.code === 'API_KEY_REJECTED' && !error.message.includes('fixture-only'));
  reply = denied;
  assert.equal(await verifyApiKey('gemini', 'fixture-key'), false);
  assert.equal(await verifyApiKey('openai', 'sk-fixture-key'), false);
  reply = () => Response.json({error:{code:'insufficient_quota'}}, {status:429});
  await assert.rejects(verifyApiKey('openai', 'sk-fixture-key'), /利用上限/);
  reply = () => { throw new TypeError('network fixture'); };
  await assert.rejects(verifyApiKey('gemini', 'fixture-key'), /通信環境/);
  assert.ok(requests.every(url => url.endsWith('/models') && !url.includes('?key=')));
  const sdk = Object.assign(new Error(JSON.stringify(await invalid().json())), {status:400});
  assert.equal(classifyGeminiSdkAccessError(sdk).code, 'API_KEY_REJECTED');
});

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const wiring = main.slice(main.indexOf('// APIキー管理'), main.indexOf('function resetProviderGenerationSession()'));
const element = () => {
  const classes = new Set();
  const callbacks = new Map();
  return {
    value: '', disabled: false, type: 'password', textContent:'', title:'',
    addEventListener(name, fn) { callbacks.set(name, fn); },
    dispatch(type, params) { return callbacks.get(type)?.(params); },
    setAttribute() {}, focus() {},
    classList: {
      add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
    },
  };
};

test('actual settings handlers preserve the opened panorama and draft across rejected and corrected keys', async t => {
  const dom = new Proxy({}, { get(target, name) { return target[name] ||= element(); } });
  const document = element();
  const engine = new PanoramaEngine();
  const source = { image:'synthetic-6144x3072', viewport:{ yaw:30, fov:67 }, model:'gpt-6-luna' };
  const state = { appLocked: true, activeProvider: null, ...source };
  let reply = invalid;
  const fetch = t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /\/models$/);
    return reply();
  });
  const actual = new Function('dom','document','engine','aiOperations','state','setAppLocked',
    'syncEmergencyWorkspace','updateButtons','resetProviderGenerationSession',
    wiring + '\nreturn { handleRejectedApiKey };')(dom, document, engine, createAiOperationManager(),
    state, value => { state.appLocked = value; }, () => {}, () => {}, () => { throw new Error('original would be discarded'); });
  dom.apiKeyInput.value = 'fixture-invalid';
  await dom.apiModalApply.dispatch('click');
  assert.equal(engine.isReady(), false);
  assert.equal(state.appLocked, true);
  assert.match(dom.apiKeyFeedback.textContent, /GeminiがAPIキーを受け付けませんでした/);

  reply = denied;
  dom.apiKeyInput.value = 'fixture-restricted';
  await dom.apiModalApply.dispatch('click');
  assert.equal(state.appLocked, false);
  assert.equal(engine.isReady(), true);
  assert.equal(dom.apiKeyStatus.classList.contains('connected'), false);
  assert.match(dom.apiStatusText.textContent, /キー未確認/);

  actual.handleRejectedApiKey(Object.assign(new Error('APIキーエラー'), {code:'API_KEY_REJECTED'}));
  assert.equal(engine.isReady(), false);
  assert.match(dom.apiStatusText.textContent, /キー要確認/);
  assert.equal(dom.apiModalOverlay.classList.contains('hidden'), false);
  assert.equal(state.appLocked, false);
  dom.apiModalClose.dispatch('click');
  assert.equal(dom.apiModalOverlay.classList.contains('hidden'), true);

  reply = () => Response.json({models:[]});
  dom.apiKeyInput.value = 'fixture-corrected';
  const submit = dom.apiModalApply.dispatch('click');
  assert.equal(dom.apiModalApply.disabled, true);
  await submit;
  assert.equal(dom.apiKeyStatus.classList.contains('connected'), true);
  assert.equal(engine.isReady(), true);
  assert.deepEqual({image:state.image,viewport:state.viewport,model:state.model}, source);
  assert.equal(fetch.mock.callCount(), 3);
});
