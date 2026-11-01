import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {cleanExamQuestion} from '../lib/exam-text-cleanup.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
const original=JSON.parse(gunzipSync(readFileSync(new URL('../data/common-bank.json.gz',import.meta.url))));
test('107 Chinese question 34 starts with the official question and preserves all choices',()=>{
 const q=bank.questions.find(item=>item.id==='107-0-34');
 assert.equal(q.stem,'國立臺灣大學函教育部的公文用語,下列選項,錯誤的是:');
 assert.deepEqual(q.options.map(o=>o.text),['奉悉','檢陳','是否可行','請辦理見復']);
 assert.deepEqual(q.accepted,['D']);
});
test('verified stray fragments and repeated question numbers are removed from affected questions',()=>{
 const ids=[...Array.from({length:10},(_,i)=>`107-0-${26+i}`),...[3,4,6,7,9,10,12].map(n=>`108-1-${n}`),'113-1-6'];
 for(const id of ids){const before=original.questions.find(q=>q.id===id),after=bank.questions.find(q=>q.id===id);const marker=new RegExp(`\\n\\s*${before.number}\\s+`);assert.match(before.stem,marker,id);assert.equal(after.stem,before.stem.slice(before.stem.search(marker)).replace(marker,''),id);assert.deepEqual(after.options,before.options,id);}
});
test('supplementary statistical distribution tables are not part of the final choice',()=>{
 for(const id of ['115-2s-40','114-2s-40','113-2s-40','110-2s-40','109-2s-40']){
  const q=bank.questions.find(item=>item.id===id);assert.doesNotMatch(q.options[3].text,/附表一/,id);
 }
});
test('unreviewed question text is preserved and numeric question content is not stripped',()=>{
 const q=bank.questions.find(item=>item.id==='111-3d-29');assert.match(q.stem,/^10 進位/);assert.deepEqual(cleanExamQuestion(q),q);
});
