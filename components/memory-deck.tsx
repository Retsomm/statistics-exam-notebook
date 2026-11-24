'use client';
import {useEffect,useState} from 'react';
import type {MemoryCard as Card} from '@/lib/memory-cards.mjs';
import MemoryCard from './memory-card';
import {ProgressBar} from './study-ui';
export default function MemoryDeck({cards,saved,onToggle,canSave,onRead,progressKey}:{cards:Card[];saved:ReadonlySet<string>;onToggle:(id:string)=>void;canSave:boolean;onRead?:(card:Card)=>void;progressKey?:string}){
 const [index,setIndex]=useState(0),[revealedFor,setRevealedFor]=useState<string|null>(null),[ratings,setRatings]=useState<Record<string,'review'|'known'>>({});
 const [saveFailed,setSaveFailed]=useState(false);
 useEffect(()=>{if(!progressKey)return;try{
  const raw=localStorage.getItem(progressKey);if(!raw)return;
  // Older versions stored only the current card ID.
  const progress=raw.startsWith('{')?JSON.parse(raw):{cardId:raw};
  const restored=cards.findIndex(item=>item.id===progress.cardId);setIndex(restored<0?0:restored);
  setRevealedFor(typeof progress.revealedFor==='string'?progress.revealedFor:null);
  const restoredRatings:Record<string,'review'|'known'>={};
  if(progress.ratings&&typeof progress.ratings==='object')for(const item of cards){const value=progress.ratings[item.id];if(value==='review'||value==='known')restoredRatings[item.id]=value;}
  setRatings(restoredRatings);
 }catch{setSaveFailed(true);}},[progressKey]);
 const persist=(cardId:string,revealedFor:string|null,nextRatings:Record<string,'review'|'known'>)=>{
  if(!progressKey)return;
  try{localStorage.setItem(progressKey,JSON.stringify({version:1,cardId,revealedFor,ratings:nextRatings}));setSaveFailed(false);}catch{setSaveFailed(true);}
 };
 const current=Math.min(index,Math.max(0,cards.length-1)),card=cards[current];
 if(!card)return null;
 const scopedRatings=cards.flatMap(item=>ratings[item.id]?[ratings[item.id]]:[]);
 const revealed=revealedFor===card.id,reviewCount=scopedRatings.filter(value=>value==='review').length,knownCount=scopedRatings.filter(value=>value==='known').length;
 const move=(next:number)=>{const position=Math.max(0,Math.min(cards.length-1,next));setIndex(position);setRevealedFor(null);persist(cards[position].id,null,ratings);};
 const rate=(value:'review'|'known')=>{
  const nextRatings={...ratings,[card.id]:value};setRatings(nextRatings);
  if(value==='review'&&!saved.has(card.id))onToggle(card.id);
  const next=Math.min(current+1,cards.length-1);setIndex(next);setRevealedFor(null);persist(cards[next].id,null,nextRatings);
 };
 return <section className="memory-deck" aria-label="逐張記憶卡複習" onKeyDown={event=>{if(event.key==='ArrowLeft'&&current>0){event.preventDefault();move(current-1);}else if(event.key==='ArrowRight'&&current<cards.length-1){event.preventDefault();move(current+1);}}}>
  <div className="memory-deck-top"><p role="status" aria-live="polite">第 {current+1} / {cards.length} 張</p><button className="link" onClick={()=>{setIndex(0);setRevealedFor(null);setRatings({});persist(cards[0].id,null,{});}}>重新複習</button></div>
  <ProgressBar value={current+1} total={cards.length} label="記憶卡進度"/>
  <MemoryCard key={card.id} card={card} saved={saved.has(card.id)} onToggle={()=>onToggle(card.id)} canSave={canSave} revealed={revealed} onFlip={()=>{const next=revealed?null:card.id;setRevealedFor(next);persist(card.id,next,ratings);}} onRead={onRead?()=>onRead(card):undefined}/>
  <nav className="memory-deck-controls" aria-label="記憶卡操作"><button className="btn" disabled={current===0} onClick={()=>move(current-1)}>上一張</button><button className="btn memory-review" disabled={!revealed||!canSave} onClick={()=>rate('review')}>還不熟悉 · {reviewCount}</button><button className="btn memory-known" disabled={!revealed} onClick={()=>rate('known')}>記住了 · {knownCount}</button><button className="btn" disabled={current===cards.length-1} onClick={()=>move(current+1)}>下一張</button></nav>
  
  {progressKey&&}
  {saveFailed&&<p className="notice" role="alert">無法讀取或儲存卡片進度，重新開啟後可能無法接續。</p>}
  {scopedRatings.length===cards.length&&<p className="notice" role="status">本輪已全部自評：記住 {knownCount} 張，還需複習 {reviewCount} 張。</p>}
 </section>;
}
