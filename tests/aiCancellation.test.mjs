import {formatOpenAIModelRouteStatus} from '../src/lib/openai-models.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createAiOperationManager,abortable} from '../src/lib/aiOperation.js';
let PanoramaEngine;
if(process.env.PANO_BASELINE){
 let source=execFileSync('git',['show','HEAD:src/panorama.js'],{encoding:'utf8'});
 source=source.replace(/from '([^']+)'/g,(_all,path)=>`from '${path.startsWith('.')?new URL('../src/'+path,import.meta.url).href:import.meta.resolve(path)}'`);
 ({PanoramaEngine}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')));
}else({PanoramaEngine}=await import('../src/panorama.js'));

test('OpenAI stop aborts active request and prevents another fallback model',async()=>{
 const controller=new AbortController(),engine=new PanoramaEngine();engine.setApiKey('sk-test-cancel');engine.requestSignal=controller.signal;
 const original=globalThis.fetch;let calls=0,signal,finish;
 globalThis.fetch=async(_url,init)=>{calls++;signal=init.signal;if(calls>1)return Response.json({error:{message:'temporary'}},{status:503});return new Promise(resolve=>{finish=resolve;});};
 try{const pending=engine._callOpenAIChatWithFallback([{role:'user',content:'test'}]);await new Promise(r=>setImmediate(r));controller.abort();finish(Response.json({error:{message:'temporary'}},{status:503}));await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(signal.aborted,true);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});
for(const image of [false,true])test(`Gemini ${image?'image Interactions':'text'} stop passes SDK signal and forbids late fallback`,async()=>{
 const controller=new AbortController(),engine=new PanoramaEngine();engine.requestSignal=controller.signal;let calls=0,signal,finish;
 const request=async(...args)=>{calls++;signal=image?args[1].signal:args[0].config.abortSignal;return new Promise(resolve=>finish=resolve);};
 engine.geminiClient={models:{generateContent:request},interactions:{create:request}};
 const pending=engine._callWithFallback([{id:'test-model',label:'test model'},{id:'next-model',label:'next'}],image?'image':'text',{contents:[{parts:[{text:'test'}]}],config:image?{responseModalities:['IMAGE']}:{}});
 await new Promise(r=>setImmediate(r));controller.abort();await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(signal.aborted,true);finish({});await new Promise(r=>setImmediate(r));assert.equal(calls,1);
});
test('normal fresh operation succeeds; old cleanup and output cannot modify its state',async()=>{
 const manager=createAiOperationManager();assert.equal(manager.state().active,false);const old=manager.begin();let release;const pending=abortable(new Promise(r=>release=r),old.signal);manager.stop();await assert.rejects(pending,e=>e.name==='AbortError');const next=manager.begin();old.finish();assert.equal(manager.state().active,true);release('late');await new Promise(r=>setImmediate(r));assert.equal(await abortable(Promise.resolve('normal'),next.signal),'normal');next.finish();assert.deepEqual(manager.state(),{active:false,stopped:false});
});
test('fresh OpenAI engine context succeeds after old context was canceled',async()=>{
 const manager=createAiOperationManager(),engine=new PanoramaEngine();engine.setApiKey('sk-test-cancel');
 const old=manager.begin(),oldContext=engine.forOperation(old);manager.stop();old.finish();const fresh=manager.begin(),context=engine.forOperation(fresh);
 const original=globalThis.fetch;globalThis.fetch=async(_url,init)=>{assert.equal(init.signal,fresh.signal);return Response.json({choices:[{finish_reason:'stop',message:{content:'normal fresh result'}}]});};
 try{await assert.rejects(oldContext._callOpenAIChat([{role:'user',content:'old'}]),e=>e.name==='AbortError');assert.equal(await context._callOpenAIChat([{role:'user',content:'new'}]),'normal fresh result');fresh.finish();}finally{globalThis.fetch=original;}
});

for (const workflow of ['text', 'vision']) test(`${workflow} route reports cancellation with model metadata, blocks late output, and fresh run can adopt`, () => {
 const manager=createAiOperationManager(),engine=new PanoramaEngine(),events=[];
 engine.onOpenAIModelRoute=event=>events.push(event);
 const op=manager.begin(),api=engine.forOperation(op);
 const route={workflow,phase:'trying',modelId:'gpt-6-luna',selectedModelId:'gpt-6-luna',attemptedModels:['gpt-6-luna']};
 api._notifyOpenAIModelRoute(workflow,'trying',route.modelId,route);
 manager.stop();
 assert.deepEqual(events.at(-1),{...route,phase:'cancelled'});
 assert.throws(()=>api._notifyOpenAIModelRoute(workflow,'adopted',route.modelId),e=>e.name==='AbortError');
 const fresh=manager.begin(),freshApi=engine.forOperation(fresh);
 freshApi._notifyOpenAIModelRoute(workflow,'trying',route.modelId,route);
 freshApi._notifyOpenAIModelRoute(workflow,'adopted',route.modelId);
 op.finish();assert.equal(manager.state().active,true);
 assert.equal(events.at(-1).phase,'adopted');fresh.finish();
});

test('cancelled route display preserves selected and attempted models and does not say trying',()=>{
 const text=formatOpenAIModelRouteStatus({workflow:'text',phase:'cancelled',modelId:'gpt-6-luna',selectedModelId:'gpt-6-luna',attemptedModels:['gpt-6-luna']});
 assert.match(text,/選択 gpt-6-luna/);assert.match(text,/試行 gpt-6-luna/);assert.match(text,/中断 gpt-6-luna/);assert.doesNotMatch(text,/試行中/);
});
