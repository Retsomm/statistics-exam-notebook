import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingQueue,reportKey,resolutionWrite,collectAndResolveReports,safeRequestError,verifyUpdatePermission} from '../lib/report-maintenance.mjs';
const doc=(id,status='pending',kind='explanation')=>({name:`projects/p/databases/(default)/documents/users/private-user/questionReports/${id}`,updateTime:'2026-11-07T00:00:00Z',fields:{questionId:{stringValue:'114-3d-20'},kind:{stringValue:kind},status:{stringValue:status},detail:{stringValue:'請補上逐步計算過程'},createdAt:{stringValue:'2026-11-07T12:00:00Z'},snapshotJSON:{stringValue:'private snapshot'}}});
test('maintenance errors expose codes from streaming responses without leaking private server details',()=>{
 const error={status:'PERMISSION_DENIED',message:'private-user sensitive credential',details:[{reason:'IAM_PERMISSION_DENIED',metadata:{token:'secret',resource:doc('one').name}}]};
 for(const response of [{error},[{error}],[{}, {error}]]){
  const errorResult=safeRequestError('Firestore',403,response);assert.equal(errorResult.code,'PERMISSION_DENIED');const message=errorResult.message;assert.match(message,/PERMISSION_DENIED, IAM_PERMISSION_DENIED/);assert.doesNotMatch(message,/private-user|sensitive|credential|secret|questionReports/);
 }
 for(const response of [undefined,null,'invalid JSON',{},[{error:{status:'private data',details:[{reason:'unsafe/token'}]}}]])assert.equal(safeRequestError('Firestore',403,response).message,'Firestore request failed (403). No report contents were logged.');
});
test('update-only IAM probe cannot change a report and does not mistake denied access for success',async()=>{
 const base='https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents';
 const request=async(url,options)=>{if(url.endsWith(':runQuery')){const {structuredQuery}=JSON.parse(options.body);assert.deepEqual(structuredQuery.select.fields,[{fieldPath:'__name__'}]);assert.equal(structuredQuery.limit,1);return [{document:{name:doc('one').name}}];}assert.equal(options.method,'PATCH');const parsed=new URL(url),document=JSON.parse(options.body);assert.equal(document.name,doc('one').name);assert.equal(parsed.searchParams.get('currentDocument.updateTime'),'1970-01-01T00:00:00Z');assert.deepEqual(parsed.searchParams.getAll('updateMask.fieldPaths'),['probe']);throw safeRequestError('Firestore',400,{error:{status:'FAILED_PRECONDITION'}});};
 await verifyUpdatePermission({request,headers:{},base});
 for(const error of [safeRequestError('Firestore',403,[{error:{status:'PERMISSION_DENIED'}}]),safeRequestError('Firestore',500,{}),safeRequestError('GitHub',404,{error:{status:'NOT_FOUND'}}),safeRequestError('Firestore',404,{})])await assert.rejects(verifyUpdatePermission({request:async()=>{throw error;},headers:{},base}),error);
 await assert.rejects(verifyUpdatePermission({request:async url=>url.endsWith(':runQuery')?[{document:{name:doc('one').name}}]:{},headers:{},base}),/unexpectedly succeeded/);
 await assert.rejects(verifyUpdatePermission({request:async()=>[],headers:{},base}),/No existing reports/);
});
test('maintenance batches all pending reports for the same question with original notes but without exposing account data',()=>{
 const result=pendingQueue([doc('one'),doc('two','pending','scan'),doc('three','resolved')]);
 assert.equal(result.pendingReports,2);assert.equal(result.questions.length,1);assert.deepEqual(result.questions[0].kinds,['explanation','scan']);
 assert.doesNotMatch(JSON.stringify(result),/private-user|snapshot|documentPath/);
 assert.equal(result.questions[0].reports.length,2);assert.equal(result.questions[0].reports[0].detail,'請補上逐步計算過程');assert.equal(result.questions[0].reports[0].createdAt,'2026-11-07T12:00:00Z');assert.deepEqual(Object.keys(result.questions[0].reports[0]).sort(),['createdAt','detail','key','kind']);assert.equal(new Set(result.questions[0].reports.map(r=>r.key)).size,2);
});
test('legacy subject-2 reports remain visible without guessing a replacement subject or changing report identity',()=>{
 const document=doc('legacy');document.fields.questionId={stringValue:'111-2-6'};
 const queue=pendingQueue([document]);assert.equal(queue.pendingReports,1);assert.equal(queue.questions[0].questionId,'111-2-6');assert.equal(queue.questions[0].reports[0].key,reportKey(document.name));
 const resolution={key:reportKey(document.name),questionId:'111-2-6',kind:'explanation',fixCommit:'a'.repeat(40),resolution:'已查核舊題號',evidence:['https://example.com/source']};
 const write=resolutionWrite(document,resolution,'2026-11-07T01:00:00Z');assert.equal(write.update.name,document.name);assert.equal(document.fields.questionId.stringValue,'111-2-6');
 assert.throws(()=>resolutionWrite(document,{...resolution,questionId:'111-2s-6'},'now'),/exact report/);
});
test('resolution targets one immutable report and cannot close a newer report on the same question',()=>{
 const document=doc('one'),resolution={key:reportKey(document.name),questionId:'114-3d-20',kind:'explanation',fixCommit:'a'.repeat(40),resolution:'已補推導',evidence:['https://example.com/source']};
 const write=resolutionWrite(document,resolution,'2026-11-07T01:00:00Z');
 assert.equal(write.update.fields.status.stringValue,'resolved');assert.deepEqual(write.currentDocument,{updateTime:document.updateTime});
 assert.deepEqual(write.updateMask.fieldPaths,['status','resolution','fixCommit','resolvedAt']);assert.ok(!write.update.fields.detail);
 assert.throws(()=>resolutionWrite(doc('newer'),resolution,'now'),/exact report/);
 assert.throws(()=>resolutionWrite(document,{...resolution,fixCommit:''},'now'),/fix commit/);
 assert.throws(()=>resolutionWrite(document,{...resolution,kind:'scan'},'now'),/exact report/);
 assert.equal(resolutionWrite(doc('one','resolved'),resolution,'now'),null);
});

