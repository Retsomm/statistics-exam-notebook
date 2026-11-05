import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const course=read('../data/data-processing-course.json').notes,bank=read('../data/bank.json'),old=read('../data/study-notes.json').notes;
test('data processing follows all 27 supplied sections without generic legacy cards',()=>{
 assert.equal(course.length,27);assert.equal(new Set(course.map(n=>n.id)).size,27);
 assert.deepEqual([1,2,3,4].map(group=>course.filter(n=>n.chapter.startsWith(`${group}-`)).length),[5,9,8,5]);
 assert.equal(old.filter(n=>n.subjectIndex===3).length,0);
 for(const [index,n] of course.entries()){
  assert.equal(n.order,index+1);assert.equal(n.subjectIndex,3);assert.equal(n.points.length,6);
  for(const field of ['lead','example','trap','recall','answer','mnemonic'])assert.ok(n[field].trim().length>0,`${n.chapter} ${field}`);
  assert.ok(n.sections.length>=2);assert.ok(n.sources.length);for(const source of n.sources)assert.ok(source.url.startsWith('https://'));
  for(const section of n.sections){
   if(section.table)for(const row of section.table.rows)assert.equal(row.length,section.table.headers.length,`${n.chapter}: table columns`);
   if(section.diagram){const ids=new Set(section.diagram.nodes.map(node=>node.id));for(const [a,b] of section.diagram.edges){assert.ok(ids.has(a));assert.ok(ids.has(b));}}
  }
  assert.equal(n.questionIds.length,new Set(n.questionIds).size);for(const id of n.questionIds)assert.equal(bank.questions.find(q=>q.id===id)?.subjectIndex,3,`${n.chapter}: ${id}`);
 }
});
test('worked examples retain concrete derivations and expected results',()=>{
 const get=ch=>course.find(n=>n.chapter===ch);
 assert.ok(get('1-2').sections.some(s=>s.code?.text.includes('processArray')));
 assert.match(get('1-2').example,/2 8/);
 assert.equal(get('2-5').sections.find(s=>s.diagram).diagram.nodes.length,7);
 assert.match(get('2-7').example,/2B、2A/);
 assert.match(get('3-4').example,/190\.114\.1\.0/);assert.match(get('3-4').example,/190\.114\.2\.0/);
 assert.ok(get('3-4').questionIds.includes('115-3d-44'));
 assert.ok(get('4-3').points.some(p=>p.term.includes('BCNF')));
 assert.deepEqual(get('4-4').sections.find(s=>s.table).table.rows,[['S1','小林','1'],['S2','小陳','1'],['S3','小王','0']]);
 assert.match(get('4-5').trap,/Repeatable Read/);
});
