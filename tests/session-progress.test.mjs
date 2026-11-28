import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionResumeIndex,trackExamSessions,unfinishedExamSessions} from '../lib/session-progress.mjs';
import {emptyState,validateBackup} from '../lib/study.mjs';
import {applyStudyMutation,cloudState,coalesceExamSessionChanges,stateChanges} from '../lib/sync-model.mjs';
const session=()=>({ids:['a','b','c'],index:2,title:'歷屆題庫',choices:{a:['A'],b:['B'],c:['C']},checked:{a:true,b:false,c:true}});
test('fully submitted sessions cannot resume, even when wrong answers exist',()=>{
 const s=session();const before=structuredClone(s);
 assert.equal(sessionResumeIndex(s),null);assert.deepEqual(s,before);
 assert.equal(sessionResumeIndex(JSON.parse(JSON.stringify(s))),null);
 assert.equal(sessionResumeIndex(null),null);
 assert.equal(sessionResumeIndex({...s,ids:[]}),null);
});
test('resume finds unanswered questions after the current question or wraps to skipped ones',()=>{
 const s=session();delete s.checked.a;
 assert.equal(sessionResumeIndex(s),0); // Last question answered; earlier question skipped.
 delete s.checked.c;assert.equal(sessionResumeIndex(s),2); // Unsubmitted choice is still unfinished.
 s.index=1;assert.equal(sessionResumeIndex(s),2);
 s.index=0;assert.equal(sessionResumeIndex(s),0);
});
test('only checks for this session count toward completion',()=>{
 const s=session();delete s.checked.b;s.checked.other=true;
 assert.equal(Object.keys(s.checked).length,s.ids.length);
 assert.equal(sessionResumeIndex(s),1);
});

const stats={id:'114-2s',year:114,subject:'統計學大意',count:3};
const data={id:'115-3d',year:115,subject:'資料處理大意',count:2};
const bank={exams:[stats,data],questions:[stats,data].flatMap(exam=>Array.from({length:exam.count},(_,index)=>({id:`${exam.id}-${index+1}`,examId:exam.id,accepted:['A']})))};
const known=new Map(bank.questions.map(question=>[question.id,question]));
const firstId='114-2s-1',secondId='114-2s-2';
const yesterday='2026-11-27T08:00:00.000Z';
const today='2026-11-28T08:00:00.000Z';
const statsSession={examId:stats.id,attemptId:'11111111-1111-4111-8111-111111111111',startedAt:yesterday,ids:[firstId,secondId,'114-2s-3'],index:1,title:'114 年 · 統計學大意',choices:{[firstId]:['B'],[secondId]:['A']},checked:{[firstId]:false}};
const wrongSession={ids:[firstId],index:0,title:'錯題重練',choices:{},checked:{}};

test('swapping to a wrong-question round retains an older full-paper draft through backup and cloud sync',()=>{
 const old={...emptyState(),session:statsSession};
 const switched=trackExamSessions(old,{...old,session:wrongSession});
 assert.deepEqual(old.examSessions,{});
 const restored=validateBackup(JSON.parse(JSON.stringify(switched)),known);
 const resumed=unfinishedExamSessions(bank,restored)[0];
 assert.equal(resumed.answered,1);
 assert.equal(resumed.recovered,false);
 assert.deepEqual(resumed.session,statsSession);
 assert.equal(sessionResumeIndex(resumed.session),1);
 const change=stateChanges(old,switched).find(mutation=>mutation.docId==='_session');
 const json=applyStudyMutation(JSON.stringify(old.session),change.patch);
 const otherDevice=cloudState(new Map(),json,bank.questions);
 assert.deepEqual(otherDevice.session,wrongSession);
 assert.deepEqual(otherDevice.examSessions[stats.id],statsSession);
});

test('independent exam updates survive queue coalescing and completed drafts stay closed after a stale write',()=>{
 const start=trackExamSessions(emptyState(),{...emptyState(),session:statsSession});
 const dataSession={...statsSession,examId:data.id,attemptId:'22222222-2222-4222-8222-222222222222',startedAt:today,title:'115 年 · 資料處理大意',ids:['115-3d-1','115-3d-2'],index:0,choices:{},checked:{}};
 const both=trackExamSessions(start,{...start,session:dataSession});
 const patchFor=(before,after)=>stateChanges(before,after).find(mutation=>mutation.docId==='_session').patch;
 const first=patchFor(emptyState(),start),second=patchFor(start,both);
 const pending=coalesceExamSessionChanges(first.examSessions,second.examSessions);
 const json=applyStudyMutation(undefined,{examSessions:pending});
 assert.deepEqual(Object.keys(cloudState(new Map(),json,bank.questions).examSessions).sort(),[stats.id,data.id]);
 const completed={id:statsSession.attemptId,examId:stats.id,startedAt:yesterday,completedAt:today,score:50,max:100,total:3};
 const finished=applyStudyMutation(json,{attempts:[completed]});
 const stale=applyStudyMutation(finished,first);
 assert.deepEqual(Object.keys(cloudState(new Map(),stale,bank.questions).examSessions),[data.id]);
});

test('old overwritten rounds resume from submitted answers after the previous completed attempt',()=>{
 const study={...emptyState(),session:wrongSession,records:{
  [firstId]:{answer:'B',correct:false,attempts:1,time:today},
  [secondId]:{answer:'A',correct:true,attempts:1,time:yesterday},
 }};
 const initial=unfinishedExamSessions(bank,study)[0];
 assert.equal(initial.recovered,true);
 assert.equal(initial.answered,2);
 assert.equal(sessionResumeIndex(initial.session),2);
 study.attempts=[{examId:stats.id,completedAt:yesterday}];
 const recovered=unfinishedExamSessions(bank,study)[0];
 assert.deepEqual(recovered.session.choices,{[firstId]:['B']});
 assert.deepEqual(recovered.session.checked,{[firstId]:false});
 assert.equal(sessionResumeIndex(recovered.session),1);
});

test('new standalone answers cannot create a draft or replace a recoverable old answer',()=>{
 const review={id:firstId,answer:'A',correct:true,attempts:2,time:today,nonExamPractice:true};
 const study={...emptyState(),session:wrongSession,records:{[firstId]:review},history:[review]};
 assert.deepEqual(unfinishedExamSessions(bank,study),[]);
 const old={id:firstId,answer:'B',correct:false,time:yesterday};
 const recovered=unfinishedExamSessions(bank,{...study,history:[review,old]})[0];
 assert.deepEqual(recovered.session.choices,{[firstId]:['B']});
 assert.equal(recovered.latestAt,yesterday);
});
