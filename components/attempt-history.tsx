'use client';
import {useState} from 'react';
import {mergeAttempts} from '@/lib/attempts.mjs';
import {formatScore} from '@/lib/scoring.mjs';
import type {Bank,ExamAttempt} from '@/lib/types';
export default function AttemptHistory({bank,attempts}:{bank:Bank;attempts:ExamAttempt[]}){
 const [subject,setSubject]=useState('0'),[year,setYear]=useState('all');
 const exams=new Map(bank.exams.map(e=>[e.id,e]));
 const all=mergeAttempts(attempts),rows=all.filter(a=>{const e=exams.get(a.examId);return e&&e.subjectIndex===Number(subject)&&(year==='all'||e.year===Number(year));});
 const date=(value:string)=>new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 return <section className="score-history" aria-labelledby="attempt-history-title"><h3 id="attempt-history-title">歷次測驗成績</h3>
 <div className="attempt-filters"><label>科目 <select className="select" value={subject} onChange={e=>setSubject(e.target.value)}>{bank.subjects.map((s,i)=><option value={i} key={s}>{s}</option>)}</select></label><label>試卷年度 <select className="select" value={year} onChange={e=>setYear(e.target.value)}><option value="all">全部年度</option>{[...new Set(bank.exams.map(e=>e.year))].sort((a,b)=>b-a).map(y=><option key={y} value={y}>{y} 年</option>)}</select></label></div>
 
 {rows.length?<div className="table-wrap"><table><caption>{bank.subjects[Number(subject)]} · {rows.length} 次完整測驗（最新在前）</caption><thead><tr><th>完成時間（臺灣）</th><th>試卷</th><th>第幾次</th><th>實際分數</th><th>比上次同卷</th></tr></thead><tbody>{rows.map(a=>{const e=exams.get(a.examId)!;const same=all.filter(b=>b.examId===a.examId);const index=same.findIndex(b=>b.id===a.id);const previous=same[index+1];const diff=previous?Math.round((a.score-previous.score)*100)/100:null;return <tr key={a.id}><td>{date(a.completedAt)}</td><td>{e.year} 年</td><td>{same.length-index}</td><td><strong>{formatScore(a.score)}</strong> / {a.max} 分</td><td>{diff===null?'首次':diff===0?'持平':`${diff>0?'+':''}${formatScore(diff)} 分`}</td></tr>;})}</tbody></table></div>:<p className="score-caption">這個篩選條件還沒有完整測驗成績。從「開始這科」或題庫選擇一份試卷，全部作答後就會出現在這裡。</p>}
 </section>;
}
