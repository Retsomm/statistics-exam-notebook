'use client';
import type {ReactNode} from 'react';
import type {Bank,Question,StudySession} from '@/lib/types';
import {formatScore,sessionScore} from '@/lib/scoring.mjs';
export default function PracticeResult({session,questions,bank,onRepeat,onDashboard,children}:{session:StudySession;questions:Map<string,Question>;bank:Bank;onRepeat:()=>void;onDashboard:()=>void;children:ReactNode}){
 const result=sessionScore(session,questions,bank.exams);
 return <section className="result-card"><div className="practice-score-board"><div><h2>本回合成績</h2><p>{session.title}</p><p className="score-kind">{result.fullPaper?'完整試卷 · 單科得分':'節選練習 · 本回合得分'}{result.unanswered?'（含未答題）':''}</p><p className="big">{formatScore(result.score)}<small> / {result.max} 分</small></p></div><span className="score-sticker" aria-hidden="true"/></div><p>已作答 {result.answered} 題 · 全額得分 {result.fullCredit} 題 · 部分得分 {result.partialCredit} 題 · 未作答 {result.unanswered} 題</p><p>{result.fullPaper?'單科滿分 100 分；四科平均才可對照歷年錄取標準。':'保留題目原始配分，不將節選成績換算為整科 100 分。'}國文複選已套用部分給分。</p><p className="score-caption">{session.attemptId?(result.unanswered?'全部提交後，才會保存到歷次測驗成績。':'本回合成績已保存；之後重練錯題不會改變本次分數。'):'此回合屬於複習或舊版練習，不列入歷次測驗成績。請從題庫重新開始整份試卷以記錄新成績。'}</p><div className="result-actions"><button className="btn primary" onClick={onRepeat}>再練同一份{result.fullPaper?'試卷':'清單'}</button><button className="btn" onClick={onDashboard}>查看錄取與得分看板</button>{children}</div></section>;
}
