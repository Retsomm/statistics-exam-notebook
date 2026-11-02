import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enrichEnglishExplanation,vocabularyAppearsInQuestion} from '../lib/english-learning.mjs';
import {buildVocabularyIndex,vocabularyId} from '../lib/vocabulary.mjs';
const read=path=>JSON.parse(readFileSync(new URL('../data/'+path,import.meta.url),'utf8'));
const fullBank=read('bank.json');
const reviewed=new Set(fullBank.exams.filter(e=>e.explanationStatus!=='pending').map(e=>e.id));
const bank={...fullBank,exams:fullBank.exams.filter(e=>reviewed.has(e.id)),questions:fullBank.questions.filter(q=>reviewed.has(q.examId))},passages=read('english-passages.json'),lexicon=read('english-question-vocabulary.json');
const original=Object.fromEntries(bank.exams.map(e=>[e.id,read('explanations/'+e.id+'.json')]));
const enriched=Object.fromEntries(bank.exams.map(e=>[e.id,Object.fromEntries(bank.questions.filter(q=>q.examId===e.id).map(q=>[q.id,enrichEnglishExplanation(q,original[q.examId][q.id],passages,lexicon)]))]));
const index=buildVocabularyIndex(bank.questions,enriched);
test('all 80 passage questions receive the full shared translation, including cloze and reservation details',()=>{
 const questions=bank.questions.filter(q=>q.subjectIndex===1&&q.passage);
 assert.equal(questions.length,80);assert.equal(Object.keys(passages).length,16);
 const linked=Object.values(passages).flatMap(g=>g.questionIds);assert.deepEqual(new Set(linked),new Set(questions.map(q=>q.id)));assert.equal(linked.length,80);
 for(const group of Object.values(passages)){
  assert.ok(group.paragraphs.every(p=>p.trim().length>0));
  const originals=group.questionIds.map(id=>bank.questions.find(q=>q.id===id).passage);assert.equal(new Set(originals).size,1);
  for(const id of group.questionIds){const q=bank.questions.find(q=>q.id===id);assert.deepEqual(enriched[q.examId][id].passageTranslation.paragraphs,group.paragraphs);}
 }
 for(const [id,group] of Object.entries(passages))if(id.endsWith('-41'))for(let n=41;n<=45;n++)assert.ok(group.paragraphs.join('').includes(`〔${n}〕`),id);
 assert.match(passages['111-1-46'].paragraphs.join(''),/09:46.*10:46/);
 assert.match(passages['106-1-46'].paragraphs.join(''),/題組原文將年份寫為/);
});
test('question wording and distractors contribute collectible vocabulary independently of passage text',()=>{
 for(const [id,word] of [['113-1-49','underprivileged'],['113-1-50','salient'],['114-1-49','break the ice'],['115-1-50','postpone'],['109-1-49','revenue'],['111-1-48','driver’s licence'],['114-1-39','vendor']]){
  const q=bank.questions.find(q=>q.id===id),entry=enriched[q.examId][id];
  const card=entry.questionVocabulary.find(v=>v.word===word);assert.ok(card,`${id}: ${word}`);
  assert.ok(index[vocabularyId(q.examId,card)],word);
 }
 assert.equal(vocabularyAppearsInQuestion({stem:'This is important.',options:[],passage:'postpone'},lexicon.find(e=>e.word==='postpone')),false);
 assert.equal(vocabularyAppearsInQuestion({stem:'bookcase',options:[]},lexicon.find(e=>e.word==='book')),false);
});
test('existing saved card IDs, answer explanations and non-English content are preserved',()=>{
 for(const q of bank.questions){
  const before=original[q.examId][q.id],after=enriched[q.examId][q.id];
  assert.equal(after.summary,before.summary);assert.strictEqual(after.options,before.options);
  if(q.subjectIndex!==1||q.number<36)assert.strictEqual(after,before);
  const ids=[...(after.vocabulary||[]),...(after.questionVocabulary||[])].map(v=>vocabularyId(q.examId,v));
  assert.equal(ids.length,new Set(ids).size,q.id);
  for(const v of before.vocabulary||[])assert.ok(ids.includes(vocabularyId(q.examId,v)),q.id);
 }
});
