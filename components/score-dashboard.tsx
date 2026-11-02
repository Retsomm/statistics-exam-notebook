'use client';
import {useMemo,useState} from 'react';
import type {Bank,Exam,ExamAttempt,StudyState} from '@/lib/types';
import {ProgressBar} from './study-ui';
import {formatScore,scoreQuestions} from '@/lib/scoring.mjs';
import {mergeAttempts} from '@/lib/attempts.mjs';

type PaperProgress={exam:Exam;answered:number;total:number;max:number;score:number;attempt?:ExamAttempt};

const latestYear=(bank:Bank,study:StudyState)=>{
 const exams=new Map(bank.exams.map(exam=>[exam.id,exam]));
 const latest=mergeAttempts(study.attempts).find(attempt=>exams.has(attempt.examId));
 if(latest)return exams.get(latest.examId)!.year;
 const answered=Object.keys(study.records).map(id=>bank.questions.find(question=>question.id===id)).find(Boolean);
 return answered?.year??Math.max(...bank.exams.map(exam=>exam.year));
};

export default function ScoreDashboard({bank,study,onPractice}:{bank:Bank;study:StudyState;onPractice:(exam:Exam)=>void}){
 const [year,setYear]=useState(()=>latestYear(bank,study));
 const attempts=useMemo(()=>mergeAttempts(study.attempts),[study.attempts]);
 const papers=useMemo<PaperProgress[]>(()=>bank.exams.filter(exam=>exam.year===year).sort((a,b)=>a.subjectIndex-b.subjectIndex).map(exam=>{
  const questions=bank.questions.filter(question=>question.examId===exam.id);
  const answers=Object.fromEntries(questions.filter(question=>study.records[question.id]).map(question=>[question.id,study.records[question.id].answer.split('')]));
  const progress=scoreQuestions(questions,answers);
  const attempt=attempts.find(item=>item.examId===exam.id);
  return {exam,...progress,score:attempt?.score??progress.score,attempt};
 }),[attempts,bank,study.records,year]);
 const recent=attempts.slice(0,5).map(attempt=>({attempt,exam:bank.exams.find(exam=>exam.id===attempt.examId)})).filter((item):item is {attempt:ExamAttempt;exam:Exam}=>!!item.exam);
 const date=(value:string)=>new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 return <section className="score-dashboard" aria-labelledby="score-dashboard-title"><div className="section-head"><div><p className="eyebrow">STUDY PROGRESS</p><h2 id="score-dashboard-title">我的練習進度</h2></div><label>年度 <select className="select" value={year} onChange={event=>setYear(Number(event.target.value))}>{[...new Set(bank.exams.map(exam=>exam.year))].sort((a,b)=>b-a).map(value=><option key={value} value={value}>{value} 年</option>)}</select></label></div><p className="score-caption">首頁會優先顯示最近完成的年度。完成整份試卷後，會固定保存當次成績；統計學大意每題 2.5 分，資料處理大意每題 2 分。</p><div className="score-papers">{papers.map(paper=><article key={paper.exam.id}><h3>{paper.exam.subject}</h3><p className="paper-score"><strong>{paper.attempt?formatScore(paper.score):'—'}</strong> / {formatScore(paper.max)} 分</p><ProgressBar value={paper.answered} total={paper.total} label={`${year} 年 ${paper.exam.subject} 作答進度`}/><p>{paper.attempt?`已完成 · ${date(paper.attempt.completedAt)}`:`已作答 ${paper.answered} / ${paper.total} 題`}</p><button className="btn" onClick={()=>onPractice(paper.exam)}>{paper.attempt?'再次練習':'開始這科'} →</button></article>)}</div><section className="score-history" aria-labelledby="recent-attempts-title"><h3 id="recent-attempts-title">最近完成的試卷</h3>{recent.length?<div className="table-wrap"><table><thead><tr><th>完成時間</th><th>試卷</th><th>成績</th></tr></thead><tbody>{recent.map(({attempt,exam})=><tr key={attempt.id}><td>{date(attempt.completedAt)}</td><td>{exam.year} 年 · {exam.subject}</td><td><strong>{formatScore(attempt.score)}</strong> / {formatScore(attempt.max)} 分</td></tr>)}</tbody></table></div>:<p className="score-caption">完成任一整份歷屆試卷後，完成時間與分數會顯示在這裡。</p>}</section></section>;
}
