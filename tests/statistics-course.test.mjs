import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const notes=read('../data/statistics-course.json').notes,questions=new Map(read('../data/bank.json').questions.map(q=>[q.id,q]));
const counts=[2,3,4,3,3,4,3,3,3,2,4,2,3];
test('statistics contains every supplied subsection in numeric order',()=>{
 const expected=counts.flatMap((count,index)=>Array.from({length:count},(_,j)=>`${index+1}-${j+1}`));
 assert.deepEqual(notes.map(n=>n.chapter),expected);assert.equal(notes.length,39);assert.equal(new Set(notes.map(n=>n.id)).size,39);
 for(const [i,n]of notes.entries()){
  assert.equal(n.order,i+1);assert.equal(n.subjectIndex,2);assert.equal(n.points.length,5);
  for(const key of ['lead','example','trap','recall','answer','mnemonic'])assert.ok(n[key]?.trim(),`${n.chapter}: ${key}`);
  assert.ok(n.sections.length>=2);assert.ok(n.sources.length);
  assert.equal(n.questionIds.length,new Set(n.questionIds).size);
  for(const id of n.questionIds)assert.equal(questions.get(id)?.subjectIndex,2,`${n.chapter}: ${id}`);
  for(const section of n.sections){
   if(section.table)for(const row of section.table.rows)assert.equal(row.length,section.table.headers.length,`${n.chapter}: ${section.title}`);
   if(section.plot){const p=section.plot;assert.ok(p.xMax>p.xMin&&p.yMax>p.yMin);for(const series of p.series)for(const point of series.points){assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));assert.ok(point.x>=p.xMin&&point.x<=p.xMax);assert.ok(point.y>=p.yMin&&point.y<=p.yMax);}}
  }
 }
});
test('worked examples and graphs retain their numerical and interpretation checks',()=>{
 const n=ch=>notes.find(x=>x.chapter===ch),plot=ch=>n(ch).sections.find(s=>s.plot).plot;
 assert.match(n('2-3').example,/90\/585/);assert.match(n('2-3').example,/15.38/);
 const binomial=plot('5-1').series[0].points;assert.equal(binomial.find(p=>p.x===2).y,0.2048);assert.ok(Math.abs(binomial.reduce((s,p)=>s+p.y,0)-1)<1e-6);
 assert.ok(Math.abs(plot('5-2').series[0].points.find(p=>p.x===0).y-1/Math.sqrt(2*Math.PI))<1e-6);
 assert.match(n('7-3').trap,/支撐依 θ 改變/);
 assert.match(n('8-1').points[0].detail,/反覆抽樣/);
 assert.match(n('8-3').example,/97/);assert.match(n('8-3').answer,/385/);
 assert.match(n('9-1').points.find(p=>p.term==='p 值').detail,/不是 P\(H₀\|資料\)/);
 assert.deepEqual(n('10-1').sections.find(s=>s.table).table.rows[0],['處理','16','1','16','8']);
 assert.deepEqual(plot('13-3').series[0].points.map(p=>p.y),[12,11,10.5,10.25,10.125]);
});
