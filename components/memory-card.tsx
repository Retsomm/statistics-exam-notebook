'use client';
import {useId,useState} from 'react';
import type {MemoryCard as Card} from '@/lib/memory-cards.mjs';
export default function MemoryCard({card,saved,onToggle,onRead,canSave=true}:{card:Card;saved:boolean;onToggle:()=>void;onRead?:()=>void;canSave?:boolean}){
 const [revealed,setRevealed]=useState(false),id=useId();
 return <article className={`memory-card${saved?' memory-card-saved':''}`} aria-labelledby={`${id}-title`}>
  <p className="eyebrow">{card.sourceTitle}</p><h3 id={`${id}-title`}>{card.term}</h3>
  <p className="memory-card-question">{card.front}</p>
  <button className="btn primary" aria-expanded={revealed} aria-controls={`${id}-answer`} onClick={()=>setRevealed(value=>!value)}>{revealed?'收起說明，重新回想':'翻面查看說明'}</button>
  <div className="memory-card-answer" id={`${id}-answer`} hidden={!revealed}><h4>觀念說明</h4><p>{card.back}</p>{onRead&&<button className="link" onClick={onRead}>閱讀完整重點</button>}</div>
  <div className="memory-card-actions"><button className="btn" disabled={!canSave} aria-pressed={saved} aria-label={`${saved?'取消收藏':'收藏卡片'}：${card.term}`} onClick={onToggle}>{saved?'已收藏，點此取消':'還不熟悉，收藏卡片'}</button><small>{!canSave?'正在讀取雲端收藏，請稍候':saved?'已加入收藏複習':'先回想，再翻面確認'}</small></div>
 </article>;
}
