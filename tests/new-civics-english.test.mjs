import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const bank=read('public/bank.json'),years=['097','098','099','100','101','102','103','104','105','112'];
const papers=bank.exams.filter(e=>e.subjectIndex===1&&years.includes(e.id.slice(0,3)));
const source=Object.fromEntries(papers.map(e=>[e.id,read('data/explanations/'+e.id+'.json')]));
const payload=Object.fromEntries(papers.map(e=>[e.id,read('public/explanations/'+e.id+'.json')]));
const entry=id=>source[id.split('-').slice(0,2).join('-')][id];
const questions=bank.questions.filter(q=>papers.some(e=>e.id===q.examId));
test('all ten new civics-English papers have 500 complete, individually authored explanations',()=>{
 assert.equal(papers.length,10);assert.equal(questions.length,500);
 const summaries=new Set();let reasons=0;
 for(const paper of papers){assert.equal(paper.explanationStatus,'complete');assert.equal(paper.explanationCount,50);assert.equal(Object.keys(source[paper.id]).length,50);}
 for(const q of questions){
  const e=entry(q.id);summaries.add(e.summary);
  assert.deepEqual(Object.keys(e.options),q.options.map(o=>o.letter),q.id);
  assert.deepEqual(Object.keys(e.optionVerdicts),q.options.map(o=>o.letter),q.id);
  assert.equal(new Set(Object.values(e.options)).size,4,q.id);
  for(const text of [e.summary,...Object.values(e.options)]){
   assert.ok(text.length>12,q.id);
   assert.doesNotMatch(text,/不是本題要求的答案|看起來可能有關|符合題幹要求|位元、單位、索引或運算順序/,q.id);
  }
  reasons+=Object.keys(e.options).length;
  assert.ok(e.sources.some(s=>s.url===papers.find(p=>p.id===q.examId).answerSource),q.id);
  assert.equal(payload[q.examId][q.id].summary,e.summary,q.id);
  if(q.number>=36){
   const rendered=payload[q.examId][q.id];
   assert.ok(e.vocabulary.length>=3,q.id);
   assert.ok((rendered.questionVocabulary?.length||0)+(rendered.vocabulary?.length||0)>=3,q.id);
   for(const v of e.vocabulary){assert.ok(v.meaning&&v.partOfSpeech&&v.usage.length>=12,q.id);}
   if(!q.passage)assert.match(e.summary,/^整句白話：/);
  }
 }
 assert.equal(summaries.size,500);assert.equal(reasons,2000);
});
test('all 92 new grouped English questions keep the full shared translation and glossary',()=>{
 const groups=Object.values(read('data/english-passages.json')).filter(g=>years.includes(g.questionIds[0].slice(0,3)));
 assert.equal(groups.length,19);assert.equal(groups.flatMap(g=>g.questionIds).length,92);
 const grouped=questions.filter(q=>q.passage&&q.number>=36);assert.equal(grouped.length,92);
 for(const group of groups){
  const first=entry(group.questionIds[0]);assert.ok(first.vocabulary.length>=10);
  for(const id of group.questionIds){
   const q=questions.find(q=>q.id===id),e=payload[q.examId][id];
   assert.deepEqual(e.passageTranslation.paragraphs,group.paragraphs,id);
   assert.deepEqual(entry(id).vocabulary,first.vocabulary,id);
   if(q.stem.includes('空格'))assert.ok(group.paragraphs.join('').includes(`〔${q.number}〕`),id);
  }
 }
 assert.match(payload['098-1']['098-1-50'].passageTranslation.paragraphs.join(''),/Susan Brown，西雅圖/);
 assert.match(payload['099-1']['099-1-50'].passageTranslation.paragraphs.join(''),/合理範圍/);
 assert.match(payload['105-1']['105-1-50'].passageTranslation.paragraphs.join(''),/鼓勵作弊/);
});
test('historical laws, official answer corrections and ambiguous wording are taught without invented certainty',()=>{
 assert.match(entry('097-1-4').summary,/第19條.*不加入/);
 assert.match(entry('097-1-20').summary,/20歲.*112年/);
 assert.match(entry('097-1-30').summary,/1987.*1991.*1996.*2005/);
 assert.match(entry('098-1-24').summary,/各選項皆給分/);
 assert.match(entry('098-1-50').options.D,/官方更正/);
 assert.match(entry('100-1-47').options.A,/required.*enforced/);
 assert.match(entry('101-1-15').summary,/不得偵查.*過度簡化/);
 assert.match(entry('102-1-11').summary,/106年/);
 assert.match(entry('103-1-35').options.C,/邊界外/);
 assert.match(entry('104-1-2').options.A,/112年/);
 assert.match(entry('104-1-30').options.C,/金融資產/);
 assert.match(entry('104-1-39').options.D,/也可/);
 assert.match(entry('105-1-27').summary,/25000.*48.*1360000/);
 assert.match(entry('105-1-35').summary,/6.67.*期間未對齊/);
 assert.match(entry('112-1-12').options.B,/債權|契約/);
 assert.match(entry('112-1-27').options.D,/司法監督/);
 const corrections=questions.filter(q=>q.accepted.length>1);
 assert.ok(corrections.length>=10);
 for(const q of corrections){
  assert.match(entry(q.id).summary,/官方.*更正/ ,q.id);
  assert.ok(Object.values(entry(q.id).optionVerdicts).some(v=>v.includes('更正')),q.id);
 }
});
