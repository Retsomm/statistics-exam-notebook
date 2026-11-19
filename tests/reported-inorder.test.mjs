import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
test('109-3d-47 follows the original tree, explains recursion and retains official A',()=>{
 const q=read('../data/papers/109-3d.json').find(q=>q.id==='109-3d-47');
 const e=read('../data/explanations/109-3d.json')[q.id],d=e.diagram;
 const children={'1':['2','3'],'2':['4','5'],'3':[null,'6'],'5':['7',null],'6':['8','9']};
 const walk=id=>id?[...walk(children[id]?.[0]),id,...walk(children[id]?.[1])]:[];
 const sequence=walk('1');
 assert.deepEqual(q.accepted,['A']);
 assert.equal(sequence.join(''),q.options[0].text);
 assert.deepEqual(d.sequence,sequence);
 assert.deepEqual([...d.edges].sort(),Object.entries(children).flatMap(([p,cs])=>cs.filter(Boolean).map(c=>[p,c])).sort());
 for(const node of d.nodes)assert.equal(node.step,sequence.indexOf(node.id)+1);
 assert.match(e.summary,/左子樹 4275/);assert.match(e.summary,/7 必須在 5 前面/);
 assert.match(e.options.B,/前序/);assert.match(e.options.C,/接著應回到 2/);
 assert.ok(e.sources.some(s=>s.url.includes('t=S')));
});
