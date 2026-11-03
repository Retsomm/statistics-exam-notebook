import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {reflowQuestionText} from '../lib/question-text.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
test('new professional question text remains available on small screens',()=>{for(const q of bank.questions.filter(q=>q.subjectIndex>1)){assert.ok(q.stem.trim(),q.id);for(const option of q.options)assert.ok(option.text.trim(),q.id+option.letter);}});
test('code in a question keeps its lines and indentation',()=>{const source='下列程式輸出為何？\nfor (int i = 0; i < 3; i++) {\n  printf("%d", i);\n}';const output=reflowQuestionText(source);assert.match(output,/for \(int i = 0; i < 3; i\+\+\) \{\n  printf/);assert.match(output,/printf\("%d", i\);\n\}/);});
import {questionLayout} from '../lib/question-layout.mjs';
test('statistics data rows render as an accessible table block',()=>{
 const layout=questionLayout('投票結果如下表：\n性別 支持 未定 反對 總數\n女 180 80 40 300\n男 150 20 30 200');
 const table=layout.find(block=>block.type==='table');
 assert.deepEqual(table?.rows,[['性別','支持','未定','反對','總數'],['女','180','80','40','300'],['男','150','20','30','200']]);
});
test('shell and SQL snippets stay in one code block',()=>{
 const layout=questionLayout('執行下列指令：\n$ mkdir exam\n$ cd exam\n$ ls | wc -l');
 assert.deepEqual(layout.filter(block=>block.type==='code').map(block=>block.lines.join('\n')),['$ mkdir exam\n$ cd exam\n$ ls | wc -l']);
});
test('classical Chinese punctuation is rendered as reading text instead of code',()=>{
 const source='有亡國，有亡天下。亡國與亡天下奚辨？曰：易姓改號，謂之亡國;仁義充塞，謂之亡天下。\n根據上文，下列敘述何者錯誤？';
 const reflowed=reflowQuestionText(source);
 const layout=questionLayout(reflowed);
 assert.equal(layout.some(block=>block.type==='code'),false);
 assert.equal(layout.map(block=>block.lines?.join('\n')).join('\n'),source);
});
test('non-keyword C statements ending in semicolons remain code',()=>{
 const layout=questionLayout('下列程式輸出為何？\nprocessArray(arr + 2, 3);\nfoo();');
 assert.deepEqual(layout.filter(block=>block.type==='code').map(block=>block.lines.join('\n')),['processArray(arr + 2, 3);\nfoo();']);
});

import {prepareQuestionText} from '../lib/question-text.mjs';
test('108 civics question 31 keeps each year aligned with country and data',()=>{
 const q=prepareQuestionText(bank.questions.find(q=>q.id==='108-1-31'));
 const table=questionLayout(q.stem).find(block=>block.type==='table');
 assert.deepEqual(table.rows,[['國家','2013 年','2014 年','2015 年'],['甲國','100','125','155'],['乙國','100','160','200'],['丙國','100','175','229'],['丁國','100','110','143']]);
});
test('ambiguous missing cells do not become a misleading table',()=>{
 const q=prepareQuestionText(bank.questions.find(q=>q.id==='111-1-25'));
 assert.equal(questionLayout(q.stem).some(block=>block.type==='table'),false);
});

test('112 English passport passage and choices remain normal reading text',()=>{
 for(let number=46;number<=50;number++){
  const q=prepareQuestionText(bank.questions.find(q=>q.id===`112-1-${number}`));
  assert.ok(q.passage.includes('____46____'));
  assert.ok(q.passage.includes('____50____'));
  for(const text of [q.passage,q.stem,...q.options.map(option=>option.text)]){
   assert.ok(questionLayout(text).every(block=>block.type==='text'),q.id+': '+text);
  }
 }
});
test('all imported Chinese, civics-English and statistics reading stays out of code blocks',()=>{
 for(const original of bank.questions.filter(q=>q.subjectIndex!==3)){
  const q=prepareQuestionText(original);
  for(const text of [q.stem,q.passage,...q.options.map(option=>option.text)].filter(Boolean)){
   assert.equal(questionLayout(text).some(block=>block.type==='code'),false,q.id+': '+text);
  }
 }
});
test('real C programs and SQL statements retain their lines without surrounding prose',()=>{
 for(const [id,expected] of [
  ['115-3d-34','processArray(arr + 2, 3);'],
  ['114-3d-18','else if (x%2==0) return f(x/2);'],
  ['113-3d-11','int *p1;'],
  ['108-3d-15','{int i=1, j =17,x=13;'],
  ['106-3d-45','{ for (j=1; j<5; j++)'],
  ['108-3d-9',"(4, N'Alice', '1973-1-1', 38000);"],
  ['114-3d-49',');'],
  ['110-3d-35','int ds(int n){'],
 ]){
  const q=prepareQuestionText(bank.questions.find(q=>q.id===id));
  const code=questionLayout(q.stem).filter(block=>block.type==='code');
  assert.equal(code.length,1,id);
  assert.ok(code[0].lines.join('\n').includes(expected),id);
  assert.ok(!code[0].lines.join('\n').includes('請問空格處'),id);
 }
 for(const id of ['111-2s-4','114-2s-10','110-2s-2','113-3d-39','110-3d-26','107-3d-32']){
  const q=prepareQuestionText(bank.questions.find(q=>q.id===id));
  for(const option of q.options)assert.equal(questionLayout(option.text).some(b=>b.type==='code'),false,id+' '+option.letter);
 }
});
