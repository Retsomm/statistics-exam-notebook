'use client';

import {siteThemes,type SiteTheme} from '@/lib/site-theme.mjs';

export default function SiteThemePicker({theme,onChange}:{theme:SiteTheme;onChange:(theme:SiteTheme)=>void}){
 return <fieldset className="site-theme-picker">
  <legend>網站主題</legend>
  <div className="site-theme-options">
   {siteThemes.map(option=><button
    key={option.id}
    type="button"
    className={option.id===theme?'btn primary':'btn'}
    aria-pressed={option.id===theme}
    onClick={()=>onChange(option.id)}
   >{option.label}</button>)}
  </div>
 </fieldset>;
}
