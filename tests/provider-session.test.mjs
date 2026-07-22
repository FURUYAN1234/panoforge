import test from 'node:test';
import assert from 'node:assert/strict';
import { resetGenerationStateForProviderChange } from '../src/lib/provider-session.js';

test('provider changes discard every generated-image and retry reference', () => {
  const state = {
    inputImageBase64: 'gemini-input', inputImageMime: 'image/png',
    panoBase64: 'gemini-panorama', panoMime: 'image/png', panoDataUrl: 'data:image/png;base64,pano',
    generatedDataUrl: 'data:image/png;base64,input', lastAction: () => {},
    pendingPanoDataUrl: 'data:image/png;base64,pending', pendingPanoFile: { name: 'source.png' }, isDirectView: true,
  };
  resetGenerationStateForProviderChange(state);
  assert.deepEqual(state, {
    inputImageBase64: null, inputImageMime: null, panoBase64: null, panoMime: null, panoDataUrl: null,
    generatedDataUrl: null, lastAction: null, pendingPanoDataUrl: null, pendingPanoFile: null, isDirectView: false,
  });
});
