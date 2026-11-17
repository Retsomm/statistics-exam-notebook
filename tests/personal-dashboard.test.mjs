import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {personalDashboard} from '../lib/personal-dashboard.mjs';
import {emptyState,mergeStates,validateBackup} from '../lib/study.mjs';
import {mergeVisitDays,readVisitDays,shiftDay,taipeiDay,validDay} from '../lib/visit-days.mjs';
import {stateChanges,applyQuestionMutation,cloudState} from '../lib/sync-model.mjs';
const {questions}=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
const q=questions[0],known=new Set(questions.map(q=>q.id));
const now=Date.parse('2026-11-17T12:00:00Z');
test('visits use Taiwan civil days, reject impossible dates and merge idempotently',()=>{
 assert.equal(taipeiDay('2026-11-16T15:59:59Z'),'2026-11-16');
 assert.equal(taipeiDay('2026-11-16T16:00:00Z'),'2026-11-17');
 assert.equal(taipeiDay('invalid'),'');assert.equal(validDay('2026-02-29'),false);
 assert.equal(validDay('2024-02-29'),true);assert.equal(shiftDay('2024-02-28',1),'2024-02-29');
 assert.deepEqual(mergeVisitDays(['2026-11-17','2026-11-16','2026-11-17','2026-02-30'],['2026-11-15']),['2026-11-15','2026-11-16','2026-11-17']);
 assert.deepEqual(readVisitDays('{bad json'),[]);
});
test('streaks count visits only, allow yesterday and expire after a missed day',()=>{
 const state={...emptyState(),visitDays:['2026-11-11','2026-11-12','2026-11-13','2026-11-15','2026-11-16','2026-11-20'],history:[{id:q.id,answer:'A',correct:true,time:'2026-11-14T00:00:00Z'}]};
 let data=personalDashboard(state,questions,now);
 assert.equal(data.currentStreak,2);assert.equal(data.longestStreak,3);assert.equal(data.totalVisits,5);
 assert.equal(data.byDay.get('2026-11-14').visited,false);
 data=personalDashboard(state,questions,now+86400000);assert.equal(data.currentStreak,0);
 state.visitDays.push('2026-11-17');assert.equal(personalDashboard(state,questions,now).currentStreak,3);
});
test('daily totals deduplicate sync copies, count reattempts and completed mock answers only',()=>{
 const event={id:q.id,answer:q.accepted[0],correct:true,time:'2026-11-16T16:05:00Z'};
 const paper={subjectIndex:q.subjectIndex,ids:[q.id,questions[1].id],choices:{[q.id]:q.accepted[0].split('')},completedAt:'2026-11-17T01:00:00Z'};
 const state={...emptyState(),history:[event,{...event},{...event,time:'2026-11-17T00:00:00Z',correct:false},{...event,id:'missing'},{...event,time:'bad-date'}],mockRuns:[{id:'completed',papers:[paper,{...paper}]},{id:'not-submitted',papers:[{...paper,completedAt:undefined}]},{id:'future',papers:[{...paper,completedAt:'2026-11-18T00:00:00Z'}]}]};
 const data=personalDashboard(state,questions,now);
 assert.equal(data.todayActivity.answered,3);assert.equal(data.todayActivity.correct,2);
 assert.equal(data.todayActivity.practice,2);assert.equal(data.todayActivity.mock,1);
 assert.equal(data.completedPapers,1);assert.equal(data.weekAccuracy,67);assert.equal(data.weekActiveDays,1);
 assert.equal(data.todayActivity.subjects[q.subjectIndex].answered,3);
 assert.equal(data.recentDays.length,14);assert.equal(data.totalVisits,0);
 assert.equal(personalDashboard(emptyState(),questions,now).weekAccuracy,null);
});
test('legacy backups remain valid and imports preserve visits from both copies',()=>{
 const legacy=emptyState();delete legacy.visitDays;
 assert.deepEqual(validateBackup(legacy,known).visitDays,[]);
 const current={...emptyState(),visitDays:['2026-11-17']},incoming={...emptyState(),visitDays:['2026-11-16','2026-11-17']};
 const merged=mergeStates(current,validateBackup(incoming,known));
 assert.deepEqual(merged.visitDays,['2026-11-16','2026-11-17']);
 assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(merged)),known).visitDays,merged.visitDays);
});
test('visit mutations are additive, replay safe and independent of legacy session writes',()=>{
 const after={...emptyState(),visitDays:['2026-11-17']},changes=stateChanges(emptyState(),after);
 assert.deepEqual(changes,[{docId:'_activity',patch:{visitDays:['2026-11-17']},mode:'update'}]);
 const mutation={...changes[0],id:'first'};
 const merged=applyQuestionMutation({visitDays:['2026-11-16']},mutation);
 assert.deepEqual(merged.visitDays,['2026-11-16','2026-11-17']);
 assert.deepEqual(applyQuestionMutation(merged,mutation),merged);
 const remote=new Map([['_activity',merged]]);
 const state=cloudState(remote,JSON.stringify({studyMetadataVersion:2,session:null}),questions,[{docId:'_session',id:'old-tab',mode:'update',patch:{sessionJSON:'null'}}]);
 assert.deepEqual(state.visitDays,merged.visitDays);
 assert.deepEqual(stateChanges(after,emptyState()),[]);
});
