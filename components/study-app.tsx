'use client';
import {sessionResumeIndex} from '@/lib/session-progress.mjs';
import {prepareQuestionText} from '@/lib/question-text.mjs';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { emptyState, grade, recordAnswer, validateBackup, mergeStates } from '@/lib/study.mjs';
import type { Bank,Question,StudyState,Screen,Exam,CollectionTab,Vocabulary,SavedVocabulary } from '@/lib/types';
import Icon from './icons';
import FavoritesTabs from './favorites-tabs';
import VocabularyCard from './vocabulary-card';
import {vocabularyId} from '@/lib/vocabulary.mjs';
import idiomsData from '@/data/idioms.json';
import IdiomCard from './idiom-card';
import BrandLogo from './brand-logo';
import {brand} from '../lib/brand.mjs';
import ExamCountdown from './exam-countdown';
import {completeAttempt} from '@/lib/attempts.mjs';
import ScoreDashboard from './score-dashboard';
import PracticeResult from './practice-result';
import {PageHeading as Heading,EmptyState,LoadingState,ProgressBar} from './study-ui';
import QuestionList from './question-list';
import {useCloudStudy} from '@/lib/use-cloud-study';
import QuestionPractice from './question-practice';
import ExplanationDialog from './explanation-dialog';
import ReportDialog from './report-dialog';
import QuestionReports from './question-reports';
import {useQuestionReports} from '@/lib/use-question-reports';
import AppUpdateNotice from './app-update-notice';
import {resolveExplanation} from '@/lib/explanation-flow.mjs';
import type {ExplanationSelection} from '@/lib/explanation-flow.mjs';
const MemoryCollection=dynamic(()=>import('./memory-collection'),{loading:()=> <LoadingState inline message="正在打開記憶卡片…"/>});
const StudyNotes=dynamic(()=>import('./study-notes'),{loading:()=> <LoadingState inline message="正在打開重點整理…"/>});
const names:Record<Screen,string>={overview:'學習總覽',bank:'歷屆題庫',wrong:'錯題本',favorites:'收藏與錯題',notes:'重點整理',history:'學習紀錄',settings:'備份與資料',practice:'練習中',reports:'題目回報'};
const tabs:{screen:Screen;icon:string}[]=[{screen:'overview',icon:'home'},{screen:'bank',icon:'chart'},{screen:'notes',icon:'chart'},{screen:'favorites',icon:'star'},{screen:'settings',icon:'settings'}];
const percent=(a:number,b:number)=>b?Math.round(a/b*100):0;

