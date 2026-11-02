import {sessionScore,questionPoints} from './scoring.mjs';
const historicalTestOnly=a=>['097-0','098-0'].includes(a.examId)&&a.max===20&&a.total===10;
// First completed snapshot wins. Reviews never create or revise an exam attempt.
export function mergeAttempts(a=[],b=[]){
 const map=new Map();for(const item of [...a,...b])if(!map.has(item.id))map.set(item.id,item);
 return [...map.values()].sort((a,b)=>b.completedAt.localeCompare(a.completedAt)||a.id.localeCompare(b.id));
}
export function validAttempt(a){
 return a&&typeof a.id==='string'&&/^[a-f0-9-]{36}$/.test(a.id)&&/^[0-9]{3}-(?:[01]|2s|3d)$/.test(a.examId)&&
 typeof a.startedAt==='string'&&Number.isFinite(Date.parse(a.startedAt))&&typeof a.completedAt==='string'&&Number.isFinite(Date.parse(a.completedAt))&&a.completedAt>=a.startedAt&&
 Number.isFinite(a.score)&&a.score>=0&&a.score<=a.max&&(a.max===100||historicalTestOnly(a))&&Number.isInteger(a.total)&&a.total>0&&a.total<=100;
}
export function completeAttempt(state,questions,exams,now=new Date().toISOString()){
 const s=state.session;if(!s?.attemptId||!s.examId||!s.startedAt||!s.ids.every(id=>Object.hasOwn(s.checked,id)))return;
 if((state.attempts||[]).some(a=>a.id===s.attemptId))return;
 const result=sessionScore(s,questions,exams);
 if(!result.fullPaper||result.exam.id!==s.examId||(result.max!==100&&!historicalTestOnly({examId:s.examId,max:result.max,total:result.total})))return;
 const attempt={id:s.attemptId,examId:s.examId,startedAt:s.startedAt,completedAt:now,score:result.score,max:result.max,total:result.total};
 state.attempts=mergeAttempts(state.attempts,[attempt]);
}
export function attemptYearScores(bank,attempts=[],year){
 const papers=bank.exams.filter(e=>e.year===year).sort((a,b)=>a.subjectIndex-b.subjectIndex).map(exam=>{
 const attempt=mergeAttempts(attempts).find(a=>a.examId===exam.id);
 return {exam,attempt,score:attempt?.score??0,max:bank.questions.filter(q=>q.examId===exam.id).reduce((sum,q)=>sum+questionPoints(q),0),complete:!!attempt};
 });
 const complete=papers.length===4&&papers.every(p=>p.complete&&p.max===100);
 return {papers,complete,average:complete?Math.round(papers.reduce((s,p)=>s+p.score,0)/4*10000)/10000:null};
}
