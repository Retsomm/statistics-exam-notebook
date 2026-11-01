import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareQuestionText} from '../lib/question-text.mjs';
import {questionLayout} from '../lib/question-layout.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
const get=id=>bank.questions.find(q=>q.id===id);
test('official 115 statistics questions 25 and 26 are distinct and retain official answer letters',()=>{
 const q25=get('115-2s-25'),q26=get('115-2s-26');
 assert.match(q25.stem,/26\s+25\s+18/);assert.match(q25.stem,/MSTR/);assert.deepEqual(q25.options.map(o=>o.text),['43.58','7.33','5.94','53.51']);assert.deepEqual(q25.accepted,['A']);
 assert.match(q26.stem,/90% 信賴區間/);assert.deepEqual(q26.options.map(o=>o.text),['45','68','78','98']);assert.deepEqual(q26.accepted,['D']);
});
test('official numerical options retain their actual letters on older statistics exams',()=>{
 for(const [id,expected,correct] of [
  ['106-2s-1',['0.85','0.645','0.745','0.7'],'C'],['107-2s-1',['0.6','0.7','0.8','0.9'],'C'],
  ['107-2s-2',['1/3','1/2','8/9','7/8'],'C'],['107-2s-7',['1068','1508','456','545'],'B'],
  ['109-2s-1',['0.10','0.16','0.20','0.40'],'C'],['109-2s-24',['68','62','53','71'],'B'],
  ['110-2s-33',['0.01','0.05','0.95','0.99'],'C']]){
  const q=get(id);assert.deepEqual(q.options.map(o=>o.text),expected,id);assert.deepEqual(q.accepted,[correct],id);
 }
});
test('restored 109 data-processing questions show all original options and flag the tree figure',()=>{
 assert.deepEqual(get('109-3d-41').options.map(o=>o.text),['HTTPS','DNS','FTP','Gopher']);
 assert.match(get('109-3d-40').options[3].text,/欄位以確定封包接收的順序/);
 assert.deepEqual(get('109-3d-49').options.map(o=>o.text),['語意錯誤（Semantic Error）','語法錯誤（Syntax Error）','演算法錯誤（Algorithm Error）','硬體錯誤（Hardware Error）']);
 assert.deepEqual(get('109-3d-49').accepted,['B']);assert.equal(get('109-3d-47').hasVisual,true);
 assert.deepEqual(get('109-3d-50').options.map(o=>o.text),['以 2.4 GHz 的頻段來進行通信','經常用於近端設備的連接','傳輸距離可超過 500 公尺','有安全加密機制']);
});

test('restored statistical tables keep headings, values, and the question text in separate blocks',()=>{
 for(const [id,first,last] of [
  ['115-2s-25',['A','B','C'],['22','26','21']],
  ['109-2s-1',['血型','A','B','AB','O'],['Rh-','0.04','0.01','0.01','0.10']],
  ['110-2s-12',['工廠','樣本平均數','樣本變異數','樣本大小'],['B','10','9.11','10']],
  ['110-2s-13',['學生','(1)','(2)','(3)','(4)','(5)','(6)','(7)','(8)'],['成績相減（後－前）','12','0','1','-3','9','-1','5','17']],
 ]){
  const layout=questionLayout(prepareQuestionText(get(id)).stem);const table=layout.find(block=>block.type==='table');
  assert.ok(table,id);assert.deepEqual(table.rows[0],first,id);assert.deepEqual(table.rows.at(-1),last,id);
 }
});
test('grouped question passage follows its own questions rather than the preceding answer',()=>{
 assert.doesNotMatch(get('108-2s-24').options[3].text,/請依下文回答/);
 for(const n of [25,26,27])assert.match(get(`108-2s-${n}`).passage,/中華職業籃球聯盟/);
});
