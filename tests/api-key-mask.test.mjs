import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('// APIキー管理'), source.indexOf('function resetProviderGenerationSession()'));
const element = () => {
  const classes = new Set();
  return { type: 'password', value: 'dummy-input-only', handlers: {}, attrs: {},
    addEventListener(name, callback) { (this.handlers[name] ||= []).push(callback); },
    dispatch(name, event = {}) { for (const callback of this.handlers[name] || []) callback(event); },
    setAttribute(name, value) { this.attrs[name] = String(value); }, focus() {},
    classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } } };
};
const setup = () => {
  const dom = new Proxy({}, {get(target, name) { return target[name] ||= element(); }});
  const document = element();
  new Function('dom', 'document', 'engine', section)(dom, document, {isReady: () => true});
  return {dom, document};
};

test('typing and pasting mask a previously revealed API field before insertion', () => {
  for (const event of ['paste', 'beforeinput', 'input']) {
    const {dom} = setup();
    dom.apiKeyToggle.dispatch('click');
    assert.equal(dom.apiKeyInput.type, 'text', 'explicit preview remains available');
    dom.apiKeyInput.dispatch(event);
    assert.equal(dom.apiKeyInput.type, 'password', event);
    assert.equal(dom.apiKeyInput.value, 'dummy-input-only', 'masking must preserve the entered value');
  }
});

test('opening, closing and escaping settings reset reveal state', () => {
  for (const action of ['open', 'close', 'outside', 'escape']) {
    const {dom, document} = setup();
    dom.apiKeyToggle.dispatch('click');
    if (action === 'open') dom.apiSettingsBtn.dispatch('click');
    if (action === 'close') dom.apiModalClose.dispatch('click');
    if (action === 'outside') dom.apiModalOverlay.dispatch('click', {target: dom.apiModalOverlay});
    if (action === 'escape') document.dispatch('keydown', {key: 'Escape'});
    assert.equal(dom.apiKeyInput.type, 'password', action);
    assert.equal(dom.apiKeyToggle.attrs['aria-pressed'], 'false');
  }
});
