import assert from 'node:assert/strict';
import test from 'node:test';

import { OPENAI_IMAGE_TIMEOUT_SECONDS } from '../src/lib/processing-timeout.js';

test('OpenAI processing overlay does not preempt the 600-second image request timeout', () => {
  assert.equal(OPENAI_IMAGE_TIMEOUT_SECONDS, 600);
});
