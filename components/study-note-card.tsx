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
   <p className="text-muted">{note.chapter?'以下為編輯選配的關聯題，一題可能涉及多個章節；未收錄的考點不代表不考。題目選項與完整解析請點「查看原題解析」。':note.order?'同考點只整理一份；以下列出歸入本主題的每一題。題目特有的選項、例外與完整說明，可點「查看原題解析」。':'以下為編輯選出的關聯題目，不表示該主題的全部出題次數。'}</p>
   {related.map(q=><StudyQuestionSource key={q.id} question={q} exam={exams.get(q.examId)} onPractice={onPractice} onViewExplanation={onViewExplanation}/>)}
   {note.sources.length>0&&<details className="note-references"><summary>延伸查核資料 · {note.sources.length} 筆</summary><p className="text-muted">觀念與延伸查核資料；請留意歷史考題所指定的版本及條件。</p>{note.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</details>}
  </details>
 </article>;
}
