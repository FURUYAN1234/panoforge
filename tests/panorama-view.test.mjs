import test from 'node:test';
import assert from 'node:assert/strict';
import * as projection from '../src/lib/panorama-reference.js';

test('perspective seam inspection joins the last and first panorama columns without mirroring', () => {
  const width = 360, height = 180;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    data.set([x >= 180 ? 240 : 20, y < 90 ? 220 : 10, 80, 255], (y * width + x) * 4);
  }
  const before = data.slice();
  const result = projection.projectPanoramaView({ width, height, data }, { width: 101, height: 101, yaw: 180 });
  const at = (x, y) => [...result.data.slice((y * 101 + x) * 4, (y * 101 + x) * 4 + 4)];
  assert.deepEqual(at(20, 20), [240, 220, 80, 255]);
  assert.deepEqual(at(80, 80), [20, 10, 80, 255]);
  assert.ok(at(50, 50)[0] > 20 && at(50, 50)[0] < 240, 'bilinear filtering wraps across the seam');
  assert.deepEqual(data, before);
  assert.deepEqual(projection.projectPanoramaView({ width, height, data }, { width: 101, height: 101, yaw: -540 }).data, result.data);
  assert.throws(() => projection.projectPanoramaView({ width: 300, height, data }), /Invalid/);
  assert.throws(() => projection.projectPanoramaView({ width, height, data }, { horizontalFov: 180 }), /Invalid/);
});
