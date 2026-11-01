import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyState,recordAnswer,validateBackup,mergeStates} from '../lib/study.mjs';
import {stateChanges,applyQuestionMutation,migrationChanges,cloudState,applyStudyMutation,readStudyMetadata,canCoalesceStudyMutations} from '../lib/sync-model.mjs';
const questions=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url))).questions;
const q=questions.find(q=>q.id===q.id);
const mutation=(patch,id='m1',mode='update')=>({id,docId:q.id,patch,mode});
test('two devices merge different fields; removing bookmark and clearing note remain removed',()=>{
 let remote=applyQuestionMutation({},mutation({bookmark:true,note:'舊筆記'}));
 remote=applyQuestionMutation(remote,mutation({bookmark:false},'phone'));
 remote=applyQuestionMutation(remote,mutation({note:'新筆記'},'desktop'));
 let state=cloudState(new Map([[q.id,remote]]),null,questions);assert.equal(state.bookmarks.length,0);assert.equal(state.notes[q.id],'新筆記');
 remote=applyQuestionMutation(remote,mutation({note:''},'clear'));
 const old=emptyState();old.bookmarks=[q.id];old.notes[q.id]='舊筆記';
 assert.equal(migrationChanges(old,new Map([[q.id,remote]]),true).length,0);
});
test('simultaneous answers are counted once per event and retried mutation is idempotent',()=>{
 const a=emptyState(),b=emptyState();recordAnswer(a,q,q.accepted[0]==='A'?['B']:['A'],'2026-10-18T10:00:00Z');recordAnswer(b,q,q.accepted[0].split(''),'2026-10-18T10:00:01Z');
 const ma={...stateChanges(emptyState(),a)[0],id:'device-a'},mb={...stateChanges(emptyState(),b)[0],id:'device-b'};
 let remote=applyQuestionMutation({},ma);remote=applyQuestionMutation(remote,mb);remote=applyQuestionMutation(remote,ma);
 assert.equal(remote.record.attempts,2);assert.equal(remote.history.length,2);assert.equal(remote.wrong.active,true);
 // A correct retry after receiving the shared wrong answer marks it mastered.
 const state=cloudState(new Map([[q.id,remote]]),null,questions),next=structuredClone(state);recordAnswer(next,q,q.accepted[0].split(''),'2026-10-18T10:00:02Z');
 remote=applyQuestionMutation(remote,{...stateChanges(state,next)[0],id:'retry'});assert.equal(remote.record.attempts,3);assert.equal(remote.wrong.active,false);
});
test('pending offline edits overlay incoming cloud state until acknowledged',()=>{
 const remote=new Map([[q.id,{bookmark:true,note:'雲端筆記'}]]);
 const pending=[mutation({bookmark:false,note:'離線修改'})];
 const s=cloudState(remote,null,questions,pending);assert.deepEqual(s.bookmarks,[]);assert.equal(s.notes[q.id],'離線修改');
});
test('first-device migration preserves historical attempts without doubling them',()=>{
 const s=emptyState();recordAnswer(s,q,q.accepted[0]==='A'?['B']:['A'],'2026-10-18T10:00:00Z');s.records[q.id].attempts=9;s.bookmarks=[q.id];
 const migrations=migrationChanges(s,new Map(),false).map((m,i)=>({...m,id:`migration-${i}`}));
 let remote={};for(const m of migrations)if(m.docId===q.id)remote=applyQuestionMutation(remote,m);
 assert.equal(remote.record.attempts,9);assert.equal(remote.bookmark,true);
 assert.equal(applyQuestionMutation(remote,migrations[0]).record.attempts,9);
});
test('session choices and graded progress can resume on another device',()=>{
 const s=emptyState();s.session={ids:[q.id],index:0,title:'接續練習',choices:{[q.id]:q.accepted[0]==='A'?['B']:['A']},checked:{[q.id]:false}};
 const m=stateChanges(emptyState(),s).find(m=>m.docId==='_session');
 const restored=cloudState(new Map(),m.patch.sessionJSON,questions);
 assert.deepEqual(restored.session,s.session);
});

test('explanation bookmarks sync independently and removal is not revived by stale migration',()=>{
 const before=emptyState(),after=emptyState();after.explanationBookmarks=[q.id];
 const changes=stateChanges(before,after);assert.equal(changes.length,1);assert.deepEqual(changes[0].patch,{explanationBookmark:true});
 let remote=applyQuestionMutation({bookmark:true,note:'keep'}, {...changes[0],id:'explanation-add'});
 let state=cloudState(new Map([[q.id,remote]]),null,questions);
 assert.deepEqual(state.explanationBookmarks,[q.id]);assert.deepEqual(state.bookmarks,[q.id]);assert.equal(state.history.length,0);
 const removed=structuredClone(state);removed.explanationBookmarks=[];
 const removal={...stateChanges(state,removed)[0],id:'explanation-remove'};
 assert.deepEqual(removal.patch,{explanationBookmark:false});
 assert.deepEqual(cloudState(new Map([[q.id,remote]]),null,questions,[removal]).explanationBookmarks,[]);
 remote=applyQuestionMutation(remote,removal);
 assert.deepEqual(cloudState(new Map([[q.id,remote]]),null,questions).explanationBookmarks,[]);
 assert.equal(migrationChanges(after,new Map([[q.id,remote]]),true).length,0);
 assert.equal(remote.bookmark,true);assert.equal(remote.note,'keep');
});
test('old backups still load and new backups merge explanation collections without duplication',()=>{
 const known=new Set(questions.map(q=>q.id)),old=emptyState();delete old.explanationBookmarks;
 assert.deepEqual(validateBackup(old,known).explanationBookmarks,[]);
 const newer=emptyState();newer.explanationBookmarks=[q.id,q.id,'unknown'];
 const safe=validateBackup(newer,known);assert.deepEqual(safe.explanationBookmarks,[q.id]);
 assert.deepEqual(mergeStates(safe,safe).explanationBookmarks,[q.id]);
 assert.equal(safe.history.length,0);
});

