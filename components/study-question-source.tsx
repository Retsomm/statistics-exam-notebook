'use client';
import type {Exam,Question} from '@/lib/types';
import OfficialSourceLink from './official-source-link';
import QuestionText from './question-text';
type Props={question:Question;exam?:Exam;onPractice:(questions:Question[],title:string)=>void;onViewExplanation:(id:string)=>void};
/** One source row for study notes and dictionary cards; answer UI stays in StudyApp. */
export default function StudyQuestionSource({question:q,exam,onPractice,onViewExplanation}:Props){
 return <div className="note-source">
  <p>{q.year} 年 · 第 {q.number} 題{q.allCredit?' · 官方一律給分':q.correction?' · 有答案更正':''}</p>
  <QuestionText className="note-question-preview" text={q.stem}/>
  <div className="note-source-actions">
   <button className="btn" onClick={()=>onViewExplanation(q.id)} aria-label={`查看 ${q.year} 年第 ${q.number} 題原題解析`}>查看原題解析</button>
   <button className="link" onClick={()=>onPractice([q],`${q.year} 年 · ${q.subject} · 第 ${q.number} 題`)}>練習這一題</button>
   {exam&&<><OfficialSourceLink question={q} exam={exam} kind="question">官方原卷 ↗</OfficialSourceLink><OfficialSourceLink question={q} exam={exam} kind="answer">標準答案 ↗</OfficialSourceLink><OfficialSourceLink question={q} exam={exam} kind="correction">更正公告 ↗</OfficialSourceLink></>}
  </div>
 </div>;
}
