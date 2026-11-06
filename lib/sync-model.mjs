import {emptyState, validateBackup, grade} from './study.mjs';
import {mergeAttempts,validAttempt} from './attempts.mjs';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const eventKey=h=>`${h.id}:${h.time}:${h.answer}`;
export const mergeHistory=(a=[],b=[])=>[...new Map([...a,...b].map(h=>[eventKey(h),h])).values()].sort((a,b)=>b.time.localeCompare(a.time)).slice(0,500);
export const questionPatch=(before,after,id)=>{
 const patch={};
 const oldExplanation=(before.explanationBookmarks||[]).includes(id),newExplanation=(after.explanationBookmarks||[]).includes(id);if(oldExplanation!==newExplanation)patch.explanationBookmark=newExplanation;
 const a=before.bookmarks.includes(id),b=after.bookmarks.includes(id);if(a!==b)patch.bookmark=b;
 if((before.notes[id]||'')!==(after.notes[id]||''))patch.note=after.notes[id]||'';
 if(!equal(before.records[id],after.records[id])&&after.records[id])patch.record=after.records[id];
 if(!equal(before.wrong[id],after.wrong[id])&&after.wrong[id])patch.wrong=after.wrong[id];
 const old=new Set(before.history.filter(h=>h.id===id).map(eventKey));
 const added=after.history.filter(h=>h.id===id&&!old.has(eventKey(h)));if(added.length)patch.history=added;
 return patch;
};
// Keep compact word IDs in the existing study metadata document. Transactions merge
// individual word flags (including removals), independently of practice progress.
export const readStudyMetadata=(json)=>{
 try{const data=JSON.parse(json||'null');
  if(data?.studyMetadataVersion===2)return {attempts:(Array.isArray(data.attempts)?data.attempts:[]).filter(validAttempt),session:data.session||null,memoryBookmarks:data.memoryBookmarks&&typeof data.memoryBookmarks==='object'&&!Array.isArray(data.memoryBookmarks)?data.memoryBookmarks:{},vocabularyBookmarks:data.vocabularyBookmarks&&typeof data.vocabularyBookmarks==='object'&&!Array.isArray(data.vocabularyBookmarks)?data.vocabularyBookmarks:{},idiomBookmarks:data.idiomBookmarks&&typeof data.idiomBookmarks==='object'&&!Array.isArray(data.idiomBookmarks)?data.idiomBookmarks:{}};
  return {session:data,vocabularyBookmarks:{},idiomBookmarks:{},memoryBookmarks:{},attempts:[]};
 }catch{return {session:null,vocabularyBookmarks:{},idiomBookmarks:{},memoryBookmarks:{},attempts:[]};}
};
const sameSession=(left,right)=>!!left&&!!right&&(left.attemptId||right.attemptId
 ?!!left.attemptId&&left.attemptId===right.attemptId
 :left.title===right.title&&equal(left.ids,right.ids));
