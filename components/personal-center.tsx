'use client';
import type {ReactNode,KeyboardEvent} from 'react';
import type {Screen} from '@/lib/types';
import Icon from './icons';

const sections:{screen:Screen;label:string;icon:string}[]=[
 {screen:'settings',label:'學習看板',icon:'chart'},
 {screen:'notes',label:'重點整理',icon:'notebook'},
 {screen:'favorites',label:'收藏與錯題',icon:'star'},
 {screen:'backup',label:'備份與資料',icon:'archive'},
];
export const isPersonalScreen=(screen:Screen)=>['settings','notes','favorites','backup','history','reports'].includes(screen);
export default function PersonalCenter({screen,email,demo,onNavigate,children}:{screen:Screen;email:string;demo:boolean;onNavigate:(screen:Screen)=>void;children:ReactNode}){
 const active=screen==='history'?'settings':screen==='reports'?'backup':screen;
 const name=demo?'訪客學習者':email.split('@')[0]||'學習者';
 const onKey=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{
  const next=event.key==='ArrowRight'?(index+1)%sections.length:event.key==='ArrowLeft'?(index+sections.length-1)%sections.length:event.key==='Home'?0:event.key==='End'?sections.length-1:null;
  if(next===null)return;event.preventDefault();onNavigate(sections[next].screen);requestAnimationFrame(()=>document.getElementById(`personal-tab-${sections[next].screen}`)?.focus());
 };
 return <section className="personal-center" aria-label="個人中心">
  <header className="personal-identity"><div className="personal-avatar" aria-hidden="true">{demo?<Icon name="user"/>:name.slice(0,1).toUpperCase()}</div><div className="personal-identity-text"><p className="eyebrow">MY LEARNING SPACE</p><strong>{name}的學習空間</strong><p>{demo?'訪客模式，學習紀錄保存在目前瀏覽器。':email}</p></div><span className="personal-identity-note">每一次回來，都是累積。</span></header>
  <div className="personal-tabs" role="tablist" aria-label="個人中心功能">{sections.map((item,index)=><button key={item.screen} id={`personal-tab-${item.screen}`} role="tab" aria-selected={active===item.screen} aria-controls="personal-panel" tabIndex={active===item.screen?0:-1} onKeyDown={event=>onKey(event,index)} onClick={()=>onNavigate(item.screen)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</div>
  <section id="personal-panel" role="tabpanel" aria-labelledby={`personal-tab-${active}`} tabIndex={0}>{children}</section>
 </section>;
}
