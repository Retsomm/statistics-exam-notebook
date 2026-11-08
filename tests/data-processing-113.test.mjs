import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildDataProcessingExplanations} from '../scripts/data-processing/build-explanations.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const bank=read('data/bank.json'),questions=bank.questions.filter(q=>q.examId==='113-3d'),reviewed=read('scripts/data-processing/reviewed-explanations.json'),published=read('public/explanations/113-3d.json');
test('the entire 113 paper uses reviewed explanations, retains official answers and survives rebuilding',()=>{
 // Official grid is recorded explicitly in groups of ten to avoid OCR row order.
 const grid=['ADDCBADBBB','CDCCBBADDC','CACBBABCBA','DACDBBCCDC','ABCCABCCDC'].join('').split('');
 assert.equal(questions.length,50);assert.equal(grid.length,50);
 const generated=buildDataProcessingExplanations(bank).get('113-3d');
 for(const q of questions){const e=reviewed[q.id];assert.ok(e,q.id);assert.deepEqual(q.accepted,[grid[q.number-1]],q.id);assert.deepEqual(published[q.id],e,q.id);assert.deepEqual(generated[q.id],e,q.id);assert.equal(e.reviewedAt,'2026-11-08');
  assert.doesNotMatch(JSON.stringify(e),/依照上方的計算或判斷|題目所問的正確項目是|此選項分組或換算錯誤|此字母不在題目指定節點/);
  assert.equal(new Set(Object.values(e.options)).size,4,q.id);for(const reason of Object.values(e.options))assert.ok(reason.length>=30,q.id);
 }
});
test('Huffman tree merges A and B first and gives D and E two-bit codes',()=>{
 const weights={A:10,B:10,C:15,D:20,E:30,F:15};let queue=Object.entries(weights).map(([key,w])=>({w,depths:{[key]:0}}));
 while(queue.length>1){queue.sort((a,b)=>a.w-b.w);const [a,b]=queue.splice(0,2);queue.push({w:a.w+b.w,depths:Object.fromEntries(Object.entries({...a.depths,...b.depths}).map(([k,d])=>[k,d+1]))});}
 assert.deepEqual(queue[0].depths,{D:2,A:3,B:3,E:2,C:3,F:3});
 const e=published['113-3d-7'];assert.match(e.summary,/A=10.*B=10.*先合併/s);assert.match(e.summary,/E.*也最短.*選項只列/s);
 const d=e.diagram,edges=new Map(d.nodes.map(n=>[n.id,[]]));for(const [a,b]of d.edges)edges.get(a).push(b);
 const depths={};function walk(id,depth){if(!edges.get(id).length){depths[id]=depth;return;}for(const child of edges.get(id))walk(child,depth+1);}walk('root',0);
 assert.deepEqual(depths,queue[0].depths);assert.match(d.sequenceLabel,/編碼長度/);
});
test('reconstructed tree reproduces both supplied traversals and identifies the leaves',()=>{
 const d=published['113-3d-8'].diagram,nodes=new Map(d.nodes.map(n=>[n.id,n])),edges=new Map(d.nodes.map(n=>[n.id,[]]));for(const [a,b]of d.edges)edges.get(a).push(b);
 function traverse(id,post=false){if(!id)return '';const children=edges.get(id),left=children.find(c=>nodes.get(c).x<nodes.get(id).x),right=children.find(c=>nodes.get(c).x>nodes.get(id).x);return post?traverse(left,true)+traverse(right,true)+id:traverse(left)+id+traverse(right);}
 assert.equal(traverse('A'),'FECAHBDG');assert.equal(traverse('A',true),'FECBGDHA');assert.deepEqual(d.sequence,['F','B','G']);
});
test('critical numerical examples and the qualified topics have question-specific explanations',()=>{
 assert.equal(parseInt('1010011',2),83);assert.equal(parseInt('3F',16)+parseInt('FC',16)/256,parseInt('77',8)+7/8+7/64);
 const a=[8,6,4,1,3,5];for(let i=a.length-1;i>0;i--)for(let j=0;j<i;j++)if(a[j]<a[j+1])[a[j],a[j+1]]=[a[j+1],a[j]];assert.deepEqual(a,[8,6,5,4,3,1]);
 assert.equal(150-[1300,2700,1200].map(n=>Math.ceil(n/40)).reduce((a,b)=>a+b,0),19);
 for(let n=1;n<=20;n++){let count=0;for(let i=1;i<=n;i++)for(let j=1;j<=i;j++)for(let k=1;k<=20;k++)count++;assert.equal(count,10*n*(n+1));}
 assert.match(published['113-3d-1'].summary,/二補數.*固定.*進位直接捨棄/s);
 assert.match(published['113-3d-24'].options.C,/書面.*刑事告訴/s);
 assert.match(published['113-3d-35'].summary,/平均.*最差/s);
 assert.match(published['113-3d-45'].summary,/措辭.*官方 A/s);
 assert.doesNotMatch(JSON.stringify(published['113-3d-43']),/自然連接|ROM/);
});

test('additional original reports receive the explicit calculations and interpretation they requested',()=>{
 const e=n=>published[`113-3d-${n}`];
 assert.match(e(28).options.A,/1300\/40=32.5.*33/s);assert.match(e(28).options.B,/2700\/40=67.5.*68/s);assert.match(e(28).options.C,/1200\/40=30/);assert.match(e(28).options.D,/150−131=19/);
 assert.match(e(33).summary,/3×16\+9=57.*57−6=51/s);assert.match(e(35).options.C,/最差.*O\(n\)/);
 assert.match(e(38).summary,/20\(1\+2\+…\+n\).*10n\(n\+1\)/s);assert.match(e(43).options.B,/TCP.*不等於密碼學/s);
 assert.match(e(45).summary,/反向題.*不表示 A/s);assert.match(e(45).options.A,/作答應選 A/);assert.match(e(50).options.B,/不能保證/);
});
