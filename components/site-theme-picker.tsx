'use client';

import {useEffect,useState} from 'react';

const themes=[
 {id:'ocean',label:'深海藍綠'},
 {id:'violet',label:'暮色紫'},
 {id:'forest',label:'墨林綠'},
 {id:'amber',label:'琥珀棕'},
 {id:'slate',label:'石墨藍'},
] as const;
type Theme=typeof themes[number]['id'];
const storageKey='statistics-studio:theme';

export default function SiteThemePicker(){
 const [theme,setTheme]=useState<Theme>('ocean');
 useEffect(()=>{
  const restore=()=>{
   try{
    const saved=themes.find(option=>option.id===localStorage.getItem(storageKey));
    if(saved){
     document.documentElement.dataset.siteTheme=saved.id;
     setTheme(saved.id);
    }
   }catch{
    // The default palette is available if browser storage is blocked.
   }
  };
  restore();
 },[]);

 function changeTheme(value:string){
  const next=themes.find(option=>option.id===value);
  if(!next)return;
  document.documentElement.dataset.siteTheme=next.id;
  setTheme(next.id);
  try{localStorage.setItem(storageKey,next.id);}catch{
   // Switching still works until the page reloads.
  }
 }

 return <label className="site-theme-picker">
  <span>網站主題</span>
  <select className="select" value={theme} onChange={event=>changeTheme(event.target.value)}>
   {themes.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
  </select>
 </label>;
}