test('maintenance paginates past 200 reports and waits for successful hosting before resolving',async()=>{
 const first=Array.from({length:200},(_,i)=>doc(String(i))),last=doc('last');let queries=0,commits=0;
 const request=async(url,options)=>{const body=JSON.parse(options.body);if(url.endsWith(':runQuery')){
  assert.deepEqual(body.structuredQuery.select.fields.map(f=>f.fieldPath),['questionId','kind','status','detail','createdAt']);
  if(queries++){assert.equal(body.structuredQuery.startAt.values[0].referenceValue,first.at(-1).name);return [{document:last}];}
  return first.map(document=>({document}));
 }commits++;return {};};
 const result=await collectAndResolveReports({request,headers:{},base:'https://example.com',resolutions:[],isDeployed:async()=>false});assert.equal(result.queue.pendingReports,201);assert.equal(commits,0);
 const resolution={key:reportKey(last.name),questionId:'114-3d-20',kind:'explanation',fixCommit:'a'.repeat(40),resolution:'已補推導',evidence:['https://example.com']};
 const single=async(url)=>{if(url.endsWith(':runQuery'))return [{document:last}];commits++;return {};};
 await assert.rejects(collectAndResolveReports({request:single,headers:{},base:'https://example.com',resolutions:[resolution],isDeployed:async()=>false}),/not successfully deployed/);assert.equal(commits,0);
 const resolved=await collectAndResolveReports({request:single,headers:{},base:'https://example.com',resolutions:[resolution],isDeployed:async()=>true});assert.equal(commits,1);assert.equal(resolved.queue.pendingReports,0);assert.equal(resolved.resolved,1);
});

test('maintenance resolves only the reviewed report and leaves later reports on the same question pending',async()=>{
 let documents=[doc('reviewed'),doc('later')];const commits=[];
 const resolution={key:reportKey(doc('reviewed').name),questionId:'114-3d-20',kind:'explanation',fixCommit:'a'.repeat(40),resolution:'已核對並部署',evidence:['https://example.com/source']};
 const request=async(url,options)=>{
  if(url.endsWith(':runQuery'))return documents.map(document=>({document}));
  assert.equal(options.method,'PATCH');const update=JSON.parse(options.body),parsed=new URL(url);commits.push(update);
  const current=documents.find(document=>document.name===update.name);assert.equal(parsed.searchParams.get('currentDocument.updateTime'),current.updateTime);assert.deepEqual(parsed.searchParams.getAll('updateMask.fieldPaths'),['status','resolution','fixCommit','resolvedAt']);documents=documents.map(document=>document.name===update.name?{...document,fields:{...document.fields,...update.fields}}:document);
  return {};
 };
 const options={request,headers:{},base:'https://example.com',resolutions:[resolution],isDeployed:async()=>true};
 const result=await collectAndResolveReports(options);
 assert.equal(result.resolved,1);assert.equal(commits.length,1);assert.equal(commits[0].name,doc('reviewed').name);
 assert.equal(result.queue.pendingReports,1);assert.equal(result.queue.questions[0].reports[0].key,reportKey(doc('later').name));
 assert.equal(documents[0].fields.detail.stringValue,'請補上逐步計算過程');assert.equal(documents[1].fields.status.stringValue,'pending');
 const rerun=await collectAndResolveReports(options);assert.equal(rerun.resolved,0);assert.equal(rerun.queue.pendingReports,1);assert.equal(commits.length,1);
});

test('all matching fixes must deploy before any report is closed',async()=>{
 const documents=[doc('one'),doc('two')];let commits=0;
 const resolutions=documents.map((document,index)=>({key:reportKey(document.name),questionId:'114-3d-20',kind:'explanation',fixCommit:(index?'b':'a').repeat(40),resolution:'已查核',evidence:['https://example.com/source']}));
 const request=async url=>{if(url.endsWith(':runQuery'))return documents.map(document=>({document}));commits++;return {};};
 await assert.rejects(collectAndResolveReports({request,headers:{},base:'https://example.com',resolutions,isDeployed:async commit=>commit==='a'.repeat(40)}),/not successfully deployed/);
 assert.equal(commits,0);
});

test('a report changed after collection fails its version guard and remains pending',async()=>{
 const document=doc('one');let commits=0;
 const resolution={key:reportKey(document.name),questionId:'114-3d-20',kind:'explanation',fixCommit:'a'.repeat(40),resolution:'已查核',evidence:['https://example.com/source']};
 const request=async(url,options)=>{if(url.endsWith(':runQuery'))return [{document}];commits++;assert.equal(options.method,'PATCH');assert.equal(new URL(url).searchParams.get('currentDocument.updateTime'),document.updateTime);throw Error('FAILED_PRECONDITION');};
 await assert.rejects(collectAndResolveReports({request,headers:{},base:'https://example.com',resolutions:[resolution],isDeployed:async()=>true}),/FAILED_PRECONDITION/);
 assert.equal(commits,1);assert.equal(document.fields.status.stringValue,'pending');
});
