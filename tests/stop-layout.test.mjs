import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('the single emergency stop stays in the top toolbar above the progress overlay',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const header=html.match(/<header\b[^>]*id="app-header"[^>]*>[\s\S]*?<\/header>/)[0];
 assert.match(header,/class="header-actions"[\s\S]*?id="stop-ai"[\s\S]*?class="header-left"/);
 assert.equal((html.match(/id="stop-ai"/g)||[]).length,1);
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 const panelLayer=Number(css.match(/#processing-overlay\s*\{[^}]*z-index:(\d+)/)[1]);
 const headerLayer=Number(css.match(/#processing-overlay:not\(\.hidden\)\) #app-header\s*\{[^}]*z-index:(\d+)/)[1]);
 assert.ok(headerLayer>panelLayer,'the header stacking context itself must be above the overlay');
 assert.match(css,/\.header-actions,[^{]+\{[^}]*flex-wrap:wrap/);
 assert.doesNotMatch(css,/--ai-stop-space/);
});
test('API setup hides the emergency control unless an existing workflow is active',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const start=source.indexOf('function syncEmergencyWorkspace()');
 const fn=source.slice(start,source.indexOf('\n}',start)+2);
 const button={hidden:true};
 let ready=false,active=false;
 const context=vm.createContext({engine:{isReady:()=>ready},aiOperations:{state:()=>({active})},document:{getElementById:()=>button}});
 vm.runInContext(fn,context);
 vm.runInContext('syncEmergencyWorkspace()',context);assert.equal(button.hidden,true);
 ready=true;vm.runInContext('syncEmergencyWorkspace()',context);assert.equal(button.hidden,false);
 ready=false;active=true;vm.runInContext('syncEmergencyWorkspace()',context);assert.equal(button.hidden,false);
});
