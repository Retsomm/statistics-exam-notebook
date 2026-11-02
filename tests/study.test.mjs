import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {grade,emptyState,recordAnswer,validateBackup,mergeStates} from '../lib/study.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));const map=new Map(bank.questions.map(q=>[q.id,q]));
test('official statistics and data-processing banks have nine usable papers each',()=>{
 assert.equal(bank.questions.length,2570);assert.equal(bank.exams.length,56);
 for(const index of [2,3]){const exams=bank.exams.filter(e=>e.subjectIndex===index);assert.equal(exams.length,9);for(const exam of exams){const questions=bank.questions.filter(q=>q.examId===exam.id);assert.equal(questions.length,exam.count);assert.equal(questions.reduce((sum,q)=>sum+q.points,0),100);}}
 for(const q of bank.questions){assert.ok(q.stem.trim(),q.id);assert.equal(q.options.map(o=>o.letter).join(''),q.multi?'ABCDE':'ABCD');assert.ok(q.options.every(o=>o.text.trim()));assert.ok(q.accepted.length);}
});
test('answers, wrong questions and backups work with statistics content',()=>{const q=map.get('115-2s-1'),state=emptyState();recordAnswer(state,q,['A'],'2026-10-27T00:00:00Z');assert.equal(state.wrong[q.id].active,!grade(q,['A']));recordAnswer(state,q,q.accepted[0].split(''),'2026-10-27T00:01:00Z');assert.equal(state.wrong[q.id].active,false);state.bookmarks.push(q.id);const backup=validateBackup(JSON.parse(JSON.stringify(state)),new Set(map.keys()));assert.deepEqual(mergeStates(state,backup),state);});
