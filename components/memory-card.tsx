'use client';
import {useId} from 'react';
import type {MemoryCard as Card} from '@/lib/memory-cards.mjs';
export default function MemoryCard({card,saved,onToggle,onRead,canSave=true,revealed=false,onFlip}:{card:Card;saved:boolean;onToggle:()=>void;onRead?:()=>void;canSave?:boolean;revealed?:boolean;onFlip?:()=>void}){
 const id=useId();
 return <article className={`memory-card memory-flashcard${saved?' memory-card-saved':''}`} aria-labelledby={`${id}-title`}>
  <header className="memory-card-heading"><div><p className="eyebrow">{card.sourceTitle}</p><h3 id={`${id}-title`}>{card.term}</h3></div><span>{revealed?'答案面':'問題面'}</span></header>
  <button type="button" className="memory-flip-surface" aria-pressed={revealed} aria-label={revealed?'翻回問題':'翻面查看答案'} aria-describedby={`${id}-${revealed?'back':'front'}`} onClick={onFlip}>
   <span className={`memory-flip-rotor${revealed?' is-flipped':''}`}>
    <span className="memory-face memory-front" aria-hidden={revealed}><span className="memory-face-label">先試著回想</span><span id={`${id}-front`} className="memory-card-question">{card.front}</span><span className="memory-face-hint">點一下卡片，查看答案</span></span>
    <span className="memory-face memory-back memory-card-answer" aria-hidden={!revealed}><span className="memory-face-label">觀念說明</span><span id={`${id}-back`} className="memory-card-answer-text">{card.back}</span><span className="memory-face-hint">點一下卡片，翻回問題</span></span>
   </span>
  </button>
  <footer className="memory-card-actions"><button className="btn" disabled={!canSave} aria-pressed={saved} aria-label={`${saved?'取消收藏':'收藏卡片'}：${card.term}`} onClick={onToggle}>{saved?'已收藏，點此取消':'收藏這張卡片'}</button>{onRead&&<button className="link" onClick={onRead}>閱讀完整重點</button>}<small>{!canSave?'正在讀取雲端收藏，請稍候':saved?'已加入收藏複習':'陌生的觀念可以收藏，稍後再複習'}</small></footer>
 </article>;
}
