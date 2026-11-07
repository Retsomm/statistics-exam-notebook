import {createHash} from 'node:crypto';
// Streaming Google APIs can return an array of error envelopes. Only surface
// machine-readable codes, never server messages, metadata or report contents.
function requestErrorCodes(data){
 const envelopes=Array.isArray(data)?data:[data];
 const error=envelopes.find(item=>item?.error)?.error;
 const codes=[error?.status,error?.details?.find(item=>item?.reason)?.reason].filter(value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(value));
 return [...new Set(codes)];
}
export function safeRequestError(service,status,data){
 const codes=requestErrorCodes(data);
 return Object.assign(Error(`${service} request failed (${status}${codes.length?`, ${codes.join(', ')}`:''}). No report contents were logged.`),{service,status,code:codes[0]});
}
async function patchExistingDocument({request,headers,base,write}){
 const documentPath=write.update.name.split('/documents/')[1];
 if(!documentPath||!write.currentDocument?.updateTime)throw Error('Missing document path or version; refusing an unguarded update.');
 const url=new URL(`${base}/${documentPath.split('/').map(encodeURIComponent).join('/')}`);
 for(const field of write.updateMask.fieldPaths)url.searchParams.append('updateMask.fieldPaths',field);
 url.searchParams.set('currentDocument.updateTime',write.currentDocument.updateTime);
 await request(url.href,{method:'PATCH',headers,body:JSON.stringify(write.update)});
}
export async function verifyUpdatePermission({request,headers,base}){
 // Probe an existing report: missing documents can trigger create permission
 // checks and do not establish whether an update-only role works.
 const rows=await request(`${base}:runQuery`,{method:'POST',headers,body:JSON.stringify({structuredQuery:{select:{fields:[{fieldPath:'__name__'}]},from:[{collectionId:'questionReports',allDescendants:true}],limit:1}})});
 const document=rows.find(row=>row.document)?.document;
 if(!document)throw Error('No existing reports are available to verify update-only permission.');
 // An impossible version precondition prevents both creation and modification,
 // without logging the report path or loading any report fields.
 const write={update:{name:document.name,fields:{probe:{booleanValue:true}}},updateMask:{fieldPaths:['probe']},currentDocument:{updateTime:'1970-01-01T00:00:00Z'}};
 try{await patchExistingDocument({request,headers,base,write});}
 catch(error){if(error.service==='Firestore'&&((error.status===400&&error.code==='FAILED_PRECONDITION')||(error.status===404&&error.code==='NOT_FOUND')))return;throw error;}
 throw Error('The update permission probe unexpectedly succeeded; refusing to continue.');
}
export const reportKey=path=>createHash('sha256').update(path).digest('hex');
export function decodeReport(document){
 const fields=document.fields||{},string=key=>fields[key]?.stringValue||'';
 return {key:reportKey(document.name),documentPath:document.name,updateTime:document.updateTime,questionId:string('questionId'),kind:string('kind'),status:string('status')||'pending',detail:string('detail'),createdAt:string('createdAt')};
}
// The owner authorized publishing report notes for maintenance. Export only the
// explicit allowlist below; never export account IDs, paths, history or snapshots.
export function pendingQueue(documents){
 const groups=new Map();
 for(const document of documents){const report=decodeReport(document);if(report.status==='resolved')continue;
  if(!/^\d{3}-(?:[012]|2s|3d)-\d{1,2}$/.test(report.questionId)||!['scan','answer','explanation','source','other'].includes(report.kind))continue;
  const group=groups.get(report.questionId)||{questionId:report.questionId,kinds:[],reports:[]};
  group.kinds=[...new Set([...group.kinds,report.kind])].sort();group.reports.push({key:report.key,kind:report.kind,detail:report.detail,createdAt:report.createdAt});groups.set(report.questionId,group);
 }
 return {pendingReports:[...groups.values()].reduce((sum,g)=>sum+g.reports.length,0),questions:[...groups.values()].sort((a,b)=>a.questionId.localeCompare(b.questionId)).map(g=>({...g,reports:g.reports.sort((a,b)=>a.key.localeCompare(b.key))}))};
}
export function resolutionWrite(document,resolution,now){
 const report=decodeReport(document);
 if(report.status==='resolved')return null;
 if(resolution.key!==report.key||resolution.questionId!==report.questionId||resolution.kind!==report.kind)throw Error('Resolution must match the exact report, question and kind.');
 if(!/^[a-f0-9]{40}$/.test(resolution.fixCommit)||!resolution.resolution?.trim()||!resolution.evidence?.length||resolution.evidence.some(url=>!/^https:\/\//.test(url)))throw Error('Resolution requires a fix commit, explanation and HTTPS evidence.');
 if(!document.updateTime)throw Error('Missing report version; refusing an unguarded update.');
 const fields={status:{stringValue:'resolved'},resolution:{stringValue:resolution.resolution},fixCommit:{stringValue:resolution.fixCommit},resolvedAt:{timestampValue:now}};
 return {update:{name:document.name,fields},updateMask:{fieldPaths:Object.keys(fields)},currentDocument:{updateTime:document.updateTime}};
}

export async function collectAndResolveReports({request,headers,base,resolutions,isDeployed,now=()=>new Date().toISOString()}){
 const documents=[];let after;
 while(true){
  const structuredQuery={select:{fields:['questionId','kind','status','detail','createdAt'].map(fieldPath=>({fieldPath}))},from:[{collectionId:'questionReports',allDescendants:true}],orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:200,...(after?{startAt:{values:[{referenceValue:after}],before:false}}:{})};
  const rows=await request(`${base}:runQuery`,{method:'POST',headers,body:JSON.stringify({structuredQuery})});
  const page=rows.filter(row=>row.document).map(row=>row.document);documents.push(...page);if(page.length<200)break;after=page.at(-1).name;
 }
 const byKey=new Map(resolutions.map(r=>[r.key,r])),confirmed=new Map();let resolved=0;
 // Validate every matching resolution and its deployment before any writes begin.
 const writes=documents.map((document,index)=>{
  const resolution=byKey.get(reportKey(document.name));if(!resolution)return null;
  const write=resolutionWrite(document,resolution,now());return write?{write,resolution,index}:null;
 }).filter(Boolean);
 for(const {resolution}of writes){
  if(!confirmed.has(resolution.fixCommit))confirmed.set(resolution.fixCommit,await isDeployed(resolution.fixCommit));
  if(!confirmed.get(resolution.fixCommit))throw Error('A requested fix has not successfully deployed to main. Reports remain pending.');
 }
 for(const {write,index}of writes){
  await patchExistingDocument({request,headers,base,write});
  documents[index]={...documents[index],fields:{...documents[index].fields,status:{stringValue:'resolved'}}};resolved++;
 }
 return {queue:pendingQueue(documents),resolved};
}