// Keep a round change as its own queued operation. Collapsing it into an
// earlier round loses the base needed to distinguish it from a stale device.
export const canCoalesceStudyMutations=(previous,next)=>{
 if(!Object.hasOwn(previous,'sessionJSON')||!Object.hasOwn(next,'sessionJSON'))return true;
 const a=readStudyMetadata(previous.sessionJSON).session,b=readStudyMetadata(next.sessionJSON).session;
 return equal(a,b)||sameSession(a,b);
};
// Changes carry the session the device actually saw. A delayed navigation or
// answer from a different round must never replace the active cloud round.
const mergeSessionChange=(current,incoming,base)=>{
 if(equal(current,base))return incoming;
 // The cloud may have advanced within the round the user just left while the
 // new round was queued. That is still an intentional transition, not a stale
 // update. A different current round must remain protected from old devices.
 if(sameSession(current,base)&&!sameSession(incoming,base))return incoming;
 if(!sameSession(current,incoming))return current;
 const choices={...current.choices},checked={...current.checked};
 for(const id of incoming.ids){
  if(Object.hasOwn(current.checked,id))continue;
  if(Object.hasOwn(incoming.checked,id)){
   choices[id]=incoming.choices[id];checked[id]=incoming.checked[id];
  }else if(!equal(incoming.choices[id],base?.choices?.[id])&&incoming.choices[id])choices[id]=incoming.choices[id];
 }
 return {...current,index:incoming.index,choices,checked};
};
export const applyStudyMutation=(json,patch,mode='update',exists=true)=>{
 const metadata=readStudyMetadata(json);
 metadata.attempts=mergeAttempts(metadata.attempts,(patch.attempts||[]).filter(validAttempt));
 if(Object.hasOwn(patch,'sessionJSON')&&(mode!=='migrate'||!exists)){
  const incoming=readStudyMetadata(patch.sessionJSON).session;
  // Old persisted queues have no base. Preserve compatibility for the same round,
  // but never let an unversioned old round displace an existing different round.
  const base=Object.hasOwn(patch,'baseSessionJSON')?readStudyMetadata(patch.baseSessionJSON).session:incoming;
  metadata.session=!exists||!metadata.session||(!incoming&&!Object.hasOwn(patch,'baseSessionJSON'))?incoming:mergeSessionChange(metadata.session,incoming,base);
 }
 for(const [id,saved]of Object.entries(patch.vocabularyBookmarks||{})){
  if(mode!=='migrate'||!Object.hasOwn(metadata.vocabularyBookmarks,id))metadata.vocabularyBookmarks[id]=saved;
 }
 for(const [id,saved]of Object.entries(patch.idiomBookmarks||{})){
  if(mode!=='migrate'||!Object.hasOwn(metadata.idiomBookmarks,id))metadata.idiomBookmarks[id]=saved;
 }
 for(const [id,saved]of Object.entries(patch.memoryBookmarks||{})){
  if(mode!=='migrate'||!Object.hasOwn(metadata.memoryBookmarks,id))metadata.memoryBookmarks[id]=saved;
 }
 return JSON.stringify({studyMetadataVersion:2,...metadata});
};
export const vocabularyMigration=(local,json)=>{
 const data=readStudyMetadata(json),remote=data.vocabularyBookmarks;
 const attempts=(local.attempts||[]).filter(a=>!data.attempts.some(b=>b.id===a.id));
 const missing=Object.fromEntries((local.vocabularyBookmarks||[]).filter(id=>!Object.hasOwn(remote,id)).map(id=>[id,true]));
 const missingIdioms=Object.fromEntries((local.idiomBookmarks||[]).filter(id=>!Object.hasOwn(data.idiomBookmarks,id)).map(id=>[id,true]));
 const missingMemory=Object.fromEntries((local.memoryBookmarks||[]).filter(id=>!Object.hasOwn(data.memoryBookmarks,id)).map(id=>[id,true]));
 return Object.keys(missingMemory).length||Object.keys(missing).length||Object.keys(missingIdioms).length||attempts.length?[{docId:'_session',patch:{memoryBookmarks:missingMemory,vocabularyBookmarks:missing,idiomBookmarks:missingIdioms,attempts},mode:'migrate'}]:[];
};
// A migration marker only records the original import. Older app versions may
// have saved later bookmarks locally without queueing them. Repair missing fields
// on every startup, while explicit cloud false values remain deletion tombstones.
export const bookmarkMigration=(local,remote)=>migrationChanges(local,remote,true)
 .map(change=>({...change,patch:Object.fromEntries(Object.entries(change.patch).filter(([key])=>['bookmark','explanationBookmark'].includes(key)))}))
 .filter(change=>Object.keys(change.patch).length);
