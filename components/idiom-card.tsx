'use client';
import type {Exam,Question} from '@/lib/types';
import type {IdiomEntry} from '@/lib/idioms.mjs';
import IdiomLearning from './idiom-learning';
import StudyQuestionSource from './study-question-source';
type Props={entry:IdiomEntry;year:string;questions:Map<string,Question>;exams:Map<string,Exam>;saved?:boolean;onToggleSave?:()=>void;onPractice:(questions:Question[],title:string)=>void;onViewExplanation:(id:string)=>void};
export default function IdiomCard({entry,year,questions,exams,saved=false,onToggleSave,onPractice,onViewExplanation}:Props){
 const related=entry.questionIds.map(id=>questions.get(id)).filter((q):q is Question=>!!q&&(year==='all'||q.year===Number(year)));
 return <article className="note-card idiom-card" aria-label={entry.term}>
  <p className="eyebrow">{entry.category} · {entry.questionIds.length} 題出現</p>
  <div className="idiom-card-title"><h3>{entry.term}</h3>{onToggleSave&&<button className={`btn word-save ${saved?'saved':''}`} aria-label={`${saved?'取消收藏成語':'收藏成語'} ${entry.term}`} aria-pressed={saved} onClick={onToggleSave}>{saved?'已收藏':'收藏成語'}</button>}</div>
  {!!entry.aliases.length&&<p className="text-muted">異寫／對照詞形：{entry.aliases.join('、')}</p>}
  <IdiomLearning entry={entry}/>
  <details className="note-sources"><summary>查看歷屆出處 · {related.length} 題{year!=='all'?`（${year} 年）`:''}</summary>
   
   {related.map(q=><StudyQuestionSource key={q.id} question={q} exam={exams.get(q.examId)} onPractice={onPractice} onViewExplanation={onViewExplanation}/>)}
  </details>
 </article>;
}
