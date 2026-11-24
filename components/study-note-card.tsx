'use client';
import type {ReactNode} from 'react';
import type {Exam,Question} from '@/lib/types';
import NoteRichSections, {type LessonSection} from './note-rich-sections';
import StudyQuestionSource from './study-question-source';
export type StudyNote={id:string;subjectIndex:number;group:string;title:string;lead:string;points:{term:string;detail:string}[];example:string;trap:string;recall:string;answer:string;questionIds:string[];sources:{title:string;url:string}[];mnemonic?:string;order?:number;track?:string;vocabularyIds?:string[];chapter?:string;sections?:LessonSection[]};
type Props={note:StudyNote;vocabularyContent?:ReactNode;questions:Map<string,Question>;exams:Map<string,Exam>;onPractice:(questions:Question[],title:string)=>void;onViewExplanation:(id:string)=>void};
export default function StudyNoteCard({note,vocabularyContent,questions,exams,onPractice,onViewExplanation}:Props){
 const related=note.questionIds.map(id=>questions.get(id)).filter((q):q is Question=>!!q);
 const body=<><dl className="note-points">{note.points.map(point=><div key={point.term}><dt>{point.term}</dt><dd>{point.detail}</dd></div>)}</dl>{note.sections&&<NoteRichSections sections={note.sections}/>}<div className="note-example"><h4>用例子理解</h4><p>{note.example}</p></div><div className="note-trap"><h4>容易混淆的地方</h4><p>{note.trap}</p></div><div className="note-recall"><h4>遮住後回想</h4><p>{note.recall}</p><details><summary>查看重點答案</summary><p>{note.answer}</p></details></div>{vocabularyContent}</>;
 return <article className={`note-card${note.chapter?' note-card-course':''}`} aria-labelledby={`note-${note.id}`}>
  <p className="eyebrow">{note.group}{note.order?` · 重點 ${String(note.order).padStart(2,'0')}`:''}</p>
  <h3 id={`note-${note.id}`}>{note.title}</h3><p className="note-lead">{note.lead}</p>
  {note.mnemonic&&<div className="note-mnemonic"><h4>記憶訣竅</h4><p>{note.mnemonic}</p></div>}
  {(note.order||note.track)?<details className="note-lesson"><summary>閱讀完整重點 · {note.points.length} 個觀念</summary>{body}</details>:body}
  {!related.length&&note.chapter&&<p className="text-muted">本節先建立基礎觀念，目前未選配現有題庫的直接對應題。</p>}
  <button className="btn primary" disabled={!related.length} onClick={()=>onPractice(related,`重點練習 · ${note.title}`)}>練習關聯考題 · {related.length} 題 →</button>
  <details className="note-sources"><summary>逐題對照、解析與官方來源 · {related.length} 題</summary>
   
   {related.map(q=><StudyQuestionSource key={q.id} question={q} exam={exams.get(q.examId)} onPractice={onPractice} onViewExplanation={onViewExplanation}/>)}
   {note.sources.length>0&&<details className="note-references"><summary>延伸查核資料 · {note.sources.length} 筆</summary>{note.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</details>}
  </details>
 </article>;
}
