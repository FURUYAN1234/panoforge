import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeApiKey } from '../src/lib/api-key.js';

test('removes copy-paste zero-width characters but rejects non-ASCII credentials before a request is made', () => {
  assert.equal(normalizeApiKey('  AIzaabc\u200Bdef  '), 'AIzaabcdef');
  assert.throws(() => normalizeApiKey('ＡIzaabcdef'), /ASCII/i);
});
