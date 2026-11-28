import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {questionFigures} from '../lib/question-figures.mjs';
import {questionLayout} from '../lib/question-layout.mjs';
import {prepareQuestionText} from '../lib/question-text.mjs';

const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
const civics=bank.questions.filter(question=>question.subjectIndex===1);
const stemTables={
 '098-1-32':[['飲品（杯／小時）','春嬌','志明'],['珍珠奶茶','60','30'],['檸檬蘆薈','20','15']],
 '100-1-27':[['價格（元／斤）','需求（斤／週）','供給（斤／週）'],['90','50','70'],['80','60','60'],['60','80','40']],
 '100-1-32':[['產品','曉明','筱梅'],['衣服','0.5 雙襪子','2 雙襪子'],['襪子','2 件衣服','0.5 件衣服']],
 '108-1-14':[['政黨','區域席次','政黨得票比例','不分區席次','總席次'],['甲','45','20%','20','65'],['乙','35','40%','40','75'],['丙','15','30%','30','45'],['丁','5','10%','10','15']],
 '108-1-31':[['國家','2013 年','2014 年','2015 年'],['甲國','100','125','155'],['乙國','100','160','200'],['丙國','100','175','229'],['丁國','100','110','143']],
 '111-1-25':[['實例','單一選區相對多數制','複數選區制','政黨比例代表制'],['甲','ν','','ν'],['乙','','ν',''],['丙','ν','',''],['總統','ν','','']],
 '115-1-3':[['員工','甲','乙','丙','丁'],['衣服','8','12','4','5'],['長褲','4','14','6','12']],
 '115-1-11':[['政黨','自民黨','立民黨','公明黨','共產黨','社民黨','維新黨','新選黨','國民黨','其他'],['席次','261','96','32','10','1','41','3','11','10']],
 '115-1-12':[['政黨','甲黨','乙黨','丙黨','丁黨','戊黨','己黨'],['得票率','33.98%','33.36%','11.22%','7.75%','3.66%','3.16%'],['(席次)','(13)','(13)','(5)','(3)','(0)','(0)']],
};
const reservationIds=['111-1-46','111-1-47','111-1-48','111-1-49','111-1-50'];
const tables=text=>questionLayout(text).filter(block=>block.type==='table');

test('the audited civics and English papers retain their source tables and figure',()=>{
 assert.equal(civics.length,950);
 const visible=[];
 for(const original of civics){
  const question=prepareQuestionText(original);
  const stem=tables(question.stem),passage=tables(question.passage);
  const optionTables=question.options.flatMap(option=>tables(option.text));
  if(stem.length||passage.length||optionTables.length||questionFigures[question.id])visible.push(question.id);
  if(Object.hasOwn(stemTables,question.id)){
   assert.deepEqual(stem.map(block=>block.rows),[stemTables[question.id]],question.id);
  }
  if(question.hasVisual)assert.ok(stem.length||passage.length||questionFigures[question.id],question.id);
 }
 assert.deepEqual(visible.sort(),[...Object.keys(stemTables),...reservationIds,'103-1-35'].sort());
 assert.equal(civics.find(question=>question.id==='109-1-49').hasVisual,false);
 assert.match(prepareQuestionText(civics.find(question=>question.id==='115-1-11')).stem,/總計\s+465 席/);
});

test('all five ticket questions share both tables and preserve the source fields and summary',()=>{
 const displays=reservationIds.map(id=>{
  const source=civics.find(question=>question.id===id);
  const heading=source.passage.split('\n').findIndex(line=>line.trim()==='Reservation Details');
  const originalFields=source.passage.split('\n').slice(heading+1,heading+3).map(line=>line.trim().split(/[ \t]{2,}/));
  const display=prepareQuestionText(source);
  const [details,trip]=tables(display.passage);
  assert.deepEqual(details.rows,originalFields,id);
  assert.equal(details.columnHeaders,false,id);
  assert.deepEqual(trip.rows,[
   ['Trip','Date','Train No.','From','To','Departure','Arrival','Fare','Seat'],
   ['Outbound','12/30','621','Taipei','Taichung','09:46','10:46','TWD 700','Car 9-16A'],
  ],id);
  assert.equal(trip.columnHeaders,true,id);
  assert.match(display.passage,/payment by\s+12\/18/);
  assert.match(display.passage,/Class: Standard Car\s+Passenger: Adult 1\s+Total Amount TWD 700/);
  assert.equal(prepareQuestionText(display).passage,display.passage);
  return display.passage;
 });
 assert.equal(new Set(displays).size,1);
});
