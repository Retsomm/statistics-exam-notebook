import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {idiomsInText} from '../lib/idioms.mjs';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const bank=read('bank.json'),reviewed=new Set(bank.exams.filter(e=>e.explanationStatus!=='pending').map(e=>e.id));
const entries=read('idioms.json').entries,questions=bank.questions.filter(q=>q.subjectIndex===0&&reviewed.has(q.examId));
test('every explicit idiom/meaning question and quoted idiom has editorial origin coverage',()=>{
 for(const q of questions){
  const explicit=/成語|詞義/.test(q.stem);
  for(const entry of entries.filter(e=>e.questionIds.includes(q.id))){
   const quoted=q.options.some(o=>[entry.term,...entry.aliases].some(term=>o.text.includes('「'+term+'」')));
   if(explicit||quoted)assert.ok(entry.origin,`${q.id}: ${entry.term}`);
  }
 }
});
test('origins link to official dictionaries and preserve uncertainty for 江河日下',()=>{
 const enriched=entries.filter(e=>e.origin);
 assert.ok(enriched.length>=187);
 for(const e of enriched){assert.ok(e.origin.reference);assert.ok(e.origin.explanation);assert.match(e.origin.url,/^https:\/\/dict\.(idioms|revised)\.moe\.edu\.tw\//);}
 const q=questions.find(q=>q.id==='113-0-6');
 const term=idiomsInText(entries,q.options.find(o=>o.letter==='D').text).find(e=>e.term==='江河日下');
 assert.match(term.origin.explanation,/可能典源/);assert.match(term.origin.explanation,/持續變壞/);
 assert.ok(term.meaning&&term.example);
 assert.deepEqual(idiomsInText(entries,'江河'),[]);
});
