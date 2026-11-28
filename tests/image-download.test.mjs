import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PanoramaViewer } from '../src/viewer.js';
import { imageDataAsPng } from '../src/lib/image-download.js';

const image = readFileSync(new URL('./fixtures/plain-hd.png', import.meta.url));

function installLinkDom(t) {
  const previousDocument = globalThis.document;
  const attached = new Set();
  const urls = new Map();
  const downloads = [];
  const timers = [];
  t.mock.method(URL, 'createObjectURL', blob => {
    const url = `blob:fixture/${urls.size + 1}`;
    urls.set(url, blob);
    return url;
  });
  t.mock.method(URL, 'revokeObjectURL', url => urls.delete(url));
  t.mock.method(globalThis, 'setTimeout', (fn, delay) => timers.push({ fn, delay }));
  globalThis.document = {
    body: { append: link => attached.add(link) },
    createElement(name) {
      assert.equal(name, 'a');
      return {
        remove() { attached.delete(this); },
        click() {
          assert.ok(attached.has(this), 'download anchor attached to the document');
          assert.match(this.href, /^blob:/);
          downloads.push({ blob: urls.get(this.href), fileName: this.download });
        },
      };
    },
  };
  t.after(() => { globalThis.document = previousDocument; });
  return { attached, urls, timers, downloads };
}

function makeViewer() {
  const viewer = Object.create(PanoramaViewer.prototype);
  const viewport = { width: 1240, height: 860, ratio: 1.75 };
  const camera = { aspect: 1240 / 860, fov: 63, heading: 40, updated: 0, updateProjectionMatrix() { this.updated++; } };
  const scene = {};
  let callback;
  let shouldThrow = false;
  Object.assign(viewer, { scene, camera, renderer: {
    getSize(vector) { return vector.set(viewport.width, viewport.height); },
    getPixelRatio() { return viewport.ratio; },
    setSize(width, height, updateStyle) {
      assert.equal(updateStyle, false);
      Object.assign(viewport, { width, height });
    },
    setPixelRatio(ratio) { viewport.ratio = ratio; },
    render(actualScene, actualCamera) {
      assert.equal(actualScene, scene);
      assert.equal(actualCamera, camera);
      if (shouldThrow) throw new Error('fixture renderer failure');
    },
    domElement: { toBlob(next, mime) {
      assert.deepEqual(viewport, { width: 1920, height: 1080, ratio: 1 });
      assert.equal(camera.aspect, 1920 / 1080);
      assert.equal(mime, 'image/png');
      callback = next;
    } },
  } });
  return { viewer, viewport, camera, complete: blob => callback(blob), failRender: () => { shouldThrow = true; } };
}

test('HD capture requests 1920×1080 and restores the viewer before the PNG is downloaded', async t => {
  const { viewer, viewport, camera, complete } = makeViewer();
  const { downloads, attached, timers, urls } = installLinkDom(t);
  const capture = viewer.captureView();
  assert.deepEqual(viewport, { width: 1240, height: 860, ratio: 1.75 });
  assert.equal(camera.aspect, 1240 / 860);
  assert.equal(camera.fov, 63);
  assert.equal(camera.heading, 40);
  assert.equal(camera.updated, 2);
  complete(new Blob([image], {type:'image/png'}));
  await capture;
  assert.equal(downloads.length, 1);
  assert.match(downloads[0].fileName, /^AI_Panorama_360_capture_1920x1080_\d{14}\.png$/);
  const bytes = Buffer.from(await downloads[0].blob.arrayBuffer());
  assert.deepEqual(bytes, image);
  assert.equal(bytes.readUInt32BE(16), 1920);
  assert.equal(bytes.readUInt32BE(20), 1080);
  assert.equal(attached.size, 0);
  assert.equal(urls.size, 1);
  assert.equal(timers[0].delay, 30_000);
  timers[0].fn();
  assert.equal(urls.size, 0);
});

test('HD capture restores the viewer and reports encoder/render errors without downloading', async t => {
  const { viewer, viewport, camera, complete, failRender } = makeViewer();
  const { downloads } = installLinkDom(t);
  const capture = viewer.captureView();
  complete(null);
  await assert.rejects(capture, /画像をファイル形式に変換できませんでした/);
  failRender();
  await assert.rejects(viewer.captureView(), /fixture renderer failure/);
  assert.deepEqual(viewport, { width: 1240, height: 860, ratio: 1.75 });
  assert.equal(camera.aspect, 1240 / 860);
  assert.equal(camera.fov, 63);
  assert.equal(camera.updated, 4);
  assert.equal(downloads.length, 0);
});

test('source PNG remains byte-identical; invalid data URLs are rejected', async () => {
  const blob = await imageDataAsPng('data:image/png;base64,' + image.toString('base64'));
  assert.equal(blob.type, 'image/png');
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), image);
  await assert.rejects(imageDataAsPng('data:,'), /画像データを読み込めません/);
});

test('JPEG and WebP sources encode PNG at the original size', async t => {
  const sourceImage = globalThis.Image;
  const sourceDocument = globalThis.document;
  t.after(() => { globalThis.Image = sourceImage; globalThis.document = sourceDocument; });
  const loaded = [];
  globalThis.Image = class {
    naturalWidth = 10;
    naturalHeight = 6;
    async decode() { loaded.push(this.src); }
  };
  const encoded = readFileSync(new URL('./fixtures/source-example.png', import.meta.url));
  globalThis.document = {
    createElement(name) {
      assert.equal(name, 'canvas');
      return {
        getContext() { return { drawImage() {} }; },
        toBlob(callback, mime) {
          assert.equal(this.width, 10);
          assert.equal(this.height, 6);
          assert.equal(mime, 'image/png');
          callback(new Blob([encoded], {type:mime}));
        },
      };
    },
  };
  for (const [mime, ext] of [['image/jpeg','jpg'], ['image/webp','webp']]) {
    const input = readFileSync(new URL(`./fixtures/source-example.${ext}`, import.meta.url));
    const dataUrl = `data:${mime};base64,${input.toString('base64')}`;
    const png = await imageDataAsPng(dataUrl);
    assert.equal(loaded.at(-1), dataUrl);
    assert.equal(png.type, 'image/png');
    assert.deepEqual(Buffer.from(await png.arrayBuffer()), encoded);
  }
});
