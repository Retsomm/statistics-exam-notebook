'use client';
import {useMemo,useState} from 'react';
import notes from '@/data/study-notes.json';
import statistics from '@/data/statistics-course.json';
import processing from '@/data/data-processing-course.json';
import {buildMemoryCards} from '@/lib/memory-cards.mjs';
import MemoryCard from './memory-card';
import {EmptyState} from './study-ui';
const cards=buildMemoryCards([...notes.notes,...statistics.notes,...processing.notes]);
export default function MemoryCollection({saved,onToggle,subjects,canSave}:{saved:string[];onToggle:(id:string)=>void;subjects:string[];canSave:boolean}){
 const [query,setQuery]=useState(''),[subject,setSubject]=useState('all'),[page,setPage]=useState(0);
 const savedSet=useMemo(()=>new Set(saved),[saved]);
 const filtered=cards.filter(card=>savedSet.has(card.id)&&(subject==='all'||card.subjectIndex===Number(subject))&&`${card.term} ${card.front} ${card.back} ${card.sourceTitle}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const current=Math.min(page,Math.max(0,Math.ceil(filtered.length/12)-1)),available=cards.filter(card=>savedSet.has(card.id)).length;
 return <><h2>我的記憶卡片 · {available} 張</h2><p className="text-muted">先回想，再翻面查看。熟悉後可取消收藏，留下還需要複習的觀念。</p><div className="notes-filters"><label>搜尋收藏卡片<input className="search" type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><label>收藏卡片科目<select className="select" value={subject} onChange={e=>{setSubject(e.target.value);setPage(0);}}><option value="all">全部科目</option>{subjects.map((name,index)=><option value={index} key={name}>{name}</option>)}</select></label></div>
 {saved.length>available&&<p className="notice">另有 {saved.length-available} 張收藏暫無對應內容，已保留收藏紀錄。</p>}
 {!filtered.length?<EmptyState title={saved.length?'沒有符合的收藏卡片':'還沒有收藏記憶卡片'} description="在重點整理的記憶卡上選擇「還不熟悉，收藏卡片」，即可加入這裡。"/>:<div className="memory-grid">{filtered.slice(current*12,(current+1)*12).map(card=><MemoryCard key={card.id} card={card} saved canSave={canSave} onToggle={()=>onToggle(card.id)}/>)}</div>}
 {filtered.length>12&&<nav className="word-pagination" aria-label="收藏記憶卡分頁"><button className="btn" disabled={!current} onClick={()=>setPage(current-1)}>上一頁</button><span>{current+1} / {Math.ceil(filtered.length/12)}</span><button className="btn" disabled={(current+1)*12>=filtered.length} onClick={()=>setPage(current+1)}>下一頁</button></nav>}</>;
}
