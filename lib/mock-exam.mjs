import {scoreQuestions,questionPoints} from './scoring.mjs';
export const MOCK_DURATION=60*60*1000;
const shuffle=(items,random)=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
// Passage identity includes the source paper, so equal texts in different years
// never accidentally combine into one oversized group. Works before/after reflow.
const passageKey=q=>JSON.stringify([q.examId,(q.passage||'').replace(/\s+/g,' ').trim()]);
const englishKind=q=>q.englishFormat==='cloze'||q.clozeNumbers?.length||/空格/.test(q.stem||'')?'cloze':'reading';
function drawEnglish(questions,total,seen,random){
 const singles=questions.filter(q=>!q.passage?.trim()),groupMap=new Map();
 for(const q of questions.filter(q=>q.passage?.trim())){const key=passageKey(q);if(!groupMap.has(key))groupMap.set(key,[]);groupMap.get(key).push(q);}
 const groups=[...groupMap.values()].map(items=>items.sort((a,b)=>a.number-b.number));
 const profiles=new Map();
 for(const examId of new Set(questions.map(q=>q.examId))){
  const singleCount=singles.filter(q=>q.examId===examId).length;
  const blocks=groups.filter(g=>g[0].examId===examId).sort((a,b)=>a[0].number-b[0].number).map(g=>({kind:englishKind(g[0]),size:g.length})).sort((a,b)=>Number(a.kind==='reading')-Number(b.kind==='reading'));
  if(singleCount+blocks.reduce((sum,b)=>sum+b.size,0)!==total)continue;
  const profile={singleCount,blocks};profiles.set(JSON.stringify(profile),profile);
 }
 const prioritize=items=>shuffle(items,random).sort((a,b)=>b.filter(q=>!seen.has(q.id)).length-a.filter(q=>!seen.has(q.id)).length);
 const candidates=[];
 for(const {singleCount,blocks} of profiles.values()){
  if(singles.length<singleCount)continue;
  const selected=prioritize(singles.map(q=>[q])).slice(0,singleCount).flat(),used=new Set();let complete=true;
  for(const block of blocks){
   const group=prioritize(groups.filter(g=>g.length===block.size&&englishKind(g[0])===block.kind&&!used.has(passageKey(g[0]))))[0];
   if(!group){complete=false;break;}used.add(passageKey(group[0]));selected.push(...group);
  }
  if(complete)candidates.push({selected,unseen:selected.filter(q=>!seen.has(q.id)).length});
 }
 const best=shuffle(candidates,random).sort((a,b)=>b.unseen-a.unseen)[0];
 if(!best)throw Error('英文完整題組不足，無法產生符合正式配置的模擬考。');
 return best.selected.map(q=>q.id);
}
// Match the current paper's allocation. Unseen items always precede seen items
// within each allocation; once a subject is exhausted the entire pool is random.
export function drawMockPaper(bank,subjectIndex,runs,random=Math.random){
 const seen=new Set(runs.flatMap(run=>run.papers.filter(p=>p.subjectIndex===subjectIndex&&p.startedAt).flatMap(p=>p.ids)));
 const pool=bank.questions.filter(q=>q.subjectIndex===subjectIndex);
 const latest=bank.exams.filter(e=>e.subjectIndex===subjectIndex).sort((a,b)=>b.year-a.year)[0];
 const template=bank.questions.filter(q=>q.examId===latest.id);
 const group=q=>subjectIndex===0?(q.multi?'multi':'single'):subjectIndex===1?(q.number<=35?'civics':'english'):'all';
 const ids=[];
 for(const key of new Set(template.map(group))){
  const quota=template.filter(q=>group(q)===key).length,eligible=pool.filter(q=>group(q)===key);
  if(subjectIndex===1&&key==='english'){ids.push(...drawEnglish(eligible,quota,seen,random));continue;}
  ids.push(...[...shuffle(eligible.filter(q=>!seen.has(q.id)),random),...shuffle(eligible.filter(q=>seen.has(q.id)),random)].slice(0,quota).map(q=>q.id));
 }
 return {subjectIndex,ids,choices:{},index:0,durationMs:MOCK_DURATION,points:100/ids.length};
}
export function createMockRun(bank,runs,id,now=Date.now(),random=Math.random,subjects=[0,1,3,2]){
 if(!subjects.length||subjects.length>4||new Set(subjects).size!==subjects.length||subjects.some(s=>![0,1,2,3].includes(s)))throw Error('請選擇有效科目。');
 return {id,createdAt:new Date(now).toISOString(),papers:subjects.map(subject=>drawMockPaper(bank,subject,runs,random))};
}
export const remainingMs=(paper,now)=>paper.startedAt?Math.max(0,Math.min(paper.durationMs,Date.parse(paper.startedAt)+paper.durationMs-now)):paper.durationMs;
export function finishMockPaper(paper,questions,now=Date.now()){
 if(paper.completedAt||!paper.startedAt)return paper;
 const start=Date.parse(paper.startedAt),end=Math.max(start,Math.min(now,start+paper.durationMs));
 const selected=paper.ids.map(id=>questions.get(id));
 if(selected.some(q=>!q))throw Error('模擬考題目不完整，請保留備份後重新載入。');
 // Normalize historical item weights to the current examination allocation.
 const weighted=selected.map(q=>({...q,points:paper.subjectIndex===0?questionPoints(q):paper.points}));
 const result=scoreQuestions(weighted,paper.choices);
 return {...paper,completedAt:new Date(end).toISOString(),elapsedMs:end-start,remainingMs:paper.durationMs-(end-start),timedOut:now>=start+paper.durationMs,score:result.score,max:result.max};
}
export function validMockRun(run){
 return !!run&&typeof run.id==='string'&&/^[a-f0-9-]{36}$/.test(run.id)&&Number.isFinite(Date.parse(run.createdAt))&&Array.isArray(run.papers)&&run.papers.length>=1&&run.papers.length<=4&&(run.resetAt===undefined||(typeof run.resetAt==='string'&&Number.isFinite(Date.parse(run.resetAt))))&&new Set(run.papers.map(p=>p.subjectIndex)).size===run.papers.length&&run.papers.every(p=>[0,1,2,3].includes(p.subjectIndex)&&Array.isArray(p.ids)&&p.ids.length>0&&p.ids.length<=60&&new Set(p.ids).size===p.ids.length&&p.ids.every(id=>typeof id==='string'&&/^\d{3}-(?:[01]|2s|3d)-\d{1,2}$/.test(id))&&p.choices&&typeof p.choices==='object'&&Object.entries(p.choices).every(([id,a])=>p.ids.includes(id)&&Array.isArray(a)&&a.every(x=>typeof x==='string'&&/^[A-E]$/.test(x)))&&Number.isInteger(p.index)&&p.index>=0&&p.index<p.ids.length&&p.durationMs===MOCK_DURATION&&Number.isFinite(p.points)&&p.points>0&&(!p.startedAt||Number.isFinite(Date.parse(p.startedAt)))&&(!p.completedAt||(p.startedAt&&Number.isFinite(Date.parse(p.completedAt))&&Number.isFinite(p.score)&&p.score>=0&&p.score<=100.0001&&p.max===100&&Number.isFinite(p.elapsedMs)&&p.elapsedMs>=0&&p.elapsedMs<=MOCK_DURATION&&p.remainingMs===MOCK_DURATION-p.elapsedMs&&typeof p.timedOut==='boolean')));
}
export function mergeMockRun(current,incoming){
 if(!validMockRun(incoming))return current;
 if(!current)return structuredClone(incoming);
 if(current.id!==incoming.id)return current;
 if(current.resetAt||incoming.resetAt)return current.resetAt&&(!incoming.resetAt||current.resetAt>=incoming.resetAt)?current:structuredClone(incoming);
 return {...current,papers:current.papers.map(p=>{
  const next=incoming.papers.find(n=>n.subjectIndex===p.subjectIndex);
  if(p.completedAt||!next||JSON.stringify(p.ids)!==JSON.stringify(next.ids))return p;
  if(next.completedAt){const startedAt=p.startedAt||next.startedAt,start=Date.parse(startedAt),end=Math.max(start,Math.min(Date.parse(next.completedAt),start+p.durationMs));return {...next,startedAt,completedAt:new Date(end).toISOString(),elapsedMs:end-start,remainingMs:p.durationMs-(end-start),timedOut:end===start+p.durationMs};}
  return {...next,startedAt:p.startedAt||next.startedAt,choices:{...p.choices,...next.choices}};
 })};
}
export function mergeMockRuns(a=[],b=[]){const runs=new Map(a.filter(validMockRun).map(r=>[r.id,r]));for(const run of b.filter(validMockRun))runs.set(run.id,mergeMockRun(runs.get(run.id),run));return [...runs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export const mockAverage=run=>!run.resetAt&&run.papers.length===4&&run.papers.every(p=>p.completedAt)?Math.round((run.papers.reduce((sum,p)=>sum+p.score,0)/4+Number.EPSILON)*100)/100:null;
export const formatDuration=(ms,roundUp=false)=>{const s=(roundUp?Math.ceil:Math.floor)(Math.max(0,ms)/1000);return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;};

// Reset markers survive delayed uploads and backup imports; coverage IDs remain.
export function resetMockRuns(runs,now=Date.now()){
 const resetAt=new Date(now).toISOString();
 return runs.map(run=>run.resetAt?run:{...run,resetAt,papers:run.papers.map(p=>{
  const {score,max,completedAt,elapsedMs,remainingMs,timedOut,...coverage}=p;
  return {...coverage,choices:{},index:0};
 })});
}
export function latestMockScores(runs){
 const papers=[0,1,2,3].map(subject=>runs.filter(r=>!r.resetAt).flatMap(r=>r.papers).filter(p=>p.subjectIndex===subject&&p.completedAt).sort((a,b)=>b.completedAt.localeCompare(a.completedAt))[0]||null);
 const average=papers.every(Boolean)?Math.round((papers.reduce((sum,p)=>sum+p.score,0)/4+Number.EPSILON)*100)/100:null;
 return {papers,average};
}
