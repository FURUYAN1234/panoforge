import test from 'node:test';
import assert from 'node:assert/strict';
import { PanoramaEngine } from '../src/panorama.js';

test('real engine and installed SDK omit the browser-rejected revision header', async () => {
  const saved = globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,init) => {
    calls.push({url:String(url),headers:[...new Headers(init.headers).keys()],body:JSON.parse(init.body)});
    return new Response(JSON.stringify({id:'test',status:'completed',steps:[{content:[{type:'image',data:'cmVzdWx0',mime_type:'image/jpeg'}]}]}),{headers:{'content-type':'application/json'}});
  };
  try {
    const engine=new PanoramaEngine();
    engine.setApiKey('test-only');
    const result=await engine.generateImage('library','ink');
    assert.equal(calls[0].url,'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(calls[0].headers.includes('api-revision'),false);
    assert.equal(calls[0].headers.includes('x-goog-api-key'),true);
    assert.equal(result.base64,'cmVzdWx0');
  } finally {globalThis.fetch=saved;}
});
