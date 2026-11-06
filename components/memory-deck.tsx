'use client';
import {useState} from 'react';
import type {MemoryCard as Card} from '@/lib/memory-cards.mjs';
import MemoryCard from './memory-card';
import {ProgressBar} from './study-ui';
export default function MemoryDeck({cards,saved,onToggle,canSave,onRead}:{cards:Card[];saved:ReadonlySet<string>;onToggle:(id:string)=>void;canSave:boolean;onRead?:(card:Card)=>void}){
 const [index,setIndex]=useState(0),[revealedFor,setRevealedFor]=useState<string|null>(null),[ratings,setRatings]=useState<Record<string,'review'|'known'>>({});
 const current=Math.min(index,Math.max(0,cards.length-1)),card=cards[current];
 if(!card)return null;
 const scopedRatings=cards.flatMap(item=>ratings[item.id]?[ratings[item.id]]:[]);
 const revealed=revealedFor===card.id,reviewCount=scopedRatings.filter(value=>value==='review').length,knownCount=scopedRatings.filter(value=>value==='known').length;
 const move=(next:number)=>{setIndex(Math.max(0,Math.min(cards.length-1,next)));setRevealedFor(null);};
 const rate=(value:'review'|'known')=>{
  setRatings(previous=>({...previous,[card.id]:value}));
  if(value==='review'&&!saved.has(card.id))onToggle(card.id);
  if(current<cards.length-1)move(current+1);else setRevealedFor(null);
 };
 return <section className="memory-deck" aria-label="逐張記憶卡複習" onKeyDown={event=>{if(event.key==='ArrowLeft'&&current>0){event.preventDefault();move(current-1);}else if(event.key==='ArrowRight'&&current<cards.length-1){event.preventDefault();move(current+1);}}}>
  <div className="memory-deck-top"><p role="status" aria-live="polite">第 {current+1} / {cards.length} 張</p><button className="link" onClick={()=>{setIndex(0);setRevealedFor(null);setRatings({});}}>重新複習</button></div>
  <ProgressBar value={current+1} total={cards.length} label="記憶卡進度"/>
  <MemoryCard key={card.id} card={card} saved={saved.has(card.id)} onToggle={()=>onToggle(card.id)} canSave={canSave} revealed={revealed} onFlip={()=>setRevealedFor(previous=>previous===card.id?null:card.id)} onRead={onRead?()=>onRead(card):undefined}/>
  <nav className="memory-deck-controls" aria-label="記憶卡操作"><button className="btn" disabled={current===0} onClick={()=>move(current-1)}>上一張</button><button className="btn memory-review" disabled={!revealed||!canSave} onClick={()=>rate('review')}>還不熟悉 · {reviewCount}</button><button className="btn memory-known" disabled={!revealed} onClick={()=>rate('known')}>記住了 · {knownCount}</button><button className="btn" disabled={current===cards.length-1} onClick={()=>move(current+1)}>下一張</button></nav>
  <p className="memory-deck-help">點卡片翻面；左右方向鍵可換卡。「還不熟悉」會收藏並換下一張。「記住了」僅記錄本輪自評，不會取消收藏。</p>
  {scopedRatings.length===cards.length&&<p className="notice" role="status">本輪已全部自評：記住 {knownCount} 張，還需複習 {reviewCount} 張。</p>}
 </section>;
}
