import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreEnglishBlanks} from '../lib/english-blanks.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
const standalone=bank.questions.filter(q=>!q.englishFormat&&q.subjectIndex===1&&q.number>=36&&(q.number<=40||([111,115].includes(q.year)&&q.number<=45)));
test('all 55 standalone English fill-in sentences contain one visible slot, including leading and wrapped slots',()=>{
 assert.equal(standalone.length,55);
 for(const original of standalone){
  const restored=restoreEnglishBlanks(original);
  assert.equal((restored.stem.match(/_____/g)||[]).length,1,original.id);
  assert.equal(restored.text,original.text);assert.strictEqual(restored.options,original.options);assert.strictEqual(restored.accepted,original.accepted);
  assert.deepEqual(restoreEnglishBlanks(restored),restored,original.id+' idempotent');
 }
 const get=id=>restoreEnglishBlanks(standalone.find(q=>q.id===id)).stem;
 assert.equal(get('115-1-36'),'The _____ of facing failures costs Tom a lot of great opportunities to succeed.');
 assert.match(get('111-1-38'),/^_____ my mother,/);
 assert.match(get('109-1-37'),/design\n +and attention to _____ \./);
 assert.match(get('113-1-37'),/^It is reported/);
});
test('all cloze passages retain five numbered blanks on each question, including quoted and sentence-initial slots',()=>{
 const cloze=bank.questions.filter(q=>!q.englishFormat&&q.subjectIndex===1&&q.number>=41&&q.number<=45&&q.passage);
 assert.equal(cloze.length,35);
 for(const q of cloze){
  const restored=restoreEnglishBlanks(q);
  for(let n=41;n<=45;n++)assert.equal((restored.passage.match(new RegExp(`____${n}____`,'g'))||[]).length,1,q.id+' slot '+n);
  assert.equal(restored.stem,`請選出文中第 ${q.number} 空格最合適的答案。`);
  assert.deepEqual(restoreEnglishBlanks(restored),restored);
 }
});
test('Chinese questions, English comprehension and reservation layouts are preserved verbatim',()=>{
 for(const q of bank.questions.filter(q=>!q.englishFormat&&(q.subjectIndex!==1||q.number<36||q.number>=46)))assert.strictEqual(restoreEnglishBlanks(q),q,q.id);
 const q=standalone.find(q=>q.id==='109-1-37');
 assert.ok(restoreEnglishBlanks(q).stem.includes('\n     and attention'));
});

test('104 reading prompts restore only the five PDF answer slots',()=>{
 for(let n=46;n<=50;n++){
  const original=bank.questions.find(q=>q.id===`104-1-${n}`);
  const restored=restoreEnglishBlanks(original);
  assert.equal((restored.stem.match(/_____/g)||[]).length,1,original.id);
  assert.equal(restored.passage,original.passage);
  assert.equal(restored.text,original.text);
  assert.strictEqual(restored.options,original.options);
  assert.strictEqual(restored.accepted,original.accepted);
  assert.deepEqual(restoreEnglishBlanks(restored),restored);
 }
 assert.match(restoreEnglishBlanks(bank.questions.find(q=>q.id==='104-1-46')).stem,/called a _____ \./);
 assert.match(restoreEnglishBlanks(bank.questions.find(q=>q.id==='104-1-47')).stem,/unusual _____ on remote islands/);
});
