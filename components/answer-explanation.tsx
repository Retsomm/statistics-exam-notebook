'use client';
import {useEffect,useState} from 'react';
import type {Question,QuestionExplanation,Vocabulary} from '@/lib/types';
import idiomData from '@/data/idioms.json';
import {idiomsInText} from '@/lib/idioms.mjs';
import IdiomLearning from './idiom-learning';
import VocabularyCard from './vocabulary-card';
import {vocabularyId} from '@/lib/vocabulary.mjs';
import QuestionText from './question-text';
import ExplanationDiagram from './explanation-diagram';
const ExplanationText=({text}:{text:string})=><>{text.split(/(`[^`\n]+`)/).filter(Boolean).map((part,index)=>part.startsWith('`')&&part.endsWith('`')?<code className="explanation-inline-code" key={index}>{part.slice(1,-1)}</code>:part)}</>;
const AnswerExplanation=({question:q,onAvailabilityChange,savedWords=[],onToggleWord}:{question:Question;onAvailabilityChange?:(ready:boolean)=>void;savedWords?:string[];onToggleWord?:(item:Vocabulary)=>void})=>{
 const [entry,setEntry]=useState<QuestionExplanation|null>(null),[status,setStatus]=useState<'loading'|'ready'|'missing'|'error'>('loading'),[retry,setRetry]=useState(0);
 const optionIdioms=q.options.map(option=>q.subjectIndex===0?idiomsInText(idiomData.entries,option.text):[]);
 const optionTerms=new Set(optionIdioms.flat().map(item=>item.term));
 const contextIdioms=q.subjectIndex===0?idiomsInText(idiomData.entries,[q.stem,q.passage].join(" ")).filter(item=>!optionTerms.has(item.term)):[];
 useEffect(()=>{
  const controller=new AbortController();setStatus('loading');onAvailabilityChange?.(false);
  void fetch(`/explanations/${q.examId}.json`,{signal:controller.signal}).then(async response=>{
   if(response.status===404){setStatus('missing');return;}
   if(!response.ok)throw Error('load');
   const entries=await response.json(),item=entries[q.id];
   if(!item){setStatus('missing');return;}
   setEntry(item);setStatus('ready');onAvailabilityChange?.(true);
  }).catch(error=>{if(error.name!=='AbortError')setStatus('error');});
  return()=>controller.abort();
 },[q.id,q.examId,retry,onAvailabilityChange]);
 return <section className="answer-explanation" aria-label="作答後題目解析"><h2>題目解析</h2><p className="explanation-edition">白話詳解版</p>
  {status==='loading'?<p role="status">正在載入解析…</p>:status==='missing'?<p>本題解析尚在編寫中，請先參考上方官方答案。</p>:status==='error'?<><p role="alert">解析暫時無法載入。</p><button className="btn" onClick={()=>setRetry(n=>n+1)}>重新載入解析</button></>:entry&&<>
   {entry.classical&&<section className="passage-translation" aria-label="文言文白話翻譯">{entry.classical.translation&&<><h3>文言文完整白話翻譯</h3>{entry.classical.translation.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</>}<h3>重要字詞與語助詞</h3><p>{entry.classical.vocabulary}</p>{entry.classical.optionTranslations&&<><h3>各選項原句白話翻譯</h3>{q.options.filter(option=>entry.classical!.optionTranslations?.[option.letter]).map(option=><section key={option.letter}><h4>（{option.letter}）{option.text}</h4><p>{entry.classical!.optionTranslations![option.letter]}</p></section>)}</>}</section>}
   {!entry.summary&&<p className="notice">本題已提供古文白話翻譯與字詞說明；完整的答案判斷及逐選項解題理由仍在編寫中。</p>}
   {entry.passageTranslation&&<section className="passage-translation" aria-label="題組全文翻譯"><h3>題組全文翻譯</h3>{entry.passageTranslation.paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}<p className="explanation-note">{entry.passageTranslation.note}</p></section>}
   <div className="explanation-summary">{entry.summary.split(/\n\s*\n/).filter(paragraph=>paragraph.trim()).map((paragraph,index)=><p key={index}><ExplanationText text={paragraph}/></p>)}</div>
   {entry.diagram&&<ExplanationDiagram diagram={entry.diagram}/>}
   {!!contextIdioms.length&&<section aria-label="題幹與文章成語"><h3>題幹與文章成語</h3>{contextIdioms.map(item=><IdiomLearning key={item.term} entry={item} showTerm/>)}</section>}
   {!!Object.keys(entry.options).length&&<><h3>逐選項詳解</h3><dl className="option-explanations">{q.options.map((option,index)=><div key={option.letter}><dt><span className="option-explanation-letter">（{option.letter}）</span><QuestionText className="option-explanation-text" text={option.text}/></dt><dd>{entry.optionVerdicts?.[option.letter]&&<p className="explanation-verdict">{entry.optionVerdicts[option.letter]}</p>}{optionIdioms[index].map(item=><IdiomLearning key={item.term} entry={item} showTerm/>)}{!!optionIdioms[index].length&&<h4>本選項的用法判斷</h4>}<p><ExplanationText text={entry.options[option.letter]}/></p></dd></div>)}</dl></>}
   {[{title:"題幹與選項單字／片語",items:entry.questionVocabulary},{title:q.passage?"文章重點單字／片語":"延伸單字／片語",items:entry.vocabulary}].map(({title,items})=>!!items?.length&&<section key={title} aria-label={title}><h3>{title}</h3><dl className="vocabulary-explanations">{items.map(item=><VocabularyCard key={vocabularyId(q.examId,item)} item={item} saved={savedWords.includes(vocabularyId(q.examId,item))} onToggle={()=>onToggleWord?.(item)}/>)}</dl></section>)}
   {!!entry.sources?.length&&<div className="explanation-sources"><h3>延伸查證</h3>{entry.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</div>}
   <p className="explanation-note">解析為本站編寫的學習說明，標準答案以考選部公告為準。</p>
  </>}
 </section>;
};
export default AnswerExplanation;
