import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../lib/sync-model.mjs';
import * as mockExam from '../lib/mock-exam.mjs';
import * as attempts from '../lib/attempts.mjs';
import * as errors from '../lib/sync-errors.mjs';
import {emptyState} from '../lib/study.mjs';
const questions=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url))).questions;
const [q1,q2]=questions;
const local=()=>({...emptyState(),bookmarks:[q1.id],explanationBookmarks:[q2.id],vocabularyBookmarks:['vocabulary-0123456789abcdef'],memoryBookmarks:['memory-0123456789abcdef'],idiomBookmarks:['束之高閣']});
const code=ts.transpileModule(readFileSync(new URL('../lib/cloud-sync.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function controller(initial,remote=new Map(),sessionJSON=undefined){
 const storage=new Map([['yueri:sync:migrated:v1:account','1']]),timers=new Map();let sequence=0,received;
 const questionSnap=()=>({docs:[...remote].filter(([id])=>!id.startsWith('_mock-')).map(([id,data])=>({id,data:()=>data})),metadata:{fromCache:false}});
 const mockSnap=()=>({docs:[...remote].filter(([id])=>id.startsWith('_mock-')).map(([id,data])=>({id:id.slice(1),data:()=>data})),metadata:{fromCache:false}});
 const sessionSnap=()=>({exists:()=>sessionJSON!==undefined,data:()=>sessionJSON===undefined?undefined:{sessionJSON,revision:1},metadata:{fromCache:false}});
 const firestore={
  getFirestore:()=>({}),collection:(_db,...parts)=>parts.join('/'),doc:(_db,...parts)=>parts.join('/'),serverTimestamp:()=>0,
  onSnapshot:(ref,_options,callback)=>{callback(ref.endsWith('/questions')?questionSnap():ref.endsWith('/study')?mockSnap():sessionSnap());return()=>{};},
  getDocsFromServer:async ref=>ref.endsWith('/study')?mockSnap():questionSnap(),getDocFromServer:async()=>sessionSnap(),
  runTransaction:async(_db,fn)=>fn({get:async ref=>{const key=ref.split('/').at(-1),id=key.startsWith('mock-')?'_'+key:key;return ref.endsWith('/study/session')?sessionSnap():{exists:()=>remote.has(id),data:()=>remote.get(id)};},set:(ref,data)=>{const key=ref.split('/').at(-1),id=key.startsWith('mock-')?'_'+key:key;if(ref.endsWith('/study/session'))sessionJSON=data.sessionJSON;else remote.set(id,data);}}),
 };
 const module={exports:{}};
 vm.runInNewContext(code,{exports:module.exports,module,require:name=>name==='firebase/firestore'?firestore:name==='./firebase-client'?{firebaseAuth:async()=>({currentUser:{uid:'account'},app:{}})}:name==='./sync-model.mjs'?model:name==='./attempts.mjs'?attempts:name==='./mock-exam.mjs'?mockExam:errors,
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

test('mock runs survive cloud transactions, queued stale edits and a second device',async()=>{
 const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url))),qmap=new Map(questions.map(q=>[q.id,q]));
 const state=emptyState(),run=mockExam.createMockRun(bank,[],crypto.randomUUID(),Date.parse('2026-11-16T00:00:00Z'));
 state.mockRuns=[run];const first=controller(emptyState());await first.sync.start();
 first.sync.enqueue(model.stateChanges(emptyState(),state));
 const completed=structuredClone(state);completed.mockRuns[0].papers[0]=mockExam.finishMockPaper({...run.papers[0],startedAt:'2026-11-16T00:00:00Z'},qmap,Date.parse('2026-11-16T00:00:10Z'));
 first.sync.enqueue(model.stateChanges(state,completed));
 first.sync.enqueue(model.stateChanges(emptyState(),state)); // delayed incomplete state must not erase a queued result
 await first.flush();
 assert.ok(first.remote.get('_mock-'+run.id).sessionJSON);
 const second=controller(emptyState(),first.remote,first.sessionJSON);await second.sync.start();
 assert.equal(second.received.mockRuns[0].papers[0].elapsedMs,10000);
 assert.equal(second.received.mockRuns[0].papers[0].remainingMs,3590000);
 first.sync.stop();second.sync.stop();
});
