import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {professionalQuestionHash,reviewedProfessionalExplanation} from '../scripts/professional-import/reviewed.mjs';
import {buildStatisticsExplanations} from '../scripts/statistics/build-explanations.mjs';
import {buildDataProcessingExplanations} from '../scripts/data-processing/build-explanations.mjs';
import {questionScore,allowsMultipleChoices} from '../lib/scoring.mjs';
import {grade} from '../lib/study.mjs';
import {prepareQuestionText} from '../lib/question-text.mjs';
import {cleanExamQuestion} from '../lib/exam-text-cleanup.mjs';
import {questionLayout} from '../lib/question-layout.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const bank=read('../data/bank.json'),expansion=read('../data/professional-expansion.json');
const questions=new Map(bank.questions.map(q=>[q.id,q]));
const explanation=id=>read(`../data/explanations/${questions.get(id).examId}.json`)[id];

test('all four subjects cover the same nineteen years with 900 reviewed new professional items',()=>{
 const years=Array.from({length:19},(_,i)=>115-i);
 for(const subjectIndex of [0,1,2,3])assert.deepEqual(bank.exams.filter(e=>e.subjectIndex===subjectIndex).map(e=>e.year),years);
 assert.equal(expansion.exams.length,20);
 assert.equal(expansion.exams.reduce((sum,e)=>sum+e.count,0),900);
 assert.equal(new Set(bank.questions.map(q=>q.id)).size,3470);
 for(const exam of expansion.exams){
  assert.equal(exam.authoredReviewRequired,true);
  assert.equal(exam.count,exam.subjectIndex===2?40:50);
  for(const link of [exam.source,exam.answerSource,exam.listing])assert.equal(new URL(link).hostname,'wwwq.moex.gov.tw');
  assert.match(exam.sourceSha256,/^[a-f0-9]{64}$/);assert.match(exam.answerSha256,/^[a-f0-9]{64}$/);
 }
});

test('each new explanation is bound to the reviewed wording, options, official answer and source PDFs',()=>{
 const summaries=new Set();
 for(const exam of expansion.exams){
  const review=read(`../data/professional-reviews/${exam.id}.json`);
  const canonical=read(`../data/papers/${exam.id}.json`);
  const published=read(`../public/explanations/${exam.id}.json`);
  assert.equal(Object.keys(review.entries).length,exam.count);
  for(const q of canonical){
   const e=review.entries[q.id],text=e.explanation;
   assert.equal(e.questionSha256,professionalQuestionHash(q),q.id);
   assert.equal(e.questionSha256,professionalQuestionHash(questions.get(q.id)),q.id+' published wording');
   assert.deepEqual(published[q.id],text,q.id+' builder must not replace authored reasoning');
   assert.ok(!summaries.has(text.summary),q.id+' reused summary');summaries.add(text.summary);
   assert.ok(text.summary.length>40,q.id);
   assert.deepEqual(Object.keys(text.options),['A','B','C','D']);
   assert.equal(new Set(Object.values(text.options)).size,4,q.id);
   assert.doesNotMatch(JSON.stringify(text),/這題其實在問：|學習重點：|判斷方式：|因為它符合題幹指定的統計概念|本選項與官方答案不符|解析尚待|待補/);
   assert.doesNotMatch(q.stem+q.passage+q.options.map(o=>o.text).join(' '),/[\uE000-\uF8FF]|\(cid:\d+\)|請接背面|全一張/);
   assert.ok(text.sources.some(source=>source.url===exam.source));
   assert.ok(text.sources.some(source=>source.url===exam.answerSource));
  }
 }
 assert.equal(summaries.size,900);
});