const StudyApp=({accountKey,email,demo=false,signOutAction,uid}:{accountKey:string;email:string;demo?:boolean;signOutAction?:()=>Promise<void>;uid?:string})=>{
  const [bank,setBank]=useState<Bank|null>(null),[study,setStudy]=useState<StudyState>(emptyState),[loaded,setLoaded]=useState(false);
  const [screen,setScreen]=useState<Screen>('overview'),[year,setYear]=useState('all'),[subject,setSubject]=useState('all'),[search,setSearch]=useState(''),[includeMastered,setIncludeMastered]=useState(false),[listPage,setListPage]=useState(0);
  const [collectionTab,setCollectionTab]=useState<CollectionTab>('questions');
  const [vocabulary,setVocabulary]=useState<Record<string,SavedVocabulary>>({});
  const [vocabularyError,setVocabularyError]=useState(false),[vocabularyRetry,setVocabularyRetry]=useState(0);
  const reports=useQuestionReports(accountKey,uid);
  const [reportQuestionId,setReportQuestionId]=useState<string|null>(null);
  const [explanation,setExplanation]=useState<ExplanationSelection|null>(null);
  const [message,setMessage]=useState(''),[error,setError]=useState(''),[saveError,setSaveError]=useState(false),[result,setResult]=useState(false);
  const cloud=useCloudStudy(uid,bank,loaded,study,setStudy,`yueri:next:v1:${accountKey}`,setSaveError);
  const syncLabels={connecting:'正在連接雲端',synced:'雲端已同步',saving:'正在同步',offline:'離線 · 等待同步',error:'同步暫停 · 點此重試'};
  const fileRef=useRef<HTMLInputElement>(null);
  const deferredSearch=useDeferredValue(search.trim().toLowerCase());
  const key=`yueri:next:v1:${accountKey}`;
  const qmap=useMemo(()=>new Map(bank?.questions.map(q=>[q.id,q])||[]),[bank]);
  const emap=useMemo(()=>new Map(bank?.exams.map(e=>[e.id,e])||[]),[bank]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/bank.json',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error(r.status===401?'登入已失效，請重新登入。':'題庫暫時無法載入。');const data:Bank=await r.json();setBank({...data,questions:data.questions.map(prepareQuestionText)});
      const known=new Set(data.questions.map(q=>q.id));
      try{const raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);const restored=validateBackup(parsed,known);if(restored.session&&parsed.session){const map=new Map(data.questions.map(q=>[q.id,q]));for(const id of restored.session.ids){const choice=parsed.session.choices?.[id];if(Array.isArray(choice)&&choice.length&&choice.every(x=>typeof x==='string'&&/^[A-E]$/.test(x))){restored.session.choices[id]=[...new Set<string>(choice)];if(Object.hasOwn(parsed.session.checked||{},id))restored.session.checked[id]=grade(map.get(id)!,choice);}}}setStudy(restored);}}
      catch{setMessage('無法讀取本機舊紀錄，請使用備份檔還原。');}setLoaded(true);
    }).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();
  },[demo,key]);
  useEffect(()=>{
    const controller=new AbortController();setVocabularyError(false);
    fetch('/vocabulary.json',{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('vocabulary');setVocabulary(await response.json());}).catch(error=>{if(error.name!=='AbortError')setVocabularyError(true);});
    return()=>controller.abort();
  },[vocabularyRetry]);
  useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>{try{localStorage.setItem(key,JSON.stringify(study));setSaveError(false);}catch{setSaveError(true);}},150);return()=>clearTimeout(timer);},[study,loaded,key]);
  useEffect(()=>{if(!loaded||!Object.keys(vocabulary).length)return;const aliases=new Map(Object.entries(vocabulary).flatMap(([id,item])=>[[id,id],...(item.legacyIds||[]).map(legacyId=>[legacyId,id] as const)]));const normalized=[...new Set(study.vocabularyBookmarks.map(id=>aliases.get(id)).filter((id):id is string=>!!id))];if(normalized.length!==study.vocabularyBookmarks.length||normalized.some((id,index)=>id!==study.vocabularyBookmarks[index]))cloud.mutate(s=>{s.vocabularyBookmarks=normalized;});},[loaded,vocabulary,study.vocabularyBookmarks,cloud]);
  useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),4000);return()=>clearTimeout(timer);},[message]);
  const update=cloud.mutate;
  // Recover a completed full-paper session if a reload or cloud retry happened after
  // the final answer was saved but before its score snapshot was persisted.
  useEffect(()=>{
    const session=study.session;
    if(!bank||!loaded||!cloud.ready||!session?.attemptId||!session.examId||!session.startedAt)return;
    if(!session.ids.length||!session.ids.every(id=>Object.hasOwn(session.checked,id)))return;
    if(study.attempts.some(attempt=>attempt.id===session.attemptId))return;
    update(state=>{completeAttempt(state,qmap,bank.exams);});
  },[bank,loaded,qmap,study.attempts,study.session,cloud.ready,update]);
  const go=(next:Screen)=>{if(next==='wrong'){next='favorites';setCollectionTab('wrong');}setReportQuestionId(null);setScreen(next);setExplanation(null);setResult(false);setSearch('');setYear('all');setSubject('all');setListPage(0);window.scrollTo({top:0});};
  const start=(qs:Question[],title:string,examId?:string)=>{setExplanation(null);if(!qs.length){setMessage('沒有符合條件的題目。');return;}update(s=>{s.session={...(examId?{examId,attemptId:crypto.randomUUID(),startedAt:new Date().toISOString()}:{}),ids:qs.map(q=>q.id),index:0,title,choices:{},checked:{}};});setScreen('practice');setResult(false);window.scrollTo({top:0});};
  const resumeIndex=sessionResumeIndex(study.session);
  const canResume=resumeIndex!==null;
  const sessionComplete=!!study.session?.ids.length&&!canResume;
  const resumePractice=()=>{
    if(uid&&cloud.status==='connecting'){setMessage('正在讀取雲端練習進度，請稍候再繼續作答。');return;}
    if(study.session){
      if(resumeIndex===null){go('bank');return;}
      update(s=>{if(s.session)s.session.index=resumeIndex;});
      go('practice');
    }else go('bank');
  };
  const startExam=(e:Exam)=>start(bank!.questions.filter(q=>q.examId===e.id),`${e.year} 年 · ${e.subject}`,e.id);
  const star=(id:string)=>update(s=>{s.bookmarks=s.bookmarks.includes(id)?s.bookmarks.filter(x=>x!==id):[...s.bookmarks,id];});
  const explanationStar=(id:string)=>{update(s=>{s.explanationBookmarks=(s.explanationBookmarks||[]).includes(id)?s.explanationBookmarks.filter(x=>x!==id):[...(s.explanationBookmarks||[]),id];});setMessage((study.explanationBookmarks||[]).includes(id)?'已取消收藏解析。':'已加入「收藏解析」，可隨時回看。');};
  const wordStar=(examId:string,item:Vocabulary)=>{const id=vocabularyId(examId,item);update(s=>{s.vocabularyBookmarks=s.vocabularyBookmarks.includes(id)?s.vocabularyBookmarks.filter(word=>word!==id):[...s.vocabularyBookmarks,id];});};
  const idiomStar=(term:string)=>update(s=>{s.idiomBookmarks=s.idiomBookmarks.includes(term)?s.idiomBookmarks.filter(id=>id!==term):[...s.idiomBookmarks,term];});
  const memoryStar=(id:string)=>cloud.replace(state=>({...state,memoryBookmarks:state.memoryBookmarks.includes(id)?state.memoryBookmarks.filter(value=>value!==id):[...state.memoryBookmarks,id]}));
  const collectionCounts={memory:study.memoryBookmarks.length,wrong:Object.keys(study.wrong).filter(id=>study.wrong[id].active&&qmap.has(id)).length,questions:study.bookmarks.length,explanations:study.explanationBookmarks.length,idioms:study.idiomBookmarks.length,words:study.vocabularyBookmarks.length};
  const collectionCount=collectionCounts.memory+collectionCounts.questions+collectionCounts.explanations+collectionCounts.idioms+collectionCounts.words;
  const filterQuestions=(qs:Question[])=>qs.filter(q=>(year==='all'||q.year===+year)&&(subject==='all'||q.subjectIndex===+subject)&&(!deferredSearch||`${q.text} ${q.passage} ${q.subject}`.toLowerCase().includes(deferredSearch)));
  const activeWrong=Object.keys(study.wrong).filter(id=>study.wrong[id].active&&qmap.has(id));
  const random=()=>{const qs=filterQuestions(bank!.questions);for(let i=qs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[qs[i],qs[j]]=[qs[j],qs[i]];}start(qs.slice(0,10),'隨機練習');};
  const exportBackup=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({...study,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${brand.name}_學習備份_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('已匯出學習備份。');};
  const importBackup=async(file:File)=>{try{if(file.size>10*1024*1024)throw Error('請選擇 10 MB 以下的統計研習所 JSON 備份。');const incoming=validateBackup(JSON.parse(await file.text()),new Set(qmap.keys()));cloud.replace(s=>mergeStates(s,incoming));setMessage('已合併備份、題目收藏、解析收藏、記憶卡片、成語收藏、單字收藏、錯題與筆記。');}catch(e){setMessage(e instanceof Error?e.message:'備份匯入失敗。');}};
  if(error)return <main className="loading"><h1>{error}</h1><Link className="btn" href="/sign-in">回到登入頁</Link><button className="btn" onClick={()=>location.reload()}>重新載入</button></main>;
  if(!bank||!loaded)return <LoadingState message="正在載入統計練習資料…"/>;
  if(uid&&!cloud.ready)return <main className="loading" aria-live="polite"><h1>{cloud.status==='error'?'無法讀取雲端進度':cloud.status==='offline'?'目前離線，尚未取得最新進度':'正在讀取雲端最新進度…'}</h1><p>讀取完成後才會顯示練習紀錄，避免接續此裝置的舊回合。本機未同步的作答仍會保留。</p>{cloud.syncError&&<p role="alert">{cloud.syncError}</p>}{(cloud.status==='error'||cloud.status==='offline')&&<button className="btn" onClick={cloud.retry}>重新讀取雲端進度</button>}</main>;
  const explanationProgress=bank.subjects.map((name,index)=>{const papers=bank.exams.filter(e=>e.subjectIndex===index);return `${name} ${papers.reduce((n,e)=>n+(e.explanationCount||0),0)}/${papers.reduce((n,e)=>n+e.count,0)} 題解析`;}).join('；');
  const examYears=[...new Set(bank.exams.map(exam=>exam.year))].sort((a,b)=>b-a);
  const stats=<div className="stats">{[
    ['累積練習',Object.keys(study.records).length,'題',`共 ${bank.questions.length.toLocaleString('zh-TW')} 題`],
    ['作答正確率',study.history.length?percent(study.history.filter(h=>h.correct).length,study.history.length):'—',study.history.length?'%':'','以完全選對判斷'],
    ['待複習錯題',activeWrong.length,'題','重練答對後標記已掌握'],
    ['我的收藏',collectionCount,'項','題目、解析、成語與單字卡'],
  ].map(([label,value,unit,sub])=><section className="stat" key={label}><p className="label">{label}</p><strong>{value}<small>{unit}</small></strong><p>{sub}</p></section>)}</div>;
  const filters=<div className="filters"><div className="tabs" aria-label="科目篩選">{['全部科目',...bank.subjects].map((label,i)=><button key={label} className={`tab ${subject===(i===0?'all':String(i-1))?'active':''}`} onClick={()=>{setSubject(i===0?'all':String(i-1));setListPage(0);}}>{label}</button>)}</div><select className="select" aria-label="選擇年度" value={year} onChange={e=>{setYear(e.target.value);setListPage(0);}}><option value="all">全部年度</option>{examYears.map(y=><option key={y} value={y}>{y} 年</option>)}</select><input className="search" type="search" aria-label="搜尋題目" placeholder="搜尋題目、單字或觀念…" value={search} onChange={e=>{setSearch(e.target.value);setListPage(0);}}/>{screen==='favorites'&&collectionTab==='wrong'&&<label className="checkbox"><input type="checkbox" checked={includeMastered} onChange={e=>setIncludeMastered(e.target.checked)}/>包含已掌握</label>}</div>;
  const list=(questions:Question[],mode:'questions'|'wrong'|'explanations'='questions')=><QuestionList questions={questions} mode={mode} study={study} page={listPage} onPageChange={setListPage} onReport={setReportQuestionId} onBookmark={star} onExplanationBookmark={explanationStar} onViewExplanation={id=>setExplanation({questionId:id,context:'saved'})} onMastered={id=>update(s=>{s.wrong[id].active=!s.wrong[id].active;})} onPractice={q=>start([q],`${q.year} 年 · ${q.subject} · 第 ${q.number} 題`)} onOpenBank={()=>go('bank')}/>;
  const exams=(items:Exam[])=><div className="exam-cards">{items.map(e=>{const done=bank.questions.filter(q=>q.examId===e.id&&study.records[q.id]).length;return <article className="exam-card" key={e.id}><div className="exam-meta"><span className="exam-year">{e.year}</span><span className="text-muted">年公務人員初等考試</span></div><h3>{e.subject}</h3><p className="text-muted">{e.count} 題 {e.explanationCount===e.count?' · 逐題解析已完成':` · 已有 ${e.explanationCount||0} 題解析`} {e.correctionPdf?' · 已套用官方更正':''}</p>{e.practiceNote&&<p className="notice">{e.practiceNote}</p>}{e.explanationStatus==='pending'&&<p className="notice">新收錄試卷：可依官方答案作答與計分，逐題解析尚未編寫。{e.subjectIndex===0&&'文言文翻譯與字詞說明可於「查看解析」閱讀。'}</p>}<ProgressBar value={done} total={e.count} label={`${e.year} 年 ${e.subject} 練習進度`}/><footer><small>已練習 {done} / {e.count} 題</small><button className="btn" onClick={()=>startExam(e)}>開始練習 →</button></footer></article>;})}</div>;
  const savedExplanations=filterQuestions([...(study.explanationBookmarks||[])].reverse().map(id=>qmap.get(id)).filter((q):q is Question=>!!q));
  let content:React.ReactNode;
  if(screen==='overview')content=<><Heading title="歡迎回到你的考試練習。" sub="從一題一題的練習，建立穩定的考場實力。"/><ExamCountdown/>{stats}<ScoreDashboard bank={bank} study={study} onPractice={startExam}/><div className="hero-grid"><section className="hero"><p className="eyebrow">STATISTICS PRACTICE LAB</p><h2>{canResume?'接續尚未完成的練習。':sessionComplete?'這回合已完成，開始下一輪練習。':<>從每一題開始，<br/>走向想要的成績。</>}</h2><p>{canResume?study.session!.title:sessionComplete?'選擇年度與科目，開始新的練習。':'把每次作答化為可追蹤的學習趨勢。'}</p><div className="data-art" aria-hidden="true"/><button className="btn light" onClick={resumePractice}>{canResume?'繼續練習':sessionComplete?'開始新的刷題':'開始今日練習'} →</button></section><section className="focus-card"><div><span className="mini-tag">每天一點，剛剛好</span><h3>{activeWrong.length?'再見一次，就更熟悉一次。':'給自己 10 題的時間。'}</h3><p>{activeWrong.length?`錯題本裡有 ${activeWrong.length} 題等你重新讀懂。`:'隨機抽出 10 題，用一小段時間建立答題判斷。'}</p></div><button className="link" onClick={activeWrong.length?()=>start(activeWrong.map(id=>qmap.get(id)!), '錯題重練'):random}>{activeWrong.length?'開始錯題複習':'隨機練習 10 題'} →</button></section></div><div className="section-head"><h2>依科目練習</h2></div><div className="subjects">{bank.subjects.map((s,i)=><button className="subject-card" key={s} onClick={()=>{go('bank');setSubject(String(i));}}><span className="subject-icon"><Icon name="chart"/></span><h3>{s}</h3><p>9 份歷屆試卷 · {bank.questions.filter(question=>question.subjectIndex===i).length} 題</p><span className="link">進入題庫 →</span></button>)}</div><div className="section-head"><h2>最新年度 · 115 年</h2><button className="link" onClick={()=>go('bank')}>全部年度 →</button></div>{exams(bank.exams.filter(e=>e.year===115))}</>;
  else if(screen==='bank')content=<><Heading title="歷屆題庫" sub={`${examYears.length} 個年度、${bank.exams.length} 份試卷，共 ${bank.questions.length.toLocaleString("zh-TW")} 題。${explanationProgress}。`}/>{filters}<div className="section-head"><h2>{deferredSearch?'搜尋結果':'依年度練習'}</h2><button className="btn primary" onClick={random}>隨機練習 10 題</button></div>{deferredSearch?list(filterQuestions(bank.questions)):exams(bank.exams.filter(e=>(year==='all'||e.year===+year)&&(subject==='all'||e.subjectIndex===+subject)))}</>;
  else if(screen==='notes')content=<StudyNotes canSaveMemory={cloud.ready} savedMemory={study.memoryBookmarks} onToggleMemory={memoryStar} bank={bank} vocabulary={vocabulary} vocabularyError={vocabularyError} onRetryWords={()=>setVocabularyRetry(value=>value+1)} savedWords={study.vocabularyBookmarks} savedIdioms={study.idiomBookmarks} onToggleWord={wordStar} onToggleIdiom={idiomStar} onPractice={start} onViewExplanation={id=>setExplanation({questionId:id,context:'notes'})}/>;
  else if(screen==='favorites'){
    const wrongQuestions=filterQuestions(Object.keys(study.wrong).filter(id=>includeMastered||study.wrong[id].active).map(id=>qmap.get(id)).filter((q):q is Question=>!!q));
    const savedQuestions=filterQuestions([...study.bookmarks].reverse().map(id=>qmap.get(id)).filter((q):q is Question=>!!q));
    const savedWords=[...study.vocabularyBookmarks].reverse().map(id=>({id,item:vocabulary[id]})).filter(({item})=>item&&(!deferredSearch||`${item.word} ${item.meaning} ${item.partOfSpeech} ${item.usage}`.toLowerCase().includes(deferredSearch)));
    const savedIdioms=[...study.idiomBookmarks].reverse().map(term=>idiomsData.entries.find(entry=>entry.term===term)).filter((entry):entry is typeof idiomsData.entries[number]=>!!entry&&(!deferredSearch||`${entry.term} ${entry.meaning} ${entry.example}`.toLowerCase().includes(deferredSearch)));
    content=<><Heading title="收藏與錯題" sub="待複習的錯題、收藏的記憶卡片、題目、解析、成語與單字，都在這裡。"/>
      <FavoritesTabs value={collectionTab} counts={collectionCounts} onChange={tab=>{setCollectionTab(tab);setExplanation(null);setSearch('');setYear('all');setSubject('all');setListPage(0);}}/>
      <section id="favorites-panel" role="tabpanel" aria-labelledby={`favorites-tab-${collectionTab}`} tabIndex={0}>
      {collectionTab==='memory'?<MemoryCollection canSave={cloud.ready} saved={study.memoryBookmarks} onToggle={memoryStar} subjects={bank.subjects}/>:collectionTab==='wrong'?<>{filters}<p className="text-muted">重練完全答對後會自動標為已掌握；也可以手動標記。</p><div className="section-head"><h2>錯題複習清單 · {wrongQuestions.length} 題</h2><button className="btn primary" disabled={!wrongQuestions.length} onClick={()=>start(wrongQuestions,'錯題重練')}>練習這份清單</button></div>{list(wrongQuestions,'wrong')}</>:
       collectionTab==='questions'?<>{filters}<div className="section-head"><h2>我的題目收藏 · {savedQuestions.length} 題</h2><button className="btn primary" disabled={!savedQuestions.length} onClick={()=>start(savedQuestions,'收藏練習')}>練習這份清單</button></div>{list(savedQuestions)}</>:
       collectionTab==='explanations'?<>{filters}<div className="section-head"><h2>我的解析收藏 · {savedExplanations.length} 則</h2></div>{study.explanationBookmarks.length?list(savedExplanations,'explanations'):<EmptyState icon="chart" title="還沒有收藏解析" description="作答後點「查看解析」，再於彈窗底部選擇「收藏解析」，就能在這裡回看完整內容。"><button className="btn primary" onClick={()=>go('bank')}>前往題庫</button></EmptyState>}</>:
       collectionTab==='idioms'?<><div className="filters"><input className="search" type="search" aria-label="搜尋收藏成語" placeholder="搜尋成語、意思或例句…" value={search} onChange={event=>{setSearch(event.target.value);setListPage(0);}}/></div><div className="section-head"><h2>我的成語收藏 · {savedIdioms.length} 筆</h2></div>{!study.idiomBookmarks.length?<EmptyState icon="chart" title="還沒有收藏成語" description="在國文的「歷屆成語庫」中，點選收藏成語即可加入這裡。"><button className="btn primary" onClick={()=>go('notes')}>前往成語庫</button></EmptyState>:!savedIdioms.length?<EmptyState title="沒有符合的收藏成語" description="試試其他成語、意思或例句關鍵字。"/>:<><div className="notes-grid">{savedIdioms.slice(listPage*20,(listPage+1)*20).map(entry=><IdiomCard key={entry.term} entry={entry} year="all" questions={qmap} exams={emap} saved onToggleSave={()=>idiomStar(entry.term)} onPractice={start} onViewExplanation={id=>setExplanation({questionId:id,context:'notes'})}/>)}</div>{savedIdioms.length>20&&<nav className="word-pagination" aria-label="收藏成語分頁"><button className="btn" disabled={listPage===0} onClick={()=>setListPage(page=>page-1)}>上一頁</button><span>{listPage+1} / {Math.ceil(savedIdioms.length/20)}</span><button className="btn" disabled={(listPage+1)*20>=savedIdioms.length} onClick={()=>setListPage(page=>page+1)}>下一頁</button></nav>}</>}</>:
       <><div className="filters"><input className="search" type="search" aria-label="搜尋收藏單字" placeholder="搜尋英文、中文意思或例句…" value={search} onChange={event=>{setSearch(event.target.value);setListPage(0);}}/></div><div className="section-head"><h2>我的單字卡 · {savedWords.length} 張</h2></div><p className="text-muted">先試著回想意思，再點「顯示中文與例句」翻開字卡。</p>
       {vocabularyError?<div role="alert"><p>單字卡暫時無法載入，你的收藏仍保留。</p><button className="btn" onClick={()=>setVocabularyRetry(value=>value+1)}>重新載入單字卡</button></div>:
        !study.vocabularyBookmarks.length?<EmptyState icon="chart" title="還沒有收藏單字" description="在英文題目的解析裡，點單字旁的「收藏」，就會加入這裡。"><button className="btn primary" onClick={()=>{go('bank');setSubject('1');}}>前往英文題庫</button></EmptyState>:
        !Object.keys(vocabulary).length?<LoadingState inline message="正在載入收藏單字…"/>:
        !savedWords.length?<EmptyState title="沒有符合的收藏單字" description="試試其他英文單字或中文關鍵字。"/>:
        <><dl className="vocabulary-explanations saved-vocabulary">{savedWords.slice(listPage*20,(listPage+1)*20).map(({id,item})=>{const q=qmap.get(item.questionId);return <VocabularyCard key={id} item={item} saved review onToggle={()=>{wordStar('',item);setListPage(page=>Math.min(page,Math.max(0,Math.ceil((savedWords.length-1)/20)-1)));}} source={q?`${q.year} 年 · 第 ${q.number} 題`:undefined} onSource={q?()=>start([q],`${q.year} 年 · ${q.subject} · 第 ${q.number} 題`):undefined}/>;})}</dl>{savedWords.length>20&&<div className="word-pagination"><button className="btn" disabled={listPage===0} onClick={()=>setListPage(page=>page-1)}>上一頁</button><span>{listPage+1} / {Math.ceil(savedWords.length/20)}</span><button className="btn" disabled={(listPage+1)*20>=savedWords.length} onClick={()=>setListPage(page=>page+1)}>下一頁</button></div>}</>}
       </>}
      </section></>;
  }else if(screen==='reports'){content=<><button className="btn" style={{marginBottom:20}} onClick={()=>go('settings')}>← 返回備份與資料</button><QuestionReports reports={reports.reports} signedIn={!!uid} message={reports.message} onRetry={reports.retry} onOpen={id=>{const q=qmap.get(id);if(q)start([q],'回報題目查核');}}/></>;}
  else if(screen==='practice'&&study.session){
    const session=study.session,q=qmap.get(session.ids[session.index])!;
    const incorrect=session.ids.filter(id=>Object.hasOwn(session.checked,id)&&!session.checked[id]),remaining=session.ids.filter(id=>!Object.hasOwn(session.checked,id));
    content=result?<PracticeResult session={session} questions={qmap} bank={bank} onRepeat={()=>start(session.ids.map(id=>qmap.get(id)!),session.title,session.examId)} onDashboard={()=>{go('overview');requestAnimationFrame(()=>document.getElementById('score-dashboard-title')?.scrollIntoView({block:'start'}));}}>{incorrect.length>0&&<button className="btn primary" onClick={()=>start(incorrect.map(id=>qmap.get(id)!), '本回合錯題')}>重練錯題</button>}{remaining.length>0&&<button className="btn" onClick={()=>{update(s=>{s.session!.index=session.ids.indexOf(remaining[0]);});setResult(false);}}>繼續未答題目</button>}<button className="btn" onClick={()=>go('overview')}>回到總覽</button></PracticeResult>:<QuestionPractice key={q.id} question={q} exam={emap.get(q.examId)!} session={session} study={study} onStar={()=>star(q.id)} onReport={()=>setReportQuestionId(q.id)} onViewExplanation={()=>setExplanation({questionId:q.id,context:'practice'})} onNote={value=>update(s=>{s.notes[q.id]=value;})} onChoice={letter=>update(s=>{if(Object.hasOwn(s.session!.checked,q.id))return;const choices=s.session!.choices[q.id]||[];s.session!.choices[q.id]=q.multi?(choices.includes(letter)?choices.filter(l=>l!==letter):[...choices,letter].sort()):[letter];})} onSubmit={()=>update(s=>{if(Object.hasOwn(s.session!.checked,q.id))return;const choices=s.session!.choices[q.id]||[];if(choices.length)s.session!.checked[q.id]=recordAnswer(s,q,choices);completeAttempt(s,qmap,bank.exams);})} onMove={index=>{setExplanation(null);update(s=>{s.session!.index=Math.max(0,Math.min(index,s.session!.ids.length-1));});window.scrollTo({top:0});}} onFinish={()=>{update(s=>{completeAttempt(s,qmap,bank.exams);});setExplanation(null);setResult(true);window.scrollTo({top:0});}}/>;
  }else if(screen==='history')content=<><Heading title="學習紀錄" sub="每一次思考，都留下前進的痕跡。"/>{stats}<div className="bank-panel">{study.history.length?study.history.slice(0,100).map((h,i)=>{const q=qmap.get(h.id)!;return <article className="history-row" key={`${h.time}-${i}`}><span className={`result ${h.correct?'':'error'}`}><Icon name={h.correct?'check':'close'}/></span><button className="link" onClick={()=>start([q],`${q.year} 年 · 第 ${q.number} 題`)}>{q.year} 年 · {q.subject} · 第 {q.number} 題</button><span className="badge">{h.correct?'答對':'待複習'} · {h.answer}</span><time className="time">{new Date(h.time).toLocaleString('zh-TW')}</time></article>;}):<EmptyState title="還沒有學習紀錄" description="開始練習後，這裡就會記下你的學習足跡。"/>}</div></>;
  else content=<><Heading title="備份與資料" sub="好好保存每一點累積。"/><div className="settings-grid"><section className="settings-card"><h2>我的學習備份</h2><p>{demo?'訪客紀錄保存在目前瀏覽器。登入 Google 後可匯入備份並同步到其他裝置。':'錯題、收藏、筆記、作答紀錄與練習進度會依 Google 帳號自動同步。離線時先保留在本機，恢復連線後再上傳。同一欄位同時修改時，以最後成功同步的修改為準。每題保留最近 500 筆作答，總覽最多顯示 10,000 筆。'}</p><button className="btn primary" onClick={exportBackup}>匯出備份</button><button className="btn" onClick={()=>fileRef.current?.click()}>匯入備份</button><p className="notice">舊版 Sites 的紀錄可先匯出 JSON，再於此匯入，錯題與收藏會合併保存。</p></section><section className="settings-card"><h2>官方試題與答案</h2><p>本站保留 {bank.questions.length.toLocaleString('zh-TW')} 題文字題庫與解析。每題的「官方原卷 PDF」與作答後的「官方標準答案 PDF」可直接開啟考選部原始檔；圖表不另存於本站。若來源暫時無法開啟，可回報題目問題。</p><a className="btn" href="https://wwwq.moex.gov.tw/exam/wFrmExamQandASearch.aspx" target="_blank" rel="noopener noreferrer">考選部試題查詢 ↗</a></section></div><section className="settings-card" style={{marginTop:20}}><h2>題目問題回報</h2><p>查看已回報的題目、同步狀態與查核結果，也可以複製或匯出回報紀錄。</p><button className="btn" onClick={()=>go('reports')}>查看回報紀錄 · {reports.reports.length} 筆</button></section><section className="settings-card" style={{marginTop:20}}><h2>帳戶與來源</h2><p>{email}</p>{demo?<Link className="btn" href="/sign-in">Google 登入</Link>:signOutAction&&<button className="btn" onClick={()=>void signOutAction()}>登出</button>}<button className="btn" onClick={()=>go('history')}>查看學習紀錄</button><p className="notice">本站使用 Next.js；題目與答案來自考選部。歷年法規題保留當年內容，準備新考試時請另核對最新規定。國文複選題已按官方規則計部分分數；錯題本仍以完全選對才算掌握。</p>{examYears.map(y=><a key={y} className="btn ghost" href={`https://wwwq.moex.gov.tw/exam/wFrmExamQandASearch.aspx?e=${y}010&y=${y+1911}`} target="_blank" rel="noopener noreferrer">{y} 年官方來源 ↗</a>)}</section></>;
  // Every entry point resolves through the same bank, session and dialog host.
  const explanationTarget=resolveExplanation(explanation,{questions:qmap,session:study.session,screen,collectionTab,result,savedIds:savedExplanations.map(q=>q.id)});
  const nextExplanation=()=>{
    if(!explanationTarget||explanationTarget.context==='notes')return;
    if(explanationTarget.context==='saved'){
      if(explanationTarget.nextId)setExplanation({questionId:explanationTarget.nextId,context:'saved'});
      return;
    }
    setExplanation(null);
    if(explanationTarget.isLast)setResult(true);
    else update(s=>{if(s.session)s.session.index+=1;});
    window.scrollTo({top:0});
  };
  return <><a className="skip-link" href="#main-content">跳到主要內容</a><aside className="sidebar"><button className="brand" onClick={()=>go('overview')}><BrandLogo/></button><div className="navlabel">我的學習空間</div><nav aria-label="主要導覽">{tabs.map(t=><button key={t.screen} className={`navitem ${(screen===t.screen||(screen==='reports'&&t.screen==='settings'))?'active':''}`} onClick={()=>go(t.screen)} aria-current={screen===t.screen||(screen==='reports'&&t.screen==='settings')?'page':undefined}><Icon name={t.icon}/><span>{names[t.screen]}</span>{t.screen==='wrong'?<span className="count">{activeWrong.length}</span>:t.screen==='favorites'?<span className="count">{collectionCount+activeWrong.length}</span>:null}</button>)}</nav><div className="sidebar-bottom"><p className="sidebar-note">穩定練習，清楚作答。<span>初等考試 · 統計</span></p></div></aside><main className="shell" id="main-content"><header className="topbar"><p className="crumb">統計儀表板 / {screen==='reports'?'備份與資料 / 題目回報':names[screen]}</p><div className="top-actions"><button className="source-pill" onClick={cloud.retry} aria-label={demo?'訪客模式，本機保存':syncLabels[cloud.status]}>{demo?'訪客模式 · 本機保存':syncLabels[cloud.status]}</button><button className="avatar" aria-label="帳戶與備份設定" onClick={()=>go('settings')}>統</button></div></header><AppUpdateNotice storageKey={key} study={study} ready={loaded} canReload={demo||cloud.status!=='connecting'}/>{cloud.syncError&&<p className="notice" role="alert">{cloud.syncError} 最新作答尚未確認送達雲端，其他裝置可能仍顯示舊資料。<button className="btn" onClick={cloud.retry}>重新讀取並同步</button></p>}{saveError&&<p className="notice" role="alert">目前無法儲存到瀏覽器，請立即匯出備份。</p>}{content}<footer className="app-footer"><span>{brand.name} · 每一題，都是通往目標的累積。</span><button className="link" onClick={()=>go('settings')}>帳戶、備份與官方來源</button></footer></main>{message&&<div className="react-toast" role="status">{message}</div>}<input hidden ref={fileRef} type="file" accept="application/json,.json" aria-label="匯入統計備份" onChange={e=>{const file=e.target.files?.[0];if(file)void importBackup(file);e.target.value='';}}/>{explanationTarget&&<ExplanationDialog key={explanationTarget.question.id} savedWords={study.vocabularyBookmarks} onToggleWord={item=>wordStar(explanationTarget.question.examId,item)} question={explanationTarget.question} onReport={()=>{setExplanation(null);setReportQuestionId(explanationTarget.question.id);}} bookmarked={(study.explanationBookmarks||[]).includes(explanationTarget.question.id)} onBookmark={()=>explanationStar(explanationTarget.question.id)} onClose={()=>setExplanation(null)} onNext={explanationTarget.context==='practice'||explanationTarget.nextId?nextExplanation:undefined} nextLabel={explanationTarget.context==='practice'&&explanationTarget.isLast?'查看本回合結果':'下一題 →'}/>}

{reportQuestionId&&qmap.has(reportQuestionId)&&<ReportDialog key={reportQuestionId} question={qmap.get(reportQuestionId)!} exam={emap.get(qmap.get(reportQuestionId)!.examId)!} answer={study.session?.choices[reportQuestionId]} signedIn={!!uid} onSave={reports.add} onClose={()=>setReportQuestionId(null)}/>}</>;
};
export default StudyApp;
