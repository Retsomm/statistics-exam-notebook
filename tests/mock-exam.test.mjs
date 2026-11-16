import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMockRun,drawMockPaper,finishMockPaper,mergeMockRuns,remainingMs,mockAverage,MOCK_DURATION,validMockRun} from '../lib/mock-exam.mjs';
import {emptyState,validateBackup,mergeStates} from '../lib/study.mjs';
import {stateChanges,cloudState,applyQuestionMutation} from '../lib/sync-model.mjs';
import {resolveExplanation} from '../lib/explanation-flow.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url))),reference=JSON.parse(readFileSync(new URL('../data/mock-exam-reference.json',import.meta.url)));
const qmap=new Map(bank.questions.map(q=>[q.id,q])),known=new Set(qmap.keys()),id='11111111-1111-4111-8111-111111111111',start=Date.parse('2026-11-16T00:00:00Z');
const make=()=>createMockRun(bank,[],id,start,()=>0.4);
test('official ten-year references and current timing are explicit and complete',()=>{
 assert.deepEqual(reference.cutoffs.map(r=>r.year),[106,107,108,109,110,111,112,113,114,115]);
 assert.deepEqual(reference.cutoffs.map(r=>r.score),[77.43,78.45,76.85,73.35,74.78,76.65,76.8,79.13,70.68,71.08]);
 for(const r of reference.cutoffs){assert.match(r.source,/^https:\/\/wwwc.moex.gov.tw\//);assert.ok(r.statisticsRow.includes(r.score.toFixed(2)));assert.match(r.sha256,/^[a-f0-9]{64}$/);}
 assert.equal(reference.schedule.minutesPerSubject*60000,MOCK_DURATION);
});
test('generated papers match current counts, allocations and never duplicate IDs',()=>{
 const r=make();assert.ok(validMockRun(r));assert.deepEqual(r.papers.map(p=>[p.subjectIndex,p.ids.length]),[[0,45],[1,50],[3,50],[2,40]]);
 for(const p of r.papers){assert.equal(new Set(p.ids).size,p.ids.length);p.startedAt=new Date(start).toISOString();for(const id of p.ids)p.choices[id]=qmap.get(id).accepted[0].split('');const end=finishMockPaper(p,qmap,start+12345);assert.equal(end.score,100);assert.equal(end.max,100);assert.equal(end.elapsedMs,12345);assert.equal(end.remainingMs,MOCK_DURATION-12345);}
 assert.equal(r.papers[0].ids.filter(id=>qmap.get(id).multi).length,10);
 assert.equal(r.papers[1].ids.filter(id=>qmap.get(id).number<=35).length,35);
});
test('unseen questions precede seen ones and exhausted pools remain truly randomized',()=>{
 const first=make();first.papers.forEach(p=>p.startedAt=new Date(start).toISOString());
 const next=createMockRun(bank,[first],crypto.randomUUID(),start,()=>0.4);
 for(const p of next.papers)assert.ok(p.ids.every(id=>!first.papers.flatMap(p=>p.ids).includes(id)));
 const covered={...make(),papers:make().papers.map(p=>({...p,startedAt:new Date(start).toISOString(),ids:bank.questions.filter(q=>q.subjectIndex===p.subjectIndex).map(q=>q.id)}))};
 const a=drawMockPaper(bank,2,[covered],()=>0.1),b=drawMockPaper(bank,2,[covered],()=>0.9);assert.notDeepEqual(a.ids,b.ids);assert.equal(a.ids.length,40);
});
test('deadline is absolute; timeout includes unanswered items and completed results cannot change',()=>{
 const p=make().papers[0];p.startedAt=new Date(start).toISOString();p.choices[p.ids[0]]=qmap.get(p.ids[0]).accepted[0].split('');
 assert.equal(remainingMs(p,start+MOCK_DURATION+5000),0);
 const end=finishMockPaper(p,qmap,start+MOCK_DURATION+5000);assert.equal(end.elapsedMs,MOCK_DURATION);assert.equal(end.remainingMs,0);assert.equal(end.timedOut,true);assert.equal(end.completedAt,new Date(start+MOCK_DURATION).toISOString());assert.ok(end.score<100);
 assert.deepEqual(finishMockPaper(end,qmap,start+2000),end);
});
test('backup, offline queue, retry and two devices retain every completed score and timing',()=>{
 const before=emptyState(),after=emptyState(),r=make();r.papers=r.papers.map(p=>finishMockPaper({...p,startedAt:new Date(start).toISOString()},qmap,start+1000));after.mockRuns=[r];assert.ok(validMockRun(r));
 assert.deepEqual(validateBackup(after,known).mockRuns,[r]);assert.deepEqual(mergeStates(before,after).mockRuns,[r]);
 const changes=stateChanges(before,after);assert.equal(changes.length,1);const m={...changes[0],id:'queue-id'},doc=applyQuestionMutation(undefined,m);
 assert.deepEqual(applyQuestionMutation(doc,m),doc);
 const safe=cloudState(new Map([[m.docId,doc]]),undefined,bank.questions,[]);assert.deepEqual(safe.mockRuns,[r]);
 const stale=make();assert.deepEqual(mergeMockRuns([r],[stale]),[r]);
 assert.deepEqual(cloudState(new Map([[m.docId,doc]]),undefined,bank.questions,[{...m,patch:{mockRun:stale}}]).mockRuns,[r]);
 assert.equal(mockAverage(make()),null);assert.equal(mockAverage({papers:[]}),null);assert.equal(mockAverage(r),Math.round((r.papers.reduce((s,p)=>s+p.score,0)/4+Number.EPSILON)*100)/100);
 assert.equal(mockAverage({papers:[79.5,79,79,79].map(score=>({score,completedAt:"done"}))}),79.13);
});
test('mock explanations require an explicit click and a submitted paper',()=>{
 const selection={questionId:bank.questions[0].id,context:'mock'},base={questions:qmap,session:null,screen:'mock',result:false,savedIds:[]};
 assert.equal(resolveExplanation(null,base),null);assert.equal(resolveExplanation(selection,base),null);
 assert.equal(resolveExplanation(selection,{...base,mockReviewIds:[selection.questionId]}).question.id,selection.questionId);
});