test('changed questions, answers or official sources stop both builders instead of falling back to templates',()=>{
 for(const [id,build] of [['112-2s-1',buildStatisticsExplanations],['112-3d-1',buildDataProcessingExplanations]]){
  const q=questions.get(id),exam=expansion.exams.find(e=>e.id===q.examId);
  for(const patch of [{stem:q.stem+' changed'},{accepted:['Z']},{options:q.options.map(o=>({...o,text:o.text+' changed'}))}]){
   assert.throws(()=>build({exams:[exam],questions:[{...q,...patch}]}),/changed after explanation review/);
  }
  assert.throws(()=>reviewedProfessionalExplanation(q,{...exam,sourceSha256:'changed'}),/official source changed/);
  const cloned=reviewedProfessionalExplanation(q,exam);cloned.summary='changed locally';
  assert.notEqual(reviewedProfessionalExplanation(q,exam).summary,cloned.summary);
 }
});

test('official exceptions distinguish double marks, alternative single answers and universal credit',()=>{
 const corrected=questions.get('109-2s-4');
 assert.equal(corrected.allCredit,true);
 assert.equal(questionScore(corrected,[]),corrected.points);
 for(const [id,allowed,rejected] of [
  ['097-2s-30',[['A'],['D'],['A','D']],[[],['B'],['A','B']]],
  ['101-3d-33',[['A'],['B'],['B','A']],[[],['C'],['A','B','C']]],
  ['099-2s-38',[['B'],['C']],[[],['A'],['B','C']]],
  ['109-2s-36',[['B'],['D']],[[],['A'],['B','D']]],
  ['099-3d-47',[['A'],['B']],[[],['A','B']]],
  ['098-3d-6',[['A'],['B'],['C'],['D']],[[],['A','B']]],
 ]){
  const q=questions.get(id);
  for(const answer of allowed){assert.equal(questionScore(q,answer),q.points,id+answer);assert.equal(grade(q,answer),true);}
  for(const answer of rejected){assert.equal(questionScore(q,answer),0,id+answer);assert.equal(grade(q,answer),false);}
 }
 assert.equal(allowsMultipleChoices(questions.get('097-2s-30')),true);
 assert.equal(allowsMultipleChoices(questions.get('098-3d-6')),false);
 const all=questions.get('105-3d-34');assert.equal(all.allCredit,true);assert.equal(questionScore(all,[]),2);
});

test('adding professional content preserves every legacy common-subject item and its accepted answers',()=>{
 const legacy=JSON.parse(gunzipSync(readFileSync(new URL('../data/common-bank.json.gz',import.meta.url))));
 for(const old of legacy.questions.filter(q=>q.subjectIndex<2)){
  const current=questions.get(old.id);assert.deepEqual(current.accepted,old.accepted,old.id);assert.equal(current.stem,cleanExamQuestion(old).stem,old.id);
 }
});

test('Basic programs keep complete readable code while formulas and English remain prose',()=>{
 for(const [id,first,last] of [
  ['105-3d-10','A = 15','End Select'],['105-3d-11','X = 100','End Sub'],
  ['105-3d-12','Function SUM(N)','End Function'],['105-3d-40','Dim A(3,3), B, C As Integer','Print A(3,3)'],
  ['105-3d-41','Dim A(5), B As Integer','Print A(5)'],['104-3d-25','S = 0 : C = 2','Print S'],
 ]){
  const source=questions.get(id).stem,q=prepareQuestionText(questions.get(id));
  assert.ok(source.includes(first)&&source.includes(last),id);
  const code=questionLayout(q.stem).filter(b=>b.type==='code');assert.equal(code.length,1,id);
  assert.ok(code[0].lines.join('\n').startsWith(first),id);assert.ok(code[0].lines.join('\n').endsWith(last),id);
 }
 for(const prose of ['For example, this is a reason.','Next time we can discuss it.','S = 0\nX = 10\nY = 12'])assert.equal(questionLayout(prepareQuestionText({stem:prose,passage:'',options:[]}).stem).some(b=>b.type==='code'),false);
 const graph=prepareQuestionText(questions.get('112-3d-49'));
 assert.equal(questionLayout(graph.passage).find(b=>b.type==='table').rows.length,11);
});

