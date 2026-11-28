import {normalizeSiteTheme} from './site-theme.mjs';
import {mergeMockRuns} from './mock-exam.mjs';
import {validMemoryCardId} from './memory-cards.mjs';
import {mergeAttempts,validAttempt} from './attempts.mjs';
import {mergeVisitDays} from './visit-days.mjs';
import {sessionResumeIndex} from './session-progress.mjs';
export const STORAGE_KEY='initial-statistics-study-v1';
export const emptyState=()=>({version:1,visitDays:[],bookmarks:[],explanationBookmarks:[],vocabularyBookmarks:[],idiomBookmarks:[],memoryBookmarks:[],notes:{},records:{},wrong:{},history:[],mockRuns:[],attempts:[],examSessions:{},session:null});
export function grade(q,selected){
 const value=[...new Set(selected)].sort().join('');
 return !!value&&(q.allCredit||q.accepted.includes(value));
}
export function recordAnswer(state,q,selected,now=new Date().toISOString()){
 const correct=grade(q,selected),value=[...new Set(selected)].sort().join('');
 const old=state.records[q.id];
 const submission={answer:value,correct,time:now,...(state.session?.examId?{}:{nonExamPractice:true})};
 state.records[q.id]={...submission,attempts:(old?.attempts||0)+1};
 if(!correct)state.wrong[q.id]={active:true,time:now,answer:value};
 else if(state.wrong[q.id])state.wrong[q.id]={...state.wrong[q.id],active:false,time:now};
 state.history.unshift({id:q.id,...submission});
 state.history=state.history.slice(0,10000);
 return correct;
}
function readSession(raw,known,exams){
 if(!Array.isArray(raw?.ids)||!Number.isInteger(raw.index)||raw.index<0||raw.index>=raw.ids.length)return null;
 const ids=raw.ids.filter(id=>known.has(id));
 if(!ids.length)return null;
 const index=Math.max(0,ids.indexOf(raw.ids[raw.index]));
 const choices={},checked={};
 for(const id of ids){
  const selection=raw.choices?.[id];
  if(!Array.isArray(selection)||!selection.length||!selection.every(letter=>typeof letter==='string'&&/^[A-E]$/.test(letter)))continue;
  choices[id]=[...new Set(selection)];
  if(typeof raw.checked?.[id]==='boolean')checked[id]=known instanceof Map?grade(known.get(id),selection):raw.checked[id];
 }
 const session={ids,index,title:typeof raw.title==='string'?raw.title:'接續練習',choices,checked};
 if(typeof raw.attemptId==='string'&&/^[a-f0-9-]{36}$/.test(raw.attemptId)&&exams.has(raw.examId)&&typeof raw.startedAt==='string'&&Number.isFinite(Date.parse(raw.startedAt))){
  return {...session,attemptId:raw.attemptId,examId:raw.examId,startedAt:raw.startedAt};
 }
 return session;
}
export function validateBackup(raw,known){
 if(!raw||raw.version!==1||!Array.isArray(raw.bookmarks)||!Array.isArray(raw.history)||!raw.notes||!raw.records||!raw.wrong)throw Error('這不是有效的學習備份檔。');
 const safe=emptyState();
 const theme=normalizeSiteTheme(raw.siteTheme);if(theme)safe.siteTheme=theme;
 safe.visitDays=mergeVisitDays(raw.visitDays);
 safe.mockRuns=mergeMockRuns([],Array.isArray(raw.mockRuns)?raw.mockRuns:[]);
 safe.bookmarks=[...new Set(raw.bookmarks.filter(x=>typeof x==='string'&&known.has(x)))];
 safe.explanationBookmarks=[...new Set((Array.isArray(raw.explanationBookmarks)?raw.explanationBookmarks:[]).filter(x=>typeof x==='string'&&known.has(x)))];
 const exams=new Set([...known.keys()].map(id=>id.split('-').slice(0,2).join('-')));
 safe.attempts=mergeAttempts((Array.isArray(raw.attempts)?raw.attempts:[]).filter(a=>validAttempt(a)&&exams.has(a.examId)));
 safe.vocabularyBookmarks=[...new Set((Array.isArray(raw.vocabularyBookmarks)?raw.vocabularyBookmarks:[]).filter(id=>typeof id==='string'&&(/^(?:vocabulary|(?:10[6-9]|11[0-5])-(?:[01]|2s|3d))-[a-f0-9]{16}$/.test(id))))];
 safe.idiomBookmarks=[...new Set((Array.isArray(raw.idiomBookmarks)?raw.idiomBookmarks:[]).filter(id=>typeof id==='string'&&id.length>0&&id.length<=32))];
 safe.memoryBookmarks=[...new Set((Array.isArray(raw.memoryBookmarks)?raw.memoryBookmarks:[]).filter(validMemoryCardId))];
 for(const [id,note] of Object.entries(raw.notes))if(known.has(id)&&typeof note==='string')safe.notes[id]=note.slice(0,10000);
 for(const [id,r] of Object.entries(raw.records))if(known.has(id)&&r&&typeof r.correct==='boolean'&&/^[A-E]{1,5}$/.test(r.answer)&&Number.isSafeInteger(r.attempts)&&r.attempts>0&&typeof r.time==='string')safe.records[id]={answer:r.answer,correct:r.correct,attempts:r.attempts,time:r.time,...(r.nonExamPractice===true?{nonExamPractice:true}:{})};
 for(const [id,r] of Object.entries(raw.wrong))if(known.has(id)&&r&&typeof r.active==='boolean'&&typeof r.time==='string')safe.wrong[id]={active:r.active,time:r.time,answer:typeof r.answer==='string'?r.answer:''};
 safe.history=raw.history.filter(r=>r&&known.has(r.id)&&typeof r.correct==='boolean'&&/^[A-E]{1,5}$/.test(r.answer)&&typeof r.time==='string').slice(0,10000);
 safe.session=readSession(raw.session,known,exams);
 for(const [examId,rawSession] of Object.entries(raw.examSessions||{})){
  const session=readSession(rawSession,known,exams);
  if(session?.examId===examId&&session.ids.every(id=>id.startsWith(examId+'-'))&&sessionResumeIndex(session)!==null&&!safe.attempts.some(attempt=>attempt.id===session.attemptId))safe.examSessions[examId]=session;
 }
 return safe;
}
export function mergeStates(current,incoming){
 const out=emptyState();
 const theme=current.siteTheme??incoming.siteTheme;if(theme)out.siteTheme=theme;
 out.bookmarks=[...new Set([...current.bookmarks,...incoming.bookmarks])];
 out.visitDays=mergeVisitDays(current.visitDays,incoming.visitDays);
 out.explanationBookmarks=[...new Set([...(current.explanationBookmarks||[]),...(incoming.explanationBookmarks||[])])];
 out.vocabularyBookmarks=[...new Set([...(current.vocabularyBookmarks||[]),...(incoming.vocabularyBookmarks||[])])];
 out.idiomBookmarks=[...new Set([...(current.idiomBookmarks||[]),...(incoming.idiomBookmarks||[])])];
 out.memoryBookmarks=[...new Set([...(current.memoryBookmarks||[]),...(incoming.memoryBookmarks||[])])];
 out.notes={...incoming.notes,...current.notes};
 for(const key of ['records','wrong']){
  out[key]={...current[key]};
  for(const [id,value]of Object.entries(incoming[key]))if(!out[key][id]||value.time>out[key][id].time)out[key][id]=value;
 }
 const unique=new Map([...current.history,...incoming.history].map(h=>[`${h.id}:${h.time}:${h.answer}`,h]));
 out.history=[...unique.values()].sort((a,b)=>b.time.localeCompare(a.time)).slice(0,10000);
 out.mockRuns=mergeMockRuns(current.mockRuns,incoming.mockRuns);
 out.attempts=mergeAttempts(current.attempts,incoming.attempts);
 out.examSessions=Object.fromEntries(Object.entries({...incoming.examSessions,...current.examSessions}).filter(([,session])=>!out.attempts.some(attempt=>attempt.id===session.attemptId)));
 out.session=current.session||incoming.session;return out;
}
