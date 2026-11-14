import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('emergency stop is outside filtered header stacking context and has viewport-safe sizing',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const header=html.match(/<header\b[^>]*id="app-header"[^>]*>[\s\S]*?<\/header>/)[0];
 assert.doesNotMatch(header,/id="stop-ai"/,'header backdrop-filter traps even a high-z-index stop behind the processing overlay');
 assert.equal((html.match(/id="stop-ai"/g)||[]).length,1);
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 const rule=css.match(/\.ai-emergency-stop\s*\{[^}]+\}/)[0];
 assert.match(rule,/top:max\(/,'right-top position must not depend on a fixed header height');
 assert.doesNotMatch(rule,/top:auto|bottom:max/);
 assert.match(css,/body\.ai-workspace-ready\s*\{[^}]*padding-top:\s*var\(--ai-stop-space\)/);
 assert.match(rule,/max-width\s*:/,'a narrow viewport must constrain the entire button');
 assert.match(rule,/box-sizing\s*:\s*border-box/,'padding and border must stay within the width limit');
});
import vm from 'node:vm';
test('API gate has no stop band, but an active existing workflow retains emergency access',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');const start=source.indexOf('function syncEmergencyWorkspace()');const end=source.indexOf("document.getElementById('stop-ai')",start+40);const fn=source.slice(start,source.indexOf('\n}',start)+2);
 const button={hidden:true};let readyClass=false,ready=false,active=false;
 const context=vm.createContext({engine:{isReady:()=>ready},aiOperations:{state:()=>({active})},document:{body:{classList:{toggle:(_name,value)=>readyClass=value}},getElementById:()=>button}});vm.runInContext(fn,context);
 vm.runInContext('syncEmergencyWorkspace()',context);assert.equal(button.hidden,true);assert.equal(readyClass,false);
 ready=true;vm.runInContext('syncEmergencyWorkspace()',context);assert.equal(button.hidden,false);assert.equal(readyClass,true);
 ready=false;active=true;vm.runInContext('syncEmergencyWorkspace()',context);assert.equal(button.hidden,false);assert.equal(readyClass,true);
});
