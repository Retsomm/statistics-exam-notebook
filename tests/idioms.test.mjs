import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterIdioms,normalizeIdiomText,questionContainsIdiom} from '../lib/idioms.mjs';
const read=file=>JSON.parse(readFileSync(new URL('../data/'+file,import.meta.url),'utf8'));
const bank=read('bank.json'),data=read('idioms.json'),questions=new Map(bank.questions.map(q=>[q.id,q]));
const chinese=bank.questions.filter(q=>q.subjectIndex===0),entries=data.entries;
const reviewedPapers=new Set(bank.exams.filter(e=>e.explanationStatus!=='pending').map(e=>e.id));
test('idiom cards have unique headwords, original examples and complete valid source occurrences',()=>{
 assert.deepEqual(data.reviewedQuestionIds,chinese.filter(q=>reviewedPapers.has(q.examId)).map(q=>q.id),'New Chinese exams need an idiom editorial review');
 const forms=new Set();
 for(const entry of entries){
  for(const form of [entry.term,...entry.aliases]){
   const key=normalizeIdiomText(form);assert.ok(!forms.has(key),`duplicate ${form}`);forms.add(key);
  }
  assert.ok(entry.meaning.trim().length>0,entry.term);assert.ok(entry.example.trim().length>0,entry.term);
  assert.ok(normalizeIdiomText(entry.example).includes(normalizeIdiomText(entry.term)),entry.term);
  assert.ok(entry.questionIds.length>0,entry.term);
  assert.deepEqual(entry.questionIds,chinese.filter(q=>questionContainsIdiom(q,entry)).map(q=>q.id),`stale source links: ${entry.term}`);
 }
});
test('explicit idiom choices and high-risk literal misunderstandings remain covered',()=>{
 const allForms=new Set(entries.flatMap(e=>[e.term,...e.aliases]));
 for(const q of chinese.filter(q=>reviewedPapers.has(q.examId)&&q.stem.includes('成語'))){
  for(const option of q.options){
   const quoted=[...option.text.matchAll(/「([^」]+)」/g)].map(m=>m[1]);
   for(const term of quoted.length?quoted:[option.text])if(/^[\u4e00-\u9fff]{4,8}$/.test(term))assert.ok(allForms.has(term),`${q.id}: ${term}`);
  }
 }
 for(const term of ['別無長物','目無全牛','萬人空巷','危言危行','屢試不爽','美輪美奐','九轉功成','鳥覆危巢'])assert.ok(allForms.has(term));
 assert.match(entries.find(e=>e.term==='別無長物').meaning,/不是沒有專長/);
 assert.match(entries.find(e=>e.term==='目無全牛').meaning,/褒義/);
});
test('idiom search supports definitions, examples, alternate forms, punctuation and years',()=>{
 const find=(query,year='all')=>filterIdioms(entries,{query,year,questions});
 assert.ok(find('沒有專長').some(e=>e.term==='別無長物'));
 assert.ok(find('父親叮嚀').some(e=>e.term==='好自為之'));
 assert.equal(find('廢寢忘餐')[0].term,'廢寢忘食');
 assert.equal(find('寧可玉碎不為瓦全')[0].term,'寧為玉碎，不為瓦全');
 assert.equal(find('115-0-1').length,4);
 assert.equal(find('完全不存在的成語').length,0);
 for(const year of [106,115])for(const e of find('',String(year)))assert.ok(e.questionIds.some(id=>questions.get(id).year===year));
 assert.equal(find('危言危行','106').length,0);
 const original=entries.map(e=>e.term);find('');assert.deepEqual(entries.map(e=>e.term),original,'search must not mutate canonical data');
 assert.equal(questionContainsIdiom({stem:'',options:[{text:'班門'},{text:'弄斧'}]},entries.find(e=>e.term==='班門弄斧')),false);
});
