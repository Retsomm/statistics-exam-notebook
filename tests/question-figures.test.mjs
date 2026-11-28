import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {questionFigures} from '../lib/question-figures.mjs';

const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));

test('all inline drawings belong to real questions and fit their view boxes',()=>{
 const ids=new Set(bank.questions.map(question=>question.id));
 for(const [id,figure] of Object.entries(questionFigures)){
  assert.ok(ids.has(id),id);
  assert.ok(figure.title&&figure.description&&figure.paths.length,id);
  assert.equal(new Set(figure.paths.map(([data])=>data)).size,figure.paths.length,id);
  for(const [x,y] of [...(figure.points||[]),...(figure.nodes||[]),...(figure.labels||[])]){
   assert.ok(x>0&&x<figure.width&&y>0&&y<figure.height,id);
  }
 }
 assert.equal(bank.questions.find(question=>question.id==='106-2s-9').page,1);
 assert.equal(bank.questions.find(question=>question.id==='106-3d-13').hasVisual,false);
 assert.ok(questionFigures['106-3d-13']);
});

test('the Syria diagram keeps the exam axes and the relationships among A, B, C, D and E',()=>{
 const {points,labels}=questionFigures['103-1-35'];
 assert.deepEqual(labels.map(([, ,label])=>label),['0','Y','X','A','C','D','E','B']);
 const [a,c,d,e,b]=points;
 const boundary=(x)=>a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
 assert.ok(a[0]<e[0]&&e[0]<b[0]);
 assert.ok(Math.abs(e[1]-boundary(e[0]))<1);
 assert.ok(c[1]<boundary(c[0]));
 assert.ok(d[1]>boundary(d[0]));
});
