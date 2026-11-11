import test from 'node:test';
import assert from 'node:assert/strict';
import {PanoramaEngine} from '../src/panorama.js';
test('panorama generation and masked edits never retry provider failures with a retired model',async t=>{
  const engine=new PanoramaEngine();engine.setApiKey('test-only');
  for(const edit of [null,{image:new Blob(['source']),mask:new Blob(['mask'])}]){
    for(const status of [404,429,500]){
      const requests=[];
      const send=t.mock.method(globalThis,'fetch',async (_url,init)=>{
        requests.push(init.body instanceof FormData?init.body.get('model'):JSON.parse(init.body).model);
        return new Response(JSON.stringify({error:{message:'provider unavailable'}}),{status});
      });
      await assert.rejects(engine._callOpenAIImage('unchanged scene','2048x1024',{panorama:true,edit}),/provider unavailable/);
      assert.deepEqual(requests,['gpt-image-2.6-sunburst']);send.mock.restore();
    }
  }
});