// Independent calculations check the actual choices and the worked numbers,
// rather than deriving an answer from the letter stored in the answer key.
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
const numericChoice=(id,value,letter)=>{
 const q=questions.get(id),correct=q.options.find(o=>o.letter===letter);assert.ok(correct.text.includes(String(Number(value.toPrecision(12)))),id+' numerical choice');assert.ok(q.accepted.includes(letter));
};
test('historical statistics calculations use the right units, denominators and rounded sample sizes',()=>{
 numericChoice('097-2s-9',0.55814,'B');near(.4*.03/(.2*.015+.25*.02+.15*.01+.4*.03),.5581395349);
 numericChoice('097-2s-19',Math.ceil((1.96*.6/.15)**2),'A');
 numericChoice('098-2s-8',(1.96*.01/.0001)**2,'D');
 numericChoice('098-2s-16',6.92,'D');near(3+1.96*Math.sqrt(128/64+72/36),6.92);
 near((180/500-150/600)/Math.sqrt(.3*.7*(1/500+1/600)),3.964124836,1e-7);
 numericChoice('098-2s-20',.15+2*.35+3*.30+4*.15,'D');
 numericChoice('098-2s-39',(700/4)/(100/25),'A');numericChoice('098-2s-40',(6750/3)/(8000/16),'D');
 numericChoice('099-2s-18',Math.ceil(1.96**2*.25/.05**2),'A');
 numericChoice('099-2s-29',399.6/(30-3),'C');numericChoice('099-2s-33',(12000/2)/(4000/7),'D');
 numericChoice('100-2s-22',Math.ceil((1.96*34/4)**2),'C');numericChoice('100-2s-23',710.01/3.43,'B');
 const totalSS=59*1400,fertilizer=20*(30**2+40**2+10**2),pesticide=30*(10**2+10**2);
 numericChoice('100-2s-36',((totalSS-fertilizer-pesticide-13500)/2)/(13500/54),'A');
 near((29*(36+49+16)+30*(0**2+5**2+(-5)**2))/89,49.7640449438);
 near(Math.sqrt(158/7),4.75094,.00001);assert.match(explanation('101-2s-2').summary,/4\.751/);
 assert.match(explanation('101-2s-39').summary,/28.*最接近.*30/);near(4+.6*(110-106)**2+.4*(100-106)**2,28);
 assert.match(questions.get('101-2s-25').options[0].text,/√/);assert.match(explanation('101-2s-25').summary,/√\(2π\)/);
 near(9.22/2/(23.18/25),4.971958585,1e-8);assert.match(explanation('102-2s-26').summary,/4\.971/);
 assert.match(explanation('102-2s-23').summary,/1068.*1110/);
});

test('program and representation examples are independently executable',()=>{
 numericChoice('100-3d-47',0b11110000|0b10101010,'C');
 assert.equal((0o70-0b11110).toString(16).toUpperCase(),'1A');assert.match(explanation('100-3d-48').options.B,/26/);
 const tokens='1 2 3 + 4 * - 5 6 7 * + 8 9 * - -'.split(' '),stack=[];
 for(const token of tokens){if(/\d/.test(token)){stack.push(Number(token));continue;}const right=stack.pop(),left=stack.pop();stack.push(token==='+'?left+right:token==='-'?left-right:left*right);}
 assert.deepEqual(stack,[6]);numericChoice('100-3d-27',stack[0],'B');
 const sum=n=>n<=1?0:sum(n-1)+n;numericChoice('105-3d-12',sum(5),'C');
 const matrix=Array.from({length:4},()=>Array(4).fill(0));for(let c=1;c<=3;c++)for(let b=1;b<=3;b++)matrix[b][c]=matrix[b-1][c-1]+(b+c)*2;
 numericChoice('105-3d-40',matrix[3][3],'B');
 const fib=[0,0,1];for(let b=3;b<=5;b++)fib[b]=b+fib[b-1]+fib[b-2];numericChoice('105-3d-41',fib[5],'A');
 const bits=BigInt('0xA3CD55BCD').toString(2).padStart(36,'0');assert.equal(bits.slice(26,30),'1111');
 assert.match(explanation('103-3d-24').summary,/整數提升|integer promotion|32.*位/);
 assert.equal((~64)>>>0,0xffffffbf);assert.equal((~64)&0xffff,0xffbf);
});

