import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../lib/sync-model.mjs';
import * as attempts from '../lib/attempts.mjs';
import * as errors from '../lib/sync-errors.mjs';
import {emptyState} from '../lib/study.mjs';
const questions=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url))).questions;
const [q1,q2]=questions;
const local=()=>({...emptyState(),bookmarks:[q1.id],explanationBookmarks:[q2.id],vocabularyBookmarks:['vocabulary-0123456789abcdef'],memoryBookmarks:['memory-0123456789abcdef'],idiomBookmarks:['束之高閣']});
const code=ts.transpileModule(readFileSync(new URL('../lib/cloud-sync.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function controller(initial,remote=new Map(),sessionJSON=undefined){
 const storage=new Map([['yueri:sync:migrated:v1:account','1']]),timers=new Map();let sequence=0,received;
 const questionSnap=()=>({docs:[...remote].map(([id,data])=>({id,data:()=>data})),metadata:{fromCache:false}});
 const sessionSnap=()=>({exists:()=>sessionJSON!==undefined,data:()=>sessionJSON===undefined?undefined:{sessionJSON,revision:1},metadata:{fromCache:false}});
 const firestore={
  getFirestore:()=>({}),collection:(_db,...parts)=>parts.join('/'),doc:(_db,...parts)=>parts.join('/'),serverTimestamp:()=>0,
  onSnapshot:(ref,_options,callback)=>{callback(ref.endsWith('/questions')?questionSnap():sessionSnap());return()=>{};},
  getDocsFromServer:async()=>questionSnap(),getDocFromServer:async()=>sessionSnap(),
  runTransaction:async(_db,fn)=>fn({get:async ref=>ref.endsWith('/study/session')?sessionSnap():{exists:()=>remote.has(ref.split('/').at(-1)),data:()=>remote.get(ref.split('/').at(-1))},set:(ref,data)=>{if(ref.endsWith('/study/session'))sessionJSON=data.sessionJSON;else remote.set(ref.split('/').at(-1),data);}}),
 };
 const module={exports:{}};
 vm.runInNewContext(code,{exports:module.exports,module,require:name=>name==='firebase/firestore'?firestore:name==='./firebase-client'?{firebaseAuth:async()=>({currentUser:{uid:'account'},app:{}})}:name==='./sync-model.mjs'?model:name==='./attempts.mjs'?attempts:errors,
 localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},navigator:{onLine:true},window:{addEventListener(){},removeEventListener(){}},document:{addEventListener(){},removeEventListener(){},visibilityState:'visible'},crypto:{randomUUID:()=>`mutation-${++sequence}`},setTimeout:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});
 const sync=new module.exports.CloudSync('account',questions,initial,state=>{received=state;},()=>{});
 return {sync,remote,get received(){return received;},get sessionJSON(){return sessionJSON;},flush:async()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());for(let i=0;i<30;i++)await Promise.resolve();}};
}
test('an already-migrated device repairs all four local bookmark collections and another device receives them',async()=>{
 const first=controller(local());await first.sync.start();
 assert.deepEqual(first.received.bookmarks,[q1.id]);assert.deepEqual(first.received.explanationBookmarks,[q2.id]);
 await first.flush();
 assert.equal(first.remote.get(q1.id).bookmark,true);assert.equal(first.remote.get(q2.id).explanationBookmark,true);
 const second=controller(emptyState(),first.remote,first.sessionJSON);await second.sync.start();
 for(const key of ['bookmarks','explanationBookmarks','vocabularyBookmarks','idiomBookmarks','memoryBookmarks'])assert.deepEqual(second.received[key],local()[key],key);
 first.sync.stop();second.sync.stop();
});
test('old local bookmarks cannot resurrect explicit cloud removals, including queued migration races',async()=>{
 const remote=new Map([[q1.id,{bookmark:false}],[q2.id,{explanationBookmark:false}]]);
 assert.equal(model.bookmarkMigration(local(),remote).length,0);
 const queued={id:'old-migration',docId:q1.id,mode:'migrate',patch:{bookmark:true}};
 assert.equal(model.applyQuestionMutation(remote.get(q1.id),queued).bookmark,false);
 const json=model.applyStudyMutation(undefined,{vocabularyBookmarks:{'vocabulary-0123456789abcdef':false},memoryBookmarks:{'memory-0123456789abcdef':false},idiomBookmarks:{'束之高閣':false}});
 const device=controller(local(),remote,json);await device.sync.start();
 for(const key of ['bookmarks','explanationBookmarks','vocabularyBookmarks','idiomBookmarks','memoryBookmarks'])assert.deepEqual(device.received[key],[]);
 device.sync.stop();
});

test('queued memory operations coalesce per card and persist across a second device',async()=>{
 const first=controller(emptyState());await first.sync.start();
 first.sync.enqueue([{docId:'_session',mode:'update',patch:{memoryBookmarks:{'memory-0123456789abcdef':true}}}]);
 first.sync.enqueue([{docId:'_session',mode:'update',patch:{memoryBookmarks:{'memory-fedcba9876543210':true}}}]);
 first.sync.enqueue([{docId:'_session',mode:'update',patch:{memoryBookmarks:{'memory-0123456789abcdef':false}}}]);
 await first.flush();
 const second=controller(emptyState(),first.remote,first.sessionJSON);await second.sync.start();
 assert.deepEqual(second.received.memoryBookmarks,['memory-fedcba9876543210']);
 first.sync.stop();second.sync.stop();
});