export const stateChanges=(before,after)=>{
 const ids=new Set([...(before.explanationBookmarks||[]),...(after.explanationBookmarks||[]),...before.bookmarks,...after.bookmarks,...Object.keys(before.notes),...Object.keys(after.notes),...Object.keys(before.records),...Object.keys(after.records),...Object.keys(before.wrong),...Object.keys(after.wrong),...after.history.map(h=>h.id)]);
 const changes=[];
 for(const id of ids){const patch=questionPatch(before,after,id);if(Object.keys(patch).length)changes.push({docId:id,patch,mode:'update'});}
 const metadata={};
 const added=(after.attempts||[]).filter(a=>!(before.attempts||[]).some(b=>a.id===b.id));if(added.length)metadata.attempts=added;
 if(!equal(before.session,after.session)){metadata.sessionJSON=JSON.stringify(after.session);metadata.baseSessionJSON=JSON.stringify(before.session);}
 const oldWords=new Set(before.vocabularyBookmarks||[]),newWords=new Set(after.vocabularyBookmarks||[]),wordPatch={};
 for(const id of new Set([...oldWords,...newWords]))if(oldWords.has(id)!==newWords.has(id))wordPatch[id]=newWords.has(id);
 if(Object.keys(wordPatch).length)metadata.vocabularyBookmarks=wordPatch;
 const oldIdioms=new Set(before.idiomBookmarks||[]),newIdioms=new Set(after.idiomBookmarks||[]),idiomPatch={};
 for(const id of new Set([...oldIdioms,...newIdioms]))if(oldIdioms.has(id)!==newIdioms.has(id))idiomPatch[id]=newIdioms.has(id);
 if(Object.keys(idiomPatch).length)metadata.idiomBookmarks=idiomPatch;
 const oldMemory=new Set(before.memoryBookmarks||[]),newMemory=new Set(after.memoryBookmarks||[]),memoryPatch={};
 for(const id of new Set([...oldMemory,...newMemory]))if(oldMemory.has(id)!==newMemory.has(id))memoryPatch[id]=newMemory.has(id);
 if(Object.keys(memoryPatch).length)metadata.memoryBookmarks=memoryPatch;
 if(Object.keys(metadata).length)changes.push({docId:'_session',patch:metadata,mode:'update'});
 return changes;
};
export const applyQuestionMutation=(current={},mutation)=>{
 if(current.applied?.includes(mutation.id))return current;
 const p=mutation.patch,out={...current};
 for(const k of ['bookmark','explanationBookmark','note','wrong'])if(Object.hasOwn(p,k)&&(mutation.mode!=='migrate'||k==='wrong'||!Object.hasOwn(current,k)))out[k]=p[k];
 const oldKeys=new Set((current.history||[]).map(eventKey));
 const added=(p.history||[]).filter(h=>!oldKeys.has(eventKey(h))).length;
 if(p.record){out.record={...p.record,attempts:mutation.mode==='migrate'?Math.max(current.record?.attempts||0,p.record.attempts):Math.max(current.record?.attempts||0,(p.record.attempts||1)-added)+added};}
 if(p.history)out.history=mergeHistory(current.history,p.history);
 out.applied=[...(current.applied||[]).slice(-127),mutation.id];
 return out;
};
export const migrationChanges=(local,remote,sessionExists)=>{
 const changes=[];
 const ids=new Set([...(local.explanationBookmarks||[]),...local.bookmarks,...Object.keys(local.notes),...Object.keys(local.records),...Object.keys(local.wrong),...local.history.map(h=>h.id)]);
 for(const id of ids){const r=remote.get(id)||{},patch={};
  if((local.explanationBookmarks||[]).includes(id)&&!Object.hasOwn(r,'explanationBookmark'))patch.explanationBookmark=true;
  if(local.bookmarks.includes(id)&&!Object.hasOwn(r,'bookmark'))patch.bookmark=true;
  if(Object.hasOwn(local.notes,id)&&!Object.hasOwn(r,'note'))patch.note=local.notes[id];
  for(const k of ['record','wrong']){const value=local[k==='record'?'records':'wrong'][id];if(value&&(!r[k]||value.time>r[k].time))patch[k]=value;}
  const history=local.history.filter(h=>h.id===id);if(history.length)patch.history=history;
  if(Object.keys(patch).length)changes.push({docId:id,patch,mode:'migrate'});
 }
 if(!sessionExists&&local.session)changes.push({docId:'_session',patch:{sessionJSON:JSON.stringify(local.session)},mode:'migrate'});
 return changes;
};
export const cloudState=(remote,sessionJSON,questions,queue=[])=>{
 const docs=new Map([...remote].map(([id,d])=>[id,{...d}]));let session=sessionJSON;
 for(const m of queue){if(m.docId==='_session')session=applyStudyMutation(session,m.patch,m.mode,session!==undefined);else docs.set(m.docId,applyQuestionMutation(docs.get(m.docId),m));}
 const raw=emptyState();
 for(const [id,d]of docs){if(d.bookmark)raw.bookmarks.push(id);if(d.explanationBookmark===true)raw.explanationBookmarks.push(id);if(typeof d.note==='string')raw.notes[id]=d.note;if(d.record)raw.records[id]=d.record;if(d.wrong)raw.wrong[id]=d.wrong;raw.history.push(...(Array.isArray(d.history)?d.history.filter(h=>h&&h.id===id&&typeof h.time==='string'&&typeof h.answer==='string'&&typeof h.correct==='boolean'):[]));}
 raw.history.sort((a,b)=>b.time.localeCompare(a.time));raw.history=raw.history.slice(0,10000);
 const metadata=readStudyMetadata(session);raw.session=metadata.session;raw.attempts=metadata.attempts;
 raw.vocabularyBookmarks=Object.entries(metadata.vocabularyBookmarks).filter(([,saved])=>saved===true).map(([id])=>id);
 raw.memoryBookmarks=Object.entries(metadata.memoryBookmarks).filter(([,saved])=>saved===true).map(([id])=>id);
 raw.idiomBookmarks=Object.entries(metadata.idiomBookmarks).filter(([,saved])=>saved===true).map(([id])=>id);
 const known=new Map(questions.map(q=>[q.id,q])),safe=validateBackup(raw,new Set(known.keys()));
 if(safe.session&&raw.session){for(const id of safe.session.ids){const choice=raw.session.choices?.[id];if(Array.isArray(choice)&&choice.length&&choice.every(x=>typeof x==='string'&&/^[A-E]$/.test(x))){safe.session.choices[id]=[...new Set(choice)];if(Object.hasOwn(raw.session.checked||{},id))safe.session.checked[id]=grade(known.get(id),choice);}}}
 return safe;
};