const round=(subject,id)=>({attemptId:id,ids:[subject+'-1',subject+'-2'],index:0,title:subject,choices:{},checked:{}});
const sessionPatch=(before,after)=>stateChanges({...emptyState(),session:before},{...emptyState(),session:after}).find(change=>change.docId==='_session').patch;
test('a delayed tablet session cannot replace the computer Chinese round',()=>{
 const old=round('資料處理','old'),chinese=round('國文','new');
 let cloud=applyStudyMutation(undefined,sessionPatch(null,old),'update',false);
 cloud=applyStudyMutation(cloud,sessionPatch(old,chinese));
 const stale={...old,index:1};
 cloud=applyStudyMutation(cloud,sessionPatch(old,stale));
 assert.deepEqual(readStudyMetadata(cloud).session,chinese);
 // Legacy offline queues also cannot replace a different active subject.
 cloud=applyStudyMutation(cloud,{sessionJSON:JSON.stringify(old)});
 assert.deepEqual(readStudyMetadata(cloud).session,chinese);
});
test('two devices keep submitted answers from the same round without reopening them',()=>{
 const base=round('國文','same');
 const computer={...base,index:1,choices:{'國文-1':['A']},checked:{'國文-1':true}};
 const tablet={...base,index:0,choices:{'國文-2':['B']},checked:{'國文-2':false}};
 let cloud=applyStudyMutation(undefined,sessionPatch(null,base),'update',false);
 cloud=applyStudyMutation(cloud,sessionPatch(base,computer));
 cloud=applyStudyMutation(cloud,sessionPatch(base,tablet));
 const merged=readStudyMetadata(cloud).session;
 assert.deepEqual(merged.checked,{'國文-1':true,'國文-2':false});
 assert.deepEqual(merged.choices,{'國文-1':['A'],'國文-2':['B']});
});
test('starting a different subject is allowed after receiving the active cloud round',()=>{
 const chinese=round('國文','first'),data=round('資料處理','second');
 const cloud=applyStudyMutation(JSON.stringify(chinese),sessionPatch(chinese,data));
 assert.deepEqual(readStudyMetadata(cloud).session,data);
});
test('a new paper survives a late update to the round it replaced',()=>{
 const chinese=round('國文','completed'),data=round('資料處理','new');
 const advanced={...chinese,index:1,choices:{'國文-1':['A']},checked:{'國文-1':true}};
 const start=sessionPatch(chinese,data);
 const cloud=applyStudyMutation(JSON.stringify(advanced),start);
 assert.deepEqual(readStudyMetadata(cloud).session,data);
 // Before the write is acknowledged, realtime snapshots also preserve the new round.
 const actualOld=questions.find(question=>question.subjectIndex===0);
 const actualNew=questions.find(question=>question.subjectIndex===3);
 const current={...chinese,ids:[actualOld.id]},next={...data,ids:[actualNew.id]};
 const pending={...stateChanges({...emptyState(),session:current},{...emptyState(),session:next})[0],id:'start'};
 const remote={...current,index:0,choices:{[actualOld.id]:['A']},checked:{[actualOld.id]:false}};
 assert.equal(cloudState(new Map(),JSON.stringify(remote),questions,[pending]).session.title,'資料處理');
});
test('queued transitions remain separate while edits to one round can coalesce',()=>{
 const a=round('國文','a'),b=round('資料處理','b'),c=round('統計','c');
 const update=sessionPatch(a,{...a,index:1});
 const startB=sessionPatch({...a,index:1},b);
 const answerB=sessionPatch(b,{...b,index:1});
 const startC=sessionPatch({...b,index:1},c);
 assert.equal(canCoalesceStudyMutations(update,startB),false);
 assert.equal(canCoalesceStudyMutations(startB,answerB),true);
 assert.equal(canCoalesceStudyMutations(answerB,startC),false);
 let cloud=applyStudyMutation(JSON.stringify({...a,index:1}),startB);
 cloud=applyStudyMutation(cloud,answerB);
 cloud=applyStudyMutation(cloud,startC);
 assert.deepEqual(readStudyMetadata(cloud).session,c);
 // An older update arriving afterwards must not restore the completed round.
 cloud=applyStudyMutation(cloud,update);
 assert.deepEqual(readStudyMetadata(cloud).session,c);
});
