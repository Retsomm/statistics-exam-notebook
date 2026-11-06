import {validMemoryCardId} from './memory-cards.mjs';
import {mergeAttempts,validAttempt} from './attempts.mjs';
export const STORAGE_KEY='initial-statistics-study-v1';
export const emptyState=()=>({version:1,bookmarks:[],explanationBookmarks:[],vocabularyBookmarks:[],idiomBookmarks:[],memoryBookmarks:[],notes:{},records:{},wrong:{},history:[],attempts:[],session:null});
export function grade(q,selected){
 const value=[...new Set(selected)].sort().join('');
 return !!value&&(q.allCredit||q.accepted.includes(value));
}
export function recordAnswer(state,q,selected,now=new Date().toISOString()){
 const correct=grade(q,selected),value=[...new Set(selected)].sort().join('');
 const old=state.records[q.id];
 state.records[q.id]={answer:value,correct,attempts:(old?.attempts||0)+1,time:now};
 if(!correct)state.wrong[q.id]={active:true,time:now,answer:value};
 else if(state.wrong[q.id])state.wrong[q.id]={...state.wrong[q.id],active:false,time:now};
 state.history.unshift({id:q.id,answer:value,correct,time:now});
 state.history=state.history.slice(0,10000);
 return correct;
}
export function validateBackup(raw,known){
 if(!raw||raw.version!==1||!Array.isArray(raw.bookmarks)||!Array.isArray(raw.history)||!raw.notes||!raw.records||!raw.wrong)throw Error('這不是有效的學習備份檔。');
 const safe=emptyState();
 safe.bookmarks=[...new Set(raw.bookmarks.filter(x=>typeof x==='string'&&known.has(x)))];
 safe.explanationBookmarks=[...new Set((Array.isArray(raw.explanationBookmarks)?raw.explanationBookmarks:[]).filter(x=>typeof x==='string'&&known.has(x)))];
 const exams=new Set([...known].map(id=>id.split('-').slice(0,2).join('-')));
 safe.attempts=mergeAttempts((Array.isArray(raw.attempts)?raw.attempts:[]).filter(a=>validAttempt(a)&&exams.has(a.examId)));
 safe.vocabularyBookmarks=[...new Set((Array.isArray(raw.vocabularyBookmarks)?raw.vocabularyBookmarks:[]).filter(id=>typeof id==='string'&&(/^(?:vocabulary|(?:10[6-9]|11[0-5])-(?:[01]|2s|3d))-[a-f0-9]{16}$/.test(id))))];
 safe.idiomBookmarks=[...new Set((Array.isArray(raw.idiomBookmarks)?raw.idiomBookmarks:[]).filter(id=>typeof id==='string'&&id.length>0&&id.length<=32))];
 safe.memoryBookmarks=[...new Set((Array.isArray(raw.memoryBookmarks)?raw.memoryBookmarks:[]).filter(validMemoryCardId))];
 for(const [id,note] of Object.entries(raw.notes))if(known.has(id)&&typeof note==='string')safe.notes[id]=note.slice(0,10000);
 for(const [id,r] of Object.entries(raw.records))if(known.has(id)&&r&&typeof r.correct==='boolean'&&/^[A-E]{1,5}$/.test(r.answer)&&Number.isSafeInteger(r.attempts)&&r.attempts>0&&typeof r.time==='string')safe.records[id]={answer:r.answer,correct:r.correct,attempts:r.attempts,time:r.time};
 for(const [id,r] of Object.entries(raw.wrong))if(known.has(id)&&r&&typeof r.active==='boolean'&&typeof r.time==='string')safe.wrong[id]={active:r.active,time:r.time,answer:typeof r.answer==='string'?r.answer:''};
 safe.history=raw.history.filter(r=>r&&known.has(r.id)&&typeof r.correct==='boolean'&&/^[A-E]{1,5}$/.test(r.answer)&&typeof r.time==='string').slice(0,10000);
 if(raw.session&&Array.isArray(raw.session.ids)){
  const ids=raw.session.ids.filter(id=>known.has(id));
  if(ids.length&&Number.isInteger(raw.session.index)&&raw.session.index>=0&&raw.session.index<ids.length)safe.session={ids,index:raw.session.index,title:typeof raw.session.title==='string'?raw.session.title:'接續練習',choices:{},checked:{}};
 }
 if(safe.session&&typeof raw.session.attemptId==='string'&&/^[a-f0-9-]{36}$/.test(raw.session.attemptId)&&exams.has(raw.session.examId)&&typeof raw.session.startedAt==='string'&&Number.isFinite(Date.parse(raw.session.startedAt)))Object.assign(safe.session,{attemptId:raw.session.attemptId,examId:raw.session.examId,startedAt:raw.session.startedAt});
 return safe;
}
export function mergeStates(current,incoming){
 const out=emptyState();out.bookmarks=[...new Set([...current.bookmarks,...incoming.bookmarks])];
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
 out.attempts=mergeAttempts(current.attempts,incoming.attempts);
 out.session=current.session||incoming.session;return out;
}
