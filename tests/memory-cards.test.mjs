import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMemoryCards,memoryCardId} from '../lib/memory-cards.mjs';
import {emptyState,validateBackup,mergeStates} from '../lib/study.mjs';
import {stateChanges,applyStudyMutation,readStudyMetadata,cloudState,vocabularyMigration} from '../lib/sync-model.mjs';
const notes=['study-notes','statistics-course','data-processing-course'].flatMap(name=>JSON.parse(readFileSync(new URL(`../data/${name}.json`,import.meta.url))).notes);
const cards=buildMemoryCards(notes),[a,b,c]=cards.map(card=>card.id),q=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url))).questions[0];
test('every existing concept becomes a stable recall card with original wording',()=>{
 assert.equal(cards.length,notes.reduce((count,note)=>count+note.points.length,0)+1);assert.equal(new Set(cards.map(card=>card.id)).size,cards.length);
 for(const note of notes)for(const point of note.points){const card=cards.find(card=>card.id===memoryCardId(note.id,point.term));assert.equal(card.back,point.detail);assert.equal(card.noteId,note.id);assert.equal(card.subjectIndex,note.subjectIndex);}
 const source=notes[0],updated={...source,points:source.points.map(point=>({...point,detail:point.detail+' 補充內容。'})).reverse()};
 assert.deepEqual(buildMemoryCards([source]).map(c=>c.id).sort(),buildMemoryCards([updated]).map(c=>c.id).sort());
 const link=cards.find(card=>card.term==='資料鏈結層的責任');assert.match(link.back,/相鄰節點/);assert.match(link.back,/跨網段.*網路層/);
});
test('legacy backups, export-import and merge retain memory favorites independently',()=>{
 const legacy=emptyState();delete legacy.memoryBookmarks;assert.deepEqual(validateBackup(legacy,new Set()).memoryBookmarks,[]);
 const state={...emptyState(),memoryBookmarks:[a,a,b,'unknown','memory-__proto__']};
 const restored=validateBackup(JSON.parse(JSON.stringify(state)),new Set());assert.deepEqual(restored.memoryBookmarks,[a,b]);
 assert.deepEqual(mergeStates(restored,{...emptyState(),memoryBookmarks:[b,c]}).memoryBookmarks,[a,b,c]);
});
test('two devices, offline additions and removal tombstones never overwrite practice',()=>{
 const session={ids:[q.id],title:'原本練習',index:0,choices:{},checked:{}};
 let json=JSON.stringify(session);json=applyStudyMutation(json,{memoryBookmarks:{[a]:true}});json=applyStudyMutation(json,{memoryBookmarks:{[b]:true}});
 const before={...emptyState(),memoryBookmarks:[a,b]},after={...emptyState(),memoryBookmarks:[b,c]};
 const changes=stateChanges(before,after);assert.equal(changes.length,1);assert.deepEqual(changes[0].patch.memoryBookmarks,{[a]:false,[c]:true});
 const pending=changes.map((change,i)=>({...change,id:`memory-${i}`}));
 assert.deepEqual(new Set(cloudState(new Map(),json,[q],pending).memoryBookmarks),new Set([b,c]));
 json=applyStudyMutation(json,changes[0].patch);assert.deepEqual(readStudyMetadata(json).session,session);
 assert.deepEqual(vocabularyMigration(before,json),[]);
 json=applyStudyMutation(json,{memoryBookmarks:{[a]:true}},'migrate');assert.equal(readStudyMetadata(json).memoryBookmarks[a],false);
 json=applyStudyMutation(json,{sessionJSON:'null'});assert.deepEqual(new Set(cloudState(new Map(),json,[q]).memoryBookmarks),new Set([b,c]));
});
test('local-only memory cards migrate and current metadata fits existing Firestore size limit',()=>{
 const changes=vocabularyMigration({...emptyState(),memoryBookmarks:[a]},undefined);assert.equal(changes.length,1);
 const json=applyStudyMutation(undefined,changes[0].patch,'migrate');assert.deepEqual(cloudState(new Map(),json,[q]).memoryBookmarks,[a]);
 const all=applyStudyMutation(json,{memoryBookmarks:Object.fromEntries(cards.map(card=>[card.id,false]))});assert.ok(Buffer.byteLength(all)<50000);
});
