import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {emptyState,validateBackup} from '../lib/study.mjs';
const require=createRequire(new URL('../lib/use-cloud-study.ts',import.meta.url));
const source=readFileSync(new URL('../lib/use-cloud-study.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
const hooks={useState:value=>[value,()=>{}],useRef:value=>({current:value}),useEffect:()=>{}};
new Function('require','module','exports',compiled)(id=>id==='react'?hooks:require(id),module,module.exports);
test('saving and removing an explanation reaches storage before an immediate reload',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),saved=new Map();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(key,value)=>saved.set(key,value)}});
 try{
  const id='115-0-1',key='test-study';let latest=emptyState();
  const cloud=module.exports.useCloudStudy(undefined,null,false,latest,s=>{latest=s;},key);
  cloud.mutate(s=>{s.explanationBookmarks.push(id);});
  assert.deepEqual(validateBackup(JSON.parse(saved.get(key)),new Set([id])).explanationBookmarks,[id]);
  cloud.mutate(s=>{s.explanationBookmarks=[];});
  assert.deepEqual(validateBackup(JSON.parse(saved.get(key)),new Set([id])).explanationBookmarks,[]);
  const wordId='115-1-1234567890abcdef';
  cloud.mutate(s=>{s.vocabularyBookmarks.push(wordId);});
  assert.deepEqual(validateBackup(JSON.parse(saved.get(key)),new Set(['115-1-1'])).vocabularyBookmarks,[wordId]);
  cloud.mutate(s=>{s.vocabularyBookmarks=[];});
  assert.deepEqual(validateBackup(JSON.parse(saved.get(key)),new Set(['115-1-1'])).vocabularyBookmarks,[]);
  const card='memory-0123456789abcdef';
  cloud.replace(s=>({...s,memoryBookmarks:[card]}));
  assert.deepEqual(validateBackup(JSON.parse(saved.get(key)),new Set()).memoryBookmarks,[card]);
  cloud.replace(s=>({...s,memoryBookmarks:[]}));
  assert.deepEqual(validateBackup(JSON.parse(saved.get(key)),new Set()).memoryBookmarks,[]);
  assert.equal(latest.history.length,0);
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
