import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMockRun,drawMockPaper,finishMockPaper,mergeMockRuns,remainingMs,mockAverage,MOCK_DURATION,validMockRun,resetMockRuns,latestMockScores,buildQuestionBlocks} from '../lib/mock-exam.mjs';
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
 assert.equal(resolveExplanation(selection,{...base,mockReviewIds:[selection.questionId],mockReviewIndex:0}).question.id,selection.questionId);
});

test('a subject can be completed and repeated without taking the other three',()=>{
 const r=createMockRun(bank,[],id,start,()=>0.4,[2]);assert.equal(r.papers.length,1);assert.equal(r.papers[0].subjectIndex,2);assert.ok(validMockRun(r));
 r.papers[0]=finishMockPaper({...r.papers[0],startedAt:new Date(start).toISOString()},qmap,start+1000);
 assert.ok(validMockRun(r));assert.equal(mockAverage(r),null);
 const next=createMockRun(bank,[r],crypto.randomUUID(),start+2000,()=>0.4,[2]);
 assert.ok(next.papers[0].ids.every(id=>!r.papers[0].ids.includes(id)));
 assert.deepEqual(validateBackup({...emptyState(),mockRuns:[r,next]},known).mockRuns,[next,r]);
});
test('reset scores survive offline queues, stale imports and remote completion while preserving coverage',()=>{
 const r=make();r.papers[0]=finishMockPaper({...r.papers[0],startedAt:new Date(start).toISOString(),choices:{[r.papers[0].ids[0]]:qmap.get(r.papers[0].ids[0]).accepted[0].split('')}},qmap,start+1000);
 const reset=resetMockRuns([r],start+2000)[0];assert.ok(validMockRun(reset));assert.equal(reset.papers[0].score,undefined);assert.deepEqual(reset.papers[0].choices,{});assert.deepEqual(reset.papers[0].ids,r.papers[0].ids);
 assert.equal(mockAverage(reset),null);assert.equal(latestMockScores([reset]).papers[0],null);
 assert.deepEqual(mergeMockRuns([reset],[r]),[reset]);assert.deepEqual(mergeMockRuns([r],[reset]),[reset]);
 const before={...emptyState(),mockRuns:[r],bookmarks:[r.papers[0].ids[0]]},after={...before,mockRuns:[reset]};
 const mutations=stateChanges(before,after).map((m,i)=>({...m,id:`reset-${i}`}));
 const safe=cloudState(new Map([[`_mock-${r.id}`,{mockRun:r}]]),undefined,bank.questions,mutations);
 assert.deepEqual(safe.mockRuns,[reset]);assert.deepEqual(mergeStates(after,before).mockRuns,[reset]);assert.deepEqual(after.bookmarks,before.bookmarks);
 const next=drawMockPaper(bank,0,[reset],()=>0.4);assert.ok(next.ids.every(id=>!reset.papers[0].ids.includes(id)));
});
test('cross-attempt benchmark average requires one completed result for every distinct subject',()=>{
 const runs=[0,1,2,3].map(subject=>{const r=createMockRun(bank,[],crypto.randomUUID(),start,()=>0.4,[subject]);r.papers[0]=finishMockPaper({...r.papers[0],startedAt:new Date(start).toISOString()},qmap,start+1000);return r;});
 assert.equal(latestMockScores(runs.slice(0,3)).average,null);assert.equal(latestMockScores(runs).papers.length,4);const baseline=Math.round((runs.reduce((sum,r)=>sum+r.papers[0].score,0)/4+Number.EPSILON)*100)/100;assert.equal(latestMockScores(runs).average,baseline);
 const newer=createMockRun(bank,runs,crypto.randomUUID(),start+1000,()=>0.4,[0]);
 newer.papers[0].startedAt=new Date(start+1000).toISOString();for(const id of newer.papers[0].ids)newer.papers[0].choices[id]=qmap.get(id).accepted[0].split('');
 newer.papers[0]=finishMockPaper(newer.papers[0],qmap,start+2000);
 assert.equal(latestMockScores([...runs,newer]).average,Math.round(((100+runs.slice(1).reduce((sum,r)=>sum+r.papers[0].score,0))/4+Number.EPSILON)*100)/100);
 assert.equal(latestMockScores([...runs,...resetMockRuns([newer])]).average,baseline);
 assert.equal(latestMockScores(resetMockRuns(runs)).average,null);
});

