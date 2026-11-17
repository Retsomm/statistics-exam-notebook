export const MAX_VISIT_DAYS=10000;
const formatter=new Intl.DateTimeFormat('en',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'});
export function validDay(value){
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T12:00:00Z`))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value;
}
export function taipeiDay(value=Date.now()){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 const parts=Object.fromEntries(formatter.formatToParts(date).map(part=>[part.type,part.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function shiftDay(day,offset){
 if(!validDay(day))return '';
 const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);
}
export function mergeVisitDays(...groups){
 return [...new Set(groups.flatMap(group=>Array.isArray(group)?group.filter(validDay):[]))].sort().slice(-MAX_VISIT_DAYS);
}
export function readVisitDays(json){
 try{return mergeVisitDays(JSON.parse(json||'null')?.visitDays);}catch{return [];}
}
