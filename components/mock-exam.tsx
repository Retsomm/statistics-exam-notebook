'use client';
import {allowsMultipleChoices} from '@/lib/scoring.mjs';
import {useEffect,useMemo,useState} from 'react';
import type {Bank,StudyState,MockRun,MockPaper,StudySession} from '@/lib/types';
import {createMockRun,finishMockPaper,formatDuration,mockAverage,remainingMs} from '@/lib/mock-exam.mjs';
import {grade} from '@/lib/study.mjs';
import {formatScore} from '@/lib/scoring.mjs';
import reference from '@/data/mock-exam-reference.json';
import type {QuestionPracticeProps} from './question-practice';
import type {ReactNode} from 'react';
import {PageHeading,ProgressBar} from './study-ui';
import ModalDialog from './modal-dialog';
type Props={renderPractice:(props:QuestionPracticeProps & {key?:string})=>ReactNode;bank:Bank;study:StudyState;update:(fn:(s:StudyState)=>void)=>void;onStar:(id:string)=>void;onReport:(id:string)=>void;onViewExplanation:(id:string)=>void};
export default function MockExam({renderPractice,bank,study,update,onStar,onReport,onViewExplanation}:Props){
 const [selectedId,setSelectedId]=useState<string|null>(null),[review,setReview]=useState<{subject:number;index:number}|null>(null),[confirm,setConfirm]=useState(false),[now,setNow]=useState(Date.now());
 const questions=useMemo(()=>new Map(bank.questions.map(q=>[q.id,q])),[bank]);
 const runs=study.mockRuns||[],run=runs.find(r=>r.id===selectedId)||runs.find(r=>r.papers.some(p=>!p.completedAt));
 // Timer runs across navigation, browser suspension and reload through persisted deadlines.
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const change=(fn:(r:MockRun)=>void)=>{if(run)update(s=>{const r=s.mockRuns.find(r=>r.id===run.id);if(r)fn(r);});};
 const active=run?.papers.find(p=>p.startedAt&&!p.completedAt);
 useEffect(()=>setConfirm(false),[active?.subjectIndex,run?.id]);
 const next=run?.papers.find(p=>!p.completedAt);
 const finish=()=>{if(!active)return;change(r=>{const i=r.papers.findIndex(p=>p.subjectIndex===active.subjectIndex);r.papers[i]=finishMockPaper(r.papers[i],questions,Date.now());});setConfirm(false);};
 const choose=(paper:MockPaper,letter:string)=>change(r=>{const p=r.papers.find(p=>p.subjectIndex===paper.subjectIndex)!;if(p.completedAt||remainingMs(p,Date.now())===0)return;const q=questions.get(p.ids[p.index])!,a=p.choices[q.id]||[];p.choices[q.id]=allowsMultipleChoices(q)?(a.includes(letter)?a.filter(v=>v!==letter):[...a,letter].sort()):[letter];});
 const comparison=(r:MockRun)=>{const avg=mockAverage(r);return <section className="settings-card"><h2>近十年統計類科錄取標準</h2><p>{avg===null?'完成同回四科後，顯示總平均與各年錄取標準的差距。':`本回四科平均 ${formatScore(avg)} 分`}</p><p className="text-muted">{reference.basis} 任一科零分或總平均未滿 50 分不予錄取。資料查核：{reference.verifiedAt}。<a href={reference.scoringSource} target="_blank" rel="noreferrer">總成績計算規則 ↗</a> · <a href={reference.eligibilitySource} target="_blank" rel="noreferrer">初等考試規則 ↗</a></p><div className="mock-table-wrap"><table className="mock-table"><thead><tr><th>年度</th><th>錄取標準</th><th>本回差距</th><th>官方依據</th></tr></thead><tbody>{[...reference.cutoffs].reverse().map(row=><tr key={row.year}><th>{row.year} 年</th><td>{row.score.toFixed(2)}</td><td>{avg===null?'待完成四科':`${avg>=row.score?'+':''}${(avg-row.score).toFixed(2)}`}</td><td><a href={row.source} target="_blank" rel="noreferrer">考選部統計表 ↗</a></td></tr>)}</tbody></table></div></section>;};
 const paperUI=(paper:MockPaper,index:number,reviewing=false)=>{
  const q=questions.get(paper.ids[index]);if(!q)return <p role="alert">題目尚未載入，請保留備份後重新載入。</p>;
  const session:StudySession={ids:paper.ids,index,title:`模擬考 · ${bank.subjects[paper.subjectIndex]}`,choices:paper.choices,checked:reviewing?Object.fromEntries(paper.ids.map(id=>[id,grade(questions.get(id)!,paper.choices[id]||[])])):{}};
  return renderPractice({mockReview:reviewing,key:`${run?.id}:${q.id}:${reviewing}`,examMode:!reviewing,question:{...q,points:paper.subjectIndex===0?(q.multi?3:2):paper.points},exam:bank.exams.find(e=>e.id===q.examId)!,study:study,session:session,onChoice:letter=>choose(paper,letter),onSubmit:()=>{if(paper.ids.every(id=>paper.choices[id]?.length)){finish();return;}if(index===paper.ids.length-1)setConfirm(true);else change(r=>{r.papers.find(p=>p.subjectIndex===paper.subjectIndex)!.index=index+1;});},onMove:index=>{if(reviewing)setReview({subject:paper.subjectIndex,index});else change(r=>{r.papers.find(p=>p.subjectIndex===paper.subjectIndex)!.index=index;});},onFinish:()=>reviewing?setReview(null):setConfirm(true),onStar:()=>onStar(q.id),onReport:()=>onReport(q.id),onViewExplanation:()=>onViewExplanation(q.id),onNote:value=>update(s=>{s.notes[q.id]=value;})});
 };
 const reviewed=review&&run?.papers.find(p=>p.subjectIndex===review.subject&&p.completedAt);
 return <><PageHeading title="模擬考" sub="優先練完未出現的題目，累積完整的考場成績。"/>
 <p className="notice">依 <a href={reference.schedule.source} target="_blank" rel="noreferrer">116 年考選部日程表 ↗</a>，國文、公民與英文、資料處理大意、統計學大意各 60 分鐘。每科分別開始，計時期間離開也不暫停；時間到自動交卷。選答案即保存，交卷前可修改，考後才顯示答案與解析。</p>
 {active?<><section className="mock-clock" aria-label="模擬考計時"><strong>剩餘時間 <time>{formatDuration(remainingMs(active,now),true)}</time></strong><span>已用 {formatDuration(active.durationMs-remainingMs(active,now))} · {active.ids.filter(id=>active.choices[id]?.length).length} / {active.ids.length} 題</span><button className="btn" onClick={()=>setConfirm(true)}>提前交卷</button></section>{paperUI(active,active.index)}</>:reviewed? <><button className="btn" onClick={()=>setReview(null)}>返回模擬考成績</button>{paperUI(reviewed,review!.index,true)}</>:<>
 {run?<section className="settings-card"><h2>本回模擬考 · {new Date(run.createdAt).toLocaleString('zh-TW')}</h2><div className="mock-papers">{run.papers.map(p=><article key={p.subjectIndex}><h3>{bank.subjects[p.subjectIndex]}</h3><p>{p.ids.length} 題 · 60 分鐘 · 滿分 100</p>{p.completedAt?<><strong>{formatScore(p.score!)} 分</strong><p>{p.timedOut?'時間到自動交卷':'提前交卷'} · 用時 {formatDuration(p.elapsedMs!)} · 剩餘 {formatDuration(p.remainingMs!,true)}</p><button className="btn" onClick={()=>setReview({subject:p.subjectIndex,index:0})}>檢視作答與解析</button></>:<button className="btn primary" disabled={p!==next} onClick={()=>{setNow(Date.now());change(r=>{const paper=r.papers.find(v=>v.subjectIndex===p.subjectIndex)!;if(!paper.startedAt)paper.startedAt=new Date().toISOString();});}}>開始{bank.subjects[p.subjectIndex]}</button>}</article>)}</div>{mockAverage(run)!==null&&<p className="notice">四科平均：{formatScore(mockAverage(run)!)} 分{run.papers.some(p=>p.score===0)||mockAverage(run)!<50?' · 未達基本錄取資格':' · 可對照下方歷年錄取標準'}</p>}</section>:null}
 {!runs.some(r=>r.papers.some(p=>!p.completedAt))&&<button className="btn primary" onClick={()=>{const r=createMockRun(bank,runs,crypto.randomUUID());update(s=>{s.mockRuns.unshift(r);});setSelectedId(r.id);setReview(null);}}>建立新一回四科模擬考</button>}
 <section className="settings-card"><h2>模擬考出題覆蓋率</h2><p>每科優先隨機抽未曾在模擬考出現的題目，不足一卷時才補已出現題目；該科題庫全數出現後，才從全題庫隨機抽題。以開始該科為出題紀錄，平日練習不計入。</p>{bank.subjects.map((name,index)=>{const ids=new Set(runs.flatMap(r=>r.papers.filter(p=>p.subjectIndex===index&&p.startedAt).flatMap(p=>p.ids))),total=bank.questions.filter(q=>q.subjectIndex===index).length;return <div className="mock-coverage-item" key={name}><p>{name}：{ids.size} / {total} 題{ids.size===total?' · 已進入全隨機':''}</p><ProgressBar value={ids.size} total={total} label={`${name}模擬考覆蓋率`}/></div>;})}</section>
 {comparison(run||{id:'',createdAt:'',papers:[]})}
 <section className="settings-card"><h2>完整模擬考紀錄</h2><p>各回成績與每科作答、用時、剩餘時間獨立保存，可於「備份與資料」匯出。登入後會同步至你的帳戶；請留意頁首同步狀態。</p>{runs.length?runs.map(r=><div className="history-row" key={r.id}><time>{new Date(r.createdAt).toLocaleString('zh-TW')}</time><span>{r.papers.filter(p=>p.completedAt).length} / 4 科 · {mockAverage(r)===null?'尚未完成':`平均 ${formatScore(mockAverage(r)!)} 分`}</span><button className="btn" onClick={()=>{setSelectedId(r.id);setReview(null);}}>查看這回紀錄</button></div>):<p>尚無模擬考紀錄。</p>}</section>
 </>}
 {confirm&&active&&<ModalDialog subtitle="交卷後保存本次成績" closeLabel="繼續作答" footer={null} title="確認提前交卷" onClose={()=>setConfirm(false)}><p>已答 {active.ids.filter(id=>active.choices[id]?.length).length} / {active.ids.length} 題，剩餘 {formatDuration(remainingMs(active,now),true)}。交卷後立即計分，未答題目以零分計算（官方一律給分題除外），無法修改本次成績。</p><div className="action-row"><button className="btn primary" onClick={finish}>確認交卷並計分</button><button className="btn" onClick={()=>setConfirm(false)}>繼續作答</button></div></ModalDialog>}
 </>;
}