test('English groups remain complete, contiguous and in original order for raw and reflowed banks',async()=>{
 const {prepareQuestionText}=await import('../lib/question-text.mjs');
 const passages=JSON.parse(readFileSync(new URL('../data/english-passages.json',import.meta.url)));
 const sourceGroups=Object.values(passages).map(p=>p.questionIds.filter(id=>qmap.has(id))).filter(ids=>ids.length);
 const groupSizes=new Set(),seen=new Set(),runs=[];
 let seed=123456;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let round=0;round<60;round++){
  const source=round%2?{...bank,questions:bank.questions.map(prepareQuestionText)}:bank;
  const paper=drawMockPaper(source,1,runs,random);assert.equal(paper.ids.length,50);assert.equal(new Set(paper.ids).size,50);
  assert.ok(paper.ids.slice(0,35).every(id=>qmap.get(id).number<=35));
  const english=paper.ids.slice(35),kinds=english.map(id=>{const q=qmap.get(id);return !q.passage.trim()?0:q.englishFormat==='cloze'||q.clozeNumbers?.length||/空格/.test(q.stem)?1:2;});
  assert.deepEqual(kinds,[...kinds].sort((a,b)=>a-b));
  for(const ids of sourceGroups){
   const positions=ids.map(id=>paper.ids.indexOf(id));if(positions.every(p=>p<0))continue;
   assert.ok(positions.every(p=>p>=35),'every question in a selected passage must appear');
   const ordered=[...ids].sort((a,b)=>qmap.get(a).number-qmap.get(b).number);
   const start=paper.ids.indexOf(ordered[0]);assert.deepEqual(paper.ids.slice(start,start+ordered.length),ordered);groupSizes.add(ids.length);
  }
  const selected=paper.ids.map(id=>qmap.get(id));const answers=Object.fromEntries(selected.map(q=>[q.id,q.accepted[0].split('')]));
  const finished=finishMockPaper({...paper,startedAt:new Date(start).toISOString(),choices:answers},qmap,start+1000);assert.equal(finished.score,100);assert.equal(finished.max,100);
  for(const id of english)seen.add(id);
  runs.push({id:crypto.randomUUID(),createdAt:new Date(start+round).toISOString(),papers:[{...paper,startedAt:new Date(start).toISOString()}]});
  if(seen.size===bank.questions.filter(q=>q.subjectIndex===1&&q.number>35).length)break;
 }
 assert.equal(seen.size,bank.questions.filter(q=>q.subjectIndex===1&&q.number>35).length,'every English question remains reachable');
 assert.deepEqual([...groupSizes].sort(),[3,4,5]);
});

test('a partially seen legacy passage is drawn as a whole when it is the only remaining unseen unit',()=>{
 const passages=JSON.parse(readFileSync(new URL('../data/english-passages.json',import.meta.url)));
 const target=passages['114-1-41'].questionIds,unseenId=target.at(-1);
 const runs=[{papers:[{subjectIndex:1,startedAt:new Date(start).toISOString(),ids:bank.questions.filter(q=>q.subjectIndex===1&&q.id!==unseenId).map(q=>q.id)}]}];
 const paper=drawMockPaper(bank,1,runs,()=>0.4);
 for(const id of target)assert.ok(paper.ids.includes(id));
 const position=paper.ids.indexOf(target[0]);assert.deepEqual(paper.ids.slice(position,position+target.length),target);
});

test('all subjects group preceding references, multi-question chains and shared passages',()=>{
 const blocks=buildQuestionBlocks(bank.questions);
 for(const expected of [
  ['113-0-26','113-0-27'],['111-0-29','111-0-30'],['111-0-31','111-0-32'],
  ['100-0-31','100-0-32','100-0-33'],['099-0-1','099-0-2','099-0-3'],
  ['114-1-11','114-1-12'],['097-1-26','097-1-27'],['099-1-13','099-1-14'],
  ['115-2s-5','115-2s-6'],['115-2s-35','115-2s-36','115-2s-37'],['100-2s-23','100-2s-24','100-2s-25'],
  ['108-3d-9','108-3d-10'],['104-3d-47','104-3d-48','104-3d-49','104-3d-50']
 ])assert.deepEqual(blocks.find(group=>group.some(q=>q.id===expected.at(-1))).map(q=>q.id),expected);
});

test('dependent questions in every subject stay complete, consecutive and scored to 100',()=>{
 const blocks=buildQuestionBlocks(bank.questions).filter(g=>g.length>1),runs=[];
 let seed=9786;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let round=0;round<10;round++){
  const run=createMockRun(bank,runs,crypto.randomUUID(),start+round,random);
  for(const paper of run.papers){
   for(const group of blocks){const ids=group.map(q=>q.id);if(!ids.some(id=>paper.ids.includes(id)))continue;const position=paper.ids.indexOf(ids[0]);assert.ok(position>=0);assert.deepEqual(paper.ids.slice(position,position+ids.length),ids);}
   assert.equal(new Set(paper.ids).size,paper.ids.length);
   if(paper.subjectIndex===0){assert.equal(paper.ids.slice(0,35).filter(id=>qmap.get(id).multi).length,0);assert.equal(paper.ids.slice(35).filter(id=>qmap.get(id).multi).length,10);}
   paper.startedAt=new Date(start).toISOString();paper.choices=Object.fromEntries(paper.ids.map(id=>[id,qmap.get(id).accepted[0].split('')]));
   const completed=finishMockPaper(paper,qmap,start+1000);assert.equal(completed.score,100);assert.equal(completed.max,100);
  }
  runs.push(run);
 }
});

test('the last unseen dependent item includes its already-seen prerequisites in every subject',()=>{
 for(const [subject,ids] of [[0,['113-0-26','113-0-27']],[1,['114-1-11','114-1-12']],[2,['115-2s-35','115-2s-36','115-2s-37']],[3,['108-3d-9','108-3d-10']]]){
  const history=[{papers:[{subjectIndex:subject,startedAt:new Date(start).toISOString(),ids:bank.questions.filter(q=>q.subjectIndex===subject&&q.id!==ids.at(-1)).map(q=>q.id)}]}];
  const paper=drawMockPaper(bank,subject,history,()=>0.4),position=paper.ids.indexOf(ids[0]);assert.ok(position>=0);assert.deepEqual(paper.ids.slice(position,position+ids.length),ids);
 }
});