test('weighted graph and binary tree explanations match independent graph operations',()=>{
 const q=prepareQuestionText(questions.get('112-3d-49')),rows=questionLayout(q.passage).find(b=>b.type==='table').rows.slice(1);
 const edges=rows.map(([pair,weight])=>[...pair.split('–').map(Number),Number(weight)]).sort((a,b)=>a[2]-b[2]);
 const parent=new Map(Array.from({length:7},(_,i)=>[i+1,i+1]));const root=x=>parent.get(x)===x?x:root(parent.get(x));let total=0,count=0;
 for(const [a,b,w] of edges)if(root(a)!==root(b)){parent.set(root(a),root(b));total+=w;count++;}
 assert.equal(count,6);assert.equal(total,50);assert.match(explanation(q.id).summary,/50/);
 const directed=questionLayout(prepareQuestionText(questions.get('112-3d-50')).passage).find(b=>b.type==='table').rows.slice(1).map(([pair,w])=>[...pair.split('→').map(Number),Number(w)]);
 const distances=Array(8).fill(Infinity),paths=Array(8);distances[1]=0;paths[1]=[1];
 for(let pass=0;pass<7;pass++)for(const [a,b,w] of directed)if(distances[a]+w<distances[b]){distances[b]=distances[a]+w;paths[b]=[...paths[a],b];}
 assert.equal(distances[7],16);assert.deepEqual(paths[7],[1,2,3,6,5,7]);assert.match(explanation('112-3d-50').summary,/16/);
 const tree={A:['B','C'],B:['D','E'],C:['F','G'],D:[null,'H'],F:[null,'I']};const pre=[],ino=[],post=[];
 const walk=n=>{if(!n)return;pre.push(n);walk(tree[n]?.[0]);ino.push(n);walk(tree[n]?.[1]);post.push(n);};walk('A');
 assert.deepEqual([pre[2],ino[4],post[7]],['D','A','C']);
 for(const node of [pre[2],ino[4],post[7]])assert.ok(explanation('112-3d-46').summary.includes(node));
});

test('disputed historical statements teach the actual mechanism instead of inventing support for the key',()=>{
 for(const [id,proof] of [
  ['098-3d-19',/傳值.*可以|傳值.*合法/],['098-3d-23',/兩倍.*邊數/],['098-3d-40',/CMIP.*應用層/],
  ['100-3d-37',/32.*63/],['100-3d-44',/COBOL.*物件導向/],['105-3d-21',/最壞|最差/],
  ['104-3d-8',/XP|Tablet/],['103-3d-31',/DELETE.*FROM/],['112-3d-6',/UNIQUE/],
 ])assert.match(JSON.stringify(explanation(id)),proof,id);
});

test('reviewed statistics tables retain row labels and explicit source blanks after display reflow',()=>{
 for(const [id,columns] of [
  ['112-2s-8',2],['112-2s-37',4],['104-2s-22',5],['103-2s-31',5],['103-2s-40',11],
  ['102-2s-26',4],['102-2s-27',5],['100-2s-33',4],['099-2s-35',4],['099-2s-38',5],['097-2s-35',5],
 ]){
  const q=prepareQuestionText(questions.get(id)),tables=questionLayout(q.stem).filter(b=>b.type==='table');
  assert.equal(tables.length,1,id+' complete source table');assert.equal(tables[0].rows[0].length,columns,id+' columns');
 }
 const table=questionLayout(prepareQuestionText(questions.get('099-2s-38')).stem).find(b=>b.type==='table');
 assert.deepEqual(table.rows[3],['誤差','—','20','288','—']);
 const counts=questionLayout(prepareQuestionText(questions.get('112-2s-37')).stem).find(b=>b.type==='table');
 assert.deepEqual(counts.rows,[['性別','繼續升學','直接就業','自行創業'],['男生','15','75','20'],['女生','26','60','4']]);
});
