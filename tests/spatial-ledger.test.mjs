import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSpatialLedgerPrompt,
  parseSpatialLedger,
  parseSpatialQa,
} from '../src/lib/spatial-ledger.js';

test('spatial ledger prompt requires a compact scene inventory instead of free-form taste', () => {
  const prompt = buildSpatialLedgerPrompt();

  assert.match(prompt, /majorObjects/i);
  assert.match(prompt, /openings/i);
  assert.match(prompt, /lighting/i);
  assert.match(prompt, /JSON only/i);
});

test('parses a bounded spatial ledger and removes duplicate inventory entries', () => {
  const ledger = parseSpatialLedger(JSON.stringify({
    majorObjects: ['round table', 'round table', 'blue sofa'],
    openings: ['arched doorway'],
    architecture: ['wooden floor', 'exposed beams'],
    lighting: 'warm window light from the left',
    density: 'sparse',
  }));

  assert.deepEqual(ledger.majorObjects, ['round table', 'blue sofa']);
  assert.equal(ledger.density, 'sparse');
  assert.equal(ledger.lighting, 'warm window light from the left');
});

test('accepts a JSON object returned inside a model code fence', () => {
  const ledger = parseSpatialLedger('```json\n{"majorObjects":["table"],"openings":[],"architecture":[],"lighting":"warm","density":"normal"}\n```');

  assert.deepEqual(ledger.majorObjects, ['table']);
});

test('fails closed when the semantic panorama QA response is malformed or rejects the panorama', () => {
  assert.throws(() => parseSpatialQa('not JSON'), /valid JSON/i);
  assert.deepEqual(parseSpatialQa(JSON.stringify({
    verdict: 'retry',
    issues: ['duplicate chair', 'doorway breaks at seam'],
  })), {
    verdict: 'retry',
    issues: ['duplicate chair', 'doorway breaks at seam'],
  });
});
