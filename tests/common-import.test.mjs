import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {prepareQuestionText} from '../lib/question-text.mjs';
import {cleanExamQuestion} from '../lib/exam-text-cleanup.mjs';
import {questionScore} from '../lib/scoring.mjs';
import {questionLayout} from '../lib/question-layout.mjs';
import {completeAttempt,validAttempt} from '../lib/attempts.mjs';
import {emptyState,validateBackup} from '../lib/study.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url)));
const bank=read('bank.json'),meta=read('common-bank-meta.json');
const importedIds=new Set(meta.exams.map(e=>e.id));
const questions=bank.questions.filter(q=>importedIds.has(q.examId));
const get=id=>questions.find(q=>q.id===id);

test('common subjects add ten official years each and preserve the existing bank',()=>{
 assert.equal(meta.exams.length,20);assert.equal(questions.length,905);
 for(const subjectIndex of [0,1])assert.deepEqual(meta.exams.filter(e=>e.subjectIndex===subjectIndex).map(e=>e.year).sort((a,b)=>a-b),[97,98,99,100,101,102,103,104,105,112]);
 assert.equal(new Set(bank.questions.map(q=>q.id)).size,bank.questions.length);
 const legacy=JSON.parse(gunzipSync(readFileSync(new URL('../data/common-bank.json.gz',import.meta.url))));
 for(const original of legacy.questions.filter(q=>q.subjectIndex<2))assert.deepEqual(bank.questions.find(q=>q.id===original.id),cleanExamQuestion(original),original.id);
 for(const exam of meta.exams){
  assert.equal(questions.filter(q=>q.examId===exam.id).length,exam.count);
  assert.match(exam.sourceSha256,/^[a-f0-9]{64}$/);
  assert.equal(new URL(exam.source).hostname,'wwwq.moex.gov.tw');
  assert.equal(exam.explanationStatus,'pending');
  assert.equal(Object.keys(read('explanations/'+exam.id+'.json')).length,0,'Do not claim an answer key is a teaching explanation');
 }
 for(const q of questions){
  assert.match(q.id,/^\d{3}-[01]-\d{1,2}$/);
  assert.doesNotMatch(q.stem+q.passage+q.options.map(o=>o.text).join(''),/[\ue000-\uf8ff]|頁次[：:]|代號[：:]/u,q.id);
  assert.equal(q.options.map(o=>o.letter).join(''),q.multi?'ABCDE':'ABCD');
 }
});
test('new common papers apply published answer corrections without guessing',()=>{
 for(const [id,answers]of [['112-1-12',['A','B']],['112-1-21',['C','D']],['101-0-46',['A','B','AB']],['103-1-19',['C','D','CD']],['104-1-30',['A','D','AD']],['098-0-6',['A','D']],['097-1-30',['B','C','BC']]])assert.deepEqual(get(id).accepted,answers,id);
 for(const id of ['100-1-47','102-1-14','103-1-25']){assert.equal(get(id).allCredit,true);assert.equal(questionScore(get(id),[]),2);}
 assert.equal(questionScore(get('102-1-32'),[]),0);
 for(const letter of 'ABCD')assert.equal(questionScore(get('102-1-32'),[letter]),2);
 assert.deepEqual(get('100-0-39').accepted,['C']);
});
test('new English cloze groups support their actual variable ranges and preserve full articles',()=>{
 for(const q of questions.filter(q=>q.englishFormat==='cloze')){
  const prepared=prepareQuestionText(q);
  assert.ok(prepared.passage.length>100,q.id);
  for(const number of q.clozeNumbers)assert.equal((prepared.passage.match(new RegExp('____'+number+'____','g'))||[]).length,1,q.id+' '+number);
  assert.deepEqual(prepareQuestionText(prepared),prepared,q.id+' idempotent');
 }
 for(const id of ['102-1-41','102-1-42','103-1-39'])assert.match(prepareQuestionText(get(id)).stem,/_____/);
 assert.match(get('102-1-48').passage,/Van Gogh/);
 assert.match(get('097-1-46').passage,/Ernest Hemingway/);
 assert.match(get('098-1-46').passage,/Dear Agnes/);
 assert.match(get('099-0-3').passage,/豔歌行/);
 assert.match(get('098-0-10').passage,/弈秋/);
 assert.deepEqual(get('102-1-43').clozeNumbers,[43,44,45,46,47]);
 assert.deepEqual(get('112-1-46').clozeNumbers,[46,47,48,49,50]);
});
test('historical Chinese test-only sections remain 20 points and link to their real pages',()=>{
 for(const id of ['097-0','098-0']){
  assert.equal(questions.filter(q=>q.examId===id).reduce((sum,q)=>sum+q.points,0),20);
  assert.match(meta.exams.find(e=>e.id===id).practiceNote,/作文、公文/);
 }
 assert.equal(get('097-0-4').page,1);
 assert.equal(get('112-0-36').page,6);
 assert.equal(get('103-1-35').hasVisual,true);
 assert.deepEqual(get('103-1-35').options.map(o=>o.text),['A點','B點','C點','D點']);
 for(const [id,header]of [['100-1-32',['產品','曉明','筱梅']],['098-1-32',['飲品（杯／小時）','春嬌','志明']]]){
  const table=questionLayout(prepareQuestionText(get(id)).stem).find(block=>block.type==='table');
  assert.ok(table,id);assert.deepEqual(table.rows[0],header);
  assert.ok(table.rows.every(row=>row.length===3),id);
 }
});
test('completed historical Chinese sections preserve scores through backup validation',()=>{
 for(const examId of ['097-0','098-0']){
  const qs=questions.filter(q=>q.examId===examId),state=emptyState();
  state.session={attemptId:'11111111-1111-4111-8111-111111111111',examId,startedAt:'2026-11-02T00:00:00Z',ids:qs.map(q=>q.id),index:9,title:examId,choices:Object.fromEntries(qs.map(q=>[q.id,q.accepted[0].split('')])),checked:Object.fromEntries(qs.map(q=>[q.id,true]))};
  completeAttempt(state,new Map(bank.questions.map(q=>[q.id,q])),bank.exams,'2026-11-02T00:10:00Z');
  assert.equal(state.attempts.length,1);assert.equal(state.attempts[0].score,20);assert.equal(state.attempts[0].max,20);
  assert.equal(validAttempt(state.attempts[0]),true);
  assert.equal(validAttempt({...state.attempts[0],examId:'115-0'}),false);
  assert.equal(validateBackup(state,new Set(bank.questions.map(q=>q.id))).attempts.length,1);
 }
});
