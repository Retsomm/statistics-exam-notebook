'use client';
import {useRef} from 'react';
import type {CollectionTab} from '@/lib/types';
const tabs:{id:CollectionTab;label:string}[]=[{id:'memory',label:'記憶卡片'},{id:'wrong',label:'錯題本'},{id:'questions',label:'收藏題目'},{id:'explanations',label:'收藏解析'},{id:'idioms',label:'收藏成語'},{id:'words',label:'收藏單字'}];
export default function FavoritesTabs({value,counts,onChange}:{value:CollectionTab;counts:Record<CollectionTab,number>;onChange:(tab:CollectionTab)=>void}){
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 return <div className="favorites-tabs" role="tablist" aria-label="收藏與錯題分類">{tabs.map((tab,index)=><button key={tab.id} ref={element=>{buttons.current[index]=element;}} id={`favorites-tab-${tab.id}`} role="tab" aria-selected={value===tab.id} aria-controls="favorites-panel" tabIndex={value===tab.id?0:-1} onClick={()=>onChange(tab.id)} onKeyDown={event=>{
  let next=index;
  if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
  event.preventDefault();onChange(tabs[next].id);buttons.current[next]?.focus();
 }}>{tab.label}<span>{counts[tab.id]}</span></button>)}</div>;
}
