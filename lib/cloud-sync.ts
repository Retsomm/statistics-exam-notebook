'use client';
import { collection, doc, getFirestore, getDocsFromServer, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, type Firestore, type Unsubscribe } from 'firebase/firestore';
import { mergeAttempts } from './attempts.mjs';
import { firebaseAuth } from './firebase-client';
import {applyStudyMutation,vocabularyMigration,bookmarkMigration,applyQuestionMutation,canCoalesceStudyMutations,cloudState,migrationChanges,mergeHistory,type Mutation,type CloudQuestion} from './sync-model.mjs';
import {syncErrorMessage} from './sync-errors.mjs';
import type {Question,StudyState} from './types';
export type SyncStatus='connecting'|'synced'|'saving'|'offline'|'error';
export class CloudSync {
 private db?:Firestore;private stops:Unsubscribe[]=[];private disposed=false;private initialized=false;
 private remote=new Map<string,CloudQuestion>();private sessionJSON?:string;private sessionExists=false;private sessionRevision=0;
 private fetching=false;
 private qReady=false;private sReady=false;private queue:Mutation[]=[];private inflight=new Set<string>();private timer?:ReturnType<typeof setTimeout>;
 private queueKey:string;private markerKey:string;private migrated=false;
 constructor(private uid:string,private questions:Question[],private initial:StudyState,private receive:(s:StudyState)=>void,private status:(s:SyncStatus,detail?:string)=>void){
  this.queueKey=`yueri:sync:queue:v1:${uid}`;this.markerKey=`yueri:sync:migrated:v1:${uid}`;
  const known=new Set(questions.map(q=>q.id));
  try{this.migrated=localStorage.getItem(this.markerKey)==='1';const saved=JSON.parse(localStorage.getItem(this.queueKey)||'[]');if(Array.isArray(saved))this.queue=saved.filter(m=>m&&typeof m.id==='string'&&m.patch&&['update','migrate'].includes(m.mode)&&(known.has(m.docId)||m.docId==='_session'));}catch{this.status('error');}
 }
 async start(){
  try{const auth=await firebaseAuth();if(this.disposed)return;if(auth.currentUser?.uid!==this.uid)throw Error('Account changed');this.db=getFirestore(auth.app);
   const fail=(error:unknown)=>{if(!this.disposed)this.status('error',syncErrorMessage(error));};
   this.stops.push(onSnapshot(collection(this.db,'users',this.uid,'questions'),{includeMetadataChanges:true},snap=>{
    if(this.disposed||snap.metadata.fromCache)return;this.remote=new Map(snap.docs.map(d=>[d.id,d.data() as CloudQuestion]));if(!snap.metadata.fromCache)this.qReady=true;this.refresh();
   },fail));
   this.stops.push(onSnapshot(doc(this.db,'users',this.uid,'study','session'),{includeMetadataChanges:true},snap=>{
    if(this.disposed||snap.metadata.fromCache)return;if((snap.data()?.revision||0)<this.sessionRevision)return;this.sessionExists=snap.exists();this.sessionJSON=snap.data()?.sessionJSON;this.sessionRevision=snap.data()?.revision||0;if(!snap.metadata.fromCache)this.sReady=true;this.refresh();
   },fail));
   window.addEventListener('online',this.online);window.addEventListener('offline',this.offline);
   document.addEventListener('visibilitychange',this.visibility);window.addEventListener('pagehide',this.pagehide);
   if(!navigator.onLine)this.status('offline');else await this.readServer();
  }catch(error){if(!this.disposed)this.status('error',syncErrorMessage(error));}
 }
 private async readServer(){
  if(this.disposed||!this.db||this.fetching)return;
  this.fetching=true;this.status('connecting');
  try{
   const [questions,session]=await Promise.all([
    getDocsFromServer(collection(this.db,'users',this.uid,'questions')),
    getDocFromServer(doc(this.db,'users',this.uid,'study','session')),
   ]);
   if(this.disposed)return;
   const docs=new Map(questions.docs.map(d=>[d.id,d.data() as CloudQuestion]));
   for(const [id,value]of this.remote)if((value.revision||0)>(docs.get(id)?.revision||0))docs.set(id,value);
   this.remote=docs;this.qReady=true;
   if((session.data()?.revision||0)>=this.sessionRevision){this.sessionExists=session.exists();this.sessionJSON=session.data()?.sessionJSON;this.sessionRevision=session.data()?.revision||0;}
   this.sReady=true;this.refresh();
  }catch(error){if(!this.disposed)this.status('error',syncErrorMessage(error));}
  finally{this.fetching=false;}
 }
 private visibility=()=>{if(document.visibilityState==='visible'){void this.readServer();}else this.pagehide();};
 private pagehide=()=>{this.persist();clearTimeout(this.timer);void this.drain();};
 private online=()=>{void this.readServer();};
 private offline=()=>this.status('offline');
 private persist(){try{localStorage.setItem(this.queueKey,JSON.stringify(this.queue));return true;}catch{this.status('error');return false;}}
 enqueue(changes:Omit<Mutation,'id'>[]){
  if(this.disposed)return;
  for(const change of changes){
   const previous=[...this.queue].reverse().find(m=>m.docId===change.docId);
   if(previous&&previous.mode===change.mode&&!this.inflight.has(previous.id)&&(change.docId!=='_session'||canCoalesceStudyMutations(previous.patch,change.patch))){previous.patch={...previous.patch,...change.patch,...(Object.hasOwn(previous.patch,'baseSessionJSON')?{baseSessionJSON:previous.patch.baseSessionJSON}:{}),...(change.patch.attempts?{attempts:mergeAttempts(previous.patch.attempts,change.patch.attempts)}:{}),...(change.patch.history?{history:mergeHistory(previous.patch.history,change.patch.history)}:{}),...(change.patch.vocabularyBookmarks?{vocabularyBookmarks:{...previous.patch.vocabularyBookmarks,...change.patch.vocabularyBookmarks}}:{}),...(change.patch.idiomBookmarks?{idiomBookmarks:{...previous.patch.idiomBookmarks,...change.patch.idiomBookmarks}}:{})};}
   else this.queue.push({...change,id:crypto.randomUUID()});
  }
  if(changes.length){this.persist();this.status(navigator.onLine?'saving':'offline');this.schedule();}
 }
 private refresh(){
  if(!this.initialized){
   if(!this.qReady||!this.sReady)return;
   if(!this.migrated){
    this.enqueue(migrationChanges(this.initial,this.remote,this.sessionExists));
    if(this.persist()){try{localStorage.setItem(this.markerKey,'1');this.migrated=true;}catch{this.status('error');}}
   }
   this.enqueue(bookmarkMigration(this.initial,this.remote));
   this.enqueue(vocabularyMigration(this.initial,this.sessionJSON));
   this.initialized=true;
  }
  this.receive(cloudState(this.remote,this.sessionJSON,this.questions,this.queue));
  this.status(!navigator.onLine?'offline':this.queue.length?'saving':'synced');
  if(this.queue.length)this.schedule();
 }
 private schedule(delay=750){if(!this.initialized||this.disposed)return;clearTimeout(this.timer);this.timer=setTimeout(()=>void this.drain(),delay);}
 private async drain(){
  if(this.disposed||!this.db||!this.initialized||!navigator.onLine||this.inflight.size)return;
  const docs=new Set<string>();const batch=this.queue.filter(m=>{if(docs.has(m.docId)||docs.size>=8)return false;docs.add(m.docId);return true;});
  if(!batch.length){this.status('synced');return;}
  batch.forEach(m=>this.inflight.add(m.id));let failed=false;
  await Promise.all(batch.map(async mutation=>{
   try{
    const ref=mutation.docId==='_session'?doc(this.db!,'users',this.uid,'study','session'):doc(this.db!,'users',this.uid,'questions',mutation.docId);
    const committed=await runTransaction(this.db!,async tx=>{
     const snap=await tx.get(ref);const current=snap.data()||{};
     if(current.applied?.includes(mutation.id))return current;
     if(mutation.docId==='_session'){
      const sessionJSON=applyStudyMutation(current.sessionJSON,mutation.patch,mutation.mode,snap.exists());
      if(sessionJSON.length>200000)throw Error('Study metadata exceeds its storage limit');
      const next={revision:(current.revision||0)+1,sessionJSON,applied:[...(current.applied||[]).slice(-127),mutation.id]};
      tx.set(ref,{...next,updatedAt:serverTimestamp()});return next;
     }else{
      let change=mutation;
      if(mutation.mode==='migrate'){
       const patch={...mutation.patch};
       for(const k of ['bookmark','explanationBookmark','note'] as const)if(Object.hasOwn(current,k))delete patch[k];
       if(patch.record&&current.record&&current.record.time>=patch.record.time)delete patch.record;
       if(patch.wrong&&current.wrong&&current.wrong.time>=patch.wrong.time)delete patch.wrong;
       change={...mutation,patch};
      }
      const next={...applyQuestionMutation(current,change),revision:(current.revision||0)+1};tx.set(ref,{...next,updatedAt:serverTimestamp()});return next;
     }
    });
    // A transaction response is authoritative even if the realtime snapshot arrives later.
    if(mutation.docId==='_session'){const data=committed as {sessionJSON?:string;revision?:number};if((data.revision||0)>=this.sessionRevision){this.sessionJSON=data.sessionJSON;this.sessionRevision=data.revision||0;this.sessionExists=true;}}
    else if(((committed as CloudQuestion).revision||0)>=(this.remote.get(mutation.docId)?.revision||0))this.remote.set(mutation.docId,committed as CloudQuestion);
    this.queue=this.queue.filter(m=>m.id!==mutation.id);this.persist();
   }catch(error){failed=true;this.status('error',syncErrorMessage(error));}finally{this.inflight.delete(mutation.id);}
  }));
  if(this.disposed)return;
  this.receive(cloudState(this.remote,this.sessionJSON,this.questions,this.queue));
  this.status(!navigator.onLine?'offline':failed?'error':this.queue.length?'saving':'synced');
  if(this.queue.length)this.schedule(failed?5000:0);
 }
 retry(){if(this.disposed)return;this.stops.forEach(stop=>stop());this.stops=[];this.qReady=false;this.sReady=false;this.initialized=false;window.removeEventListener('online',this.online);window.removeEventListener('offline',this.offline);document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('pagehide',this.pagehide);this.status('connecting');void this.start();}
 stop(){this.disposed=true;clearTimeout(this.timer);this.stops.forEach(stop=>stop());window.removeEventListener('online',this.online);window.removeEventListener('offline',this.offline);document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('pagehide',this.pagehide);}
}
