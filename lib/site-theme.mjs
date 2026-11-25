export const siteThemes=[
 {id:'ocean',label:'深海藍綠'},
 {id:'violet',label:'暮色紫'},
 {id:'forest',label:'墨林綠'},
 {id:'amber',label:'琥珀棕'},
 {id:'charcoal',label:'深灰'},
];

export function normalizeSiteTheme(value){
 const id=value==='slate'?'charcoal':value;
 return siteThemes.find(theme=>theme.id===id)?.id;
}
