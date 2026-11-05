import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPerspectiveReference } from '../src/lib/panorama-reference.js';

function fixture() {
  const width = 120, height = 80;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    data.set([x < width / 2 ? 240 : 20, y < height / 2 ? 220 : 10, 80, 255], (y * width + x) * 4);
  }
  return { width, height, data };
}
const at = (data, x, y, width = 360) => [...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4)];

test('a reference occupies its front-facing angle without mirroring or covering unseen directions', () => {
  const source = fixture();
  const before = source.data.slice();
  const result = projectPerspectiveReference(source, { width: 360, height: 180 });
  assert.deepEqual(at(result.anchor, 170, 80), [240, 220, 80, 255]);
  assert.deepEqual(at(result.anchor, 190, 100), [20, 10, 80, 255]);
  for (const [x, y] of [[0, 90], [359, 90], [90, 90], [270, 90], [180, 0], [180, 179]]) {
    assert.equal(at(result.anchor, x, y)[3], 0);
    assert.equal(at(result.mask, x, y)[3], 0);
    assert.deepEqual(at(result.image, x, y), [128, 128, 128, 255]);
  }
  assert.equal(at(result.mask, 170, 80)[3], 255);
  assert.deepEqual(source.data, before);
});

test('projection has a narrow feather and never protects transparent source pixels', () => {
  const source = fixture();
  const result = projectPerspectiveReference(source, { width: 720, height: 360 });
  assert.ok(result.anchor.some((v, i) => i % 4 === 3 && v > 0 && v < 255));
  for (let i = 3; i < result.mask.length; i += 4) {
    if (result.mask[i] === 255) assert.equal(result.anchor[i], 255);
  }
  source.data.fill(0);
  const transparent = projectPerspectiveReference(source, { width: 360, height: 180 });
  assert.equal(transparent.mask.some(v => v !== 0), false);
  assert.equal(transparent.anchor.some(v => v !== 0), false);
});

test('projection refuses invalid images, dimensions and field of view', () => {
  assert.throws(() => projectPerspectiveReference(fixture(), { width: 1536, height: 1024 }), /2:1/);
  assert.throws(() => projectPerspectiveReference(fixture(), { horizontalFov: 180 }), /Invalid/);
  assert.throws(() => projectPerspectiveReference({ width: 20, height: 10, data: new Uint8ClampedArray(3) }), /Invalid/);
});
