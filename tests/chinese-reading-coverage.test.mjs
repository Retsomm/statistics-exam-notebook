import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const bank=json('../data/bank.json');
const {entries,reviewedPapers}=json('../data/chinese-classical.json');
const questions=new Map(bank.questions.map(q=>[q.id,q]));
const payload=id=>json(`../public/explanations/${questions.get(id).examId}.json`)[id];

test('all Chinese papers are in the reading review and translations match the reviewed source text',()=>{
 const papers=bank.exams.filter(e=>e.subjectIndex===0);
 assert.equal(reviewedPapers.length,papers.length);
 assert.deepEqual(reviewedPapers.map(e=>e.examId).sort(),papers.map(e=>e.id).sort());
 for(const paper of reviewedPapers){
  const ids=bank.questions.filter(q=>q.examId===paper.examId).map(q=>q.id);
  assert.equal(paper.questionCount,ids.length);
  assert.deepEqual(paper.questionIds,ids,`${paper.examId}: newly added questions need a reading review`);
 }
 for(const [id,reading] of Object.entries(entries)){
  const q=questions.get(id);
  assert.equal(q?.subjectIndex,0,id);
  const hash=createHash('sha256').update(JSON.stringify([q.stem,q.passage,q.options])).digest('hex');
  assert.equal(reading.sourceHash,hash,`${id}: source changed, review its translation`);
  assert.ok(reading.vocabulary.length>15,`${id}: explain the actual words/particles`);
  assert.ok(reading.translation.length>5||reading.optionTranslations,`${id}: missing translation`);
  if(reading.optionTranslations){
   assert.deepEqual(Object.keys(reading.optionTranslations),q.options.map(o=>o.letter),`${id}: all option sentences need translations`);
   assert.equal(new Set(Object.values(reading.optionTranslations)).size,q.options.length,`${id}: duplicated option translations`);
  }
  assert.deepEqual(payload(id).classical,{translation:reading.translation,vocabulary:reading.vocabulary,...(reading.optionTranslations?{optionTranslations:reading.optionTranslations}:{})},`${id}: public payload omitted the reviewed translation`);
 }
});

test('long readings include their ending, not only an answer-oriented abstract',()=>{
 for(const [id,end] of Object.entries({
  '098-0-8':'不是這樣',
  '101-0-29':'還要尋求什麼',
  '103-0-17':'拿刀殺死',
  '103-0-25':'國家的社鼠',
  '104-0-42':'從基礎學起',
  '105-0-28':'見到父親',
  '105-0-31':'真實寫照',
  '105-0-45':'再沒有回來',
  '109-0-11':'平民也有責任',
  '110-0-41':'沒有回頭看他',
 }))assert.ok(payload(id).classical.translation.includes(end),id);
});

test('continuation questions retain the entire reading without copying the preceding option translations',()=>{
 for(const [first,next] of [['098-0-8','098-0-10'],['099-0-9','099-0-11'],['100-0-34','100-0-36'],['104-0-27','104-0-28'],['105-0-31','105-0-32'],['107-0-13','107-0-14'],['108-0-11','108-0-12'],['109-0-22','109-0-23']]){
  assert.equal(payload(first).classical.translation,payload(next).classical.translation,next);
  assert.ok(!payload(next).classical.optionTranslations,next);
 }
 assert.equal(payload('100-0-30').classical,undefined,'modern reading must not inherit another question’s classical options');
});

test('new Chinese readings now include answer reasoning alongside their complete translations',()=>{
 const bank=json('../public/bank.json');
 const added=bank.exams.filter(e=>e.subjectIndex===0&&['097','098','099','100','101','102','103','104','105','112'].includes(e.id.slice(0,3)));
 assert.equal(added.length,10);
 assert.equal(added.reduce((n,e)=>n+e.explanationCount,0),405);
 for(const paper of added){
  assert.equal(paper.explanationStatus,'complete');
  for(const q of bank.questions.filter(q=>q.examId===paper.id)){
   const teaching=payload(q.id);
   assert.deepEqual(Object.keys(teaching.options),q.options.map(o=>o.letter),q.id);
   assert.equal(new Set(Object.values(teaching.options)).size,q.options.length,q.id);
   for(const text of [teaching.summary,...Object.values(teaching.options)])assert.doesNotMatch(text,/不是本題要求的答案|符合題幹要求|位元、單位、索引或運算順序|看起來可能有關/,q.id);
  }
 }
 assert.match(payload('103-0-17').summary,/偽啼.*微伺.*磨斷/);
 assert.deepEqual(Object.keys(payload('103-0-17').options),['A','B','C','D']);
 assert.ok(!payload('109-0-9').summary.includes('完整白話翻譯：'),'translation is displayed once in its dedicated section');
 assert.ok(payload('109-0-9').summary.includes('答案依據：'),'existing answer reasoning is preserved');
});


test('new Chinese teaching preserves pronunciation, correction and inference distinctions',()=>{
 assert.match(payload('098-0-9').options.D,/之代弈秋/);
 assert.match(payload('099-0-40').options.A,/輾讀ㄓㄢˇ/);
 assert.match(payload('099-0-40').options.A,/介音/);
 assert.match(payload('101-0-46').summary,/A、B或同選AB/);
 assert.match(payload('103-0-45').options.C,/1、2、4小時/);
 assert.match(payload('112-0-16').summary,/主觀/);
});
