import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingQueue,reportKey,resolutionWrite,collectAndResolveReports} from '../lib/report-maintenance.mjs';
const doc=(id,status='pending',kind='explanation')=>({name:`projects/p/databases/(default)/documents/users/private-user/questionReports/${id}`,updateTime:'2026-11-07T00:00:00Z',fields:{questionId:{stringValue:'114-3d-20'},kind:{stringValue:kind},status:{stringValue:status},detail:{stringValue:'sensitive free text'},snapshotJSON:{stringValue:'private snapshot'}}});
test('maintenance batches all pending reports for the same question without exposing user data',()=>{
 const result=pendingQueue([doc('one'),doc('two','pending','scan'),doc('three','resolved')]);
 assert.equal(result.pendingReports,2);assert.equal(result.questions.length,1);assert.deepEqual(result.questions[0].kinds,['explanation','scan']);
 assert.doesNotMatch(JSON.stringify(result),/private-user|sensitive|snapshot|documentPath/);
 assert.equal(result.questions[0].reports.length,2);assert.equal(new Set(result.questions[0].reports.map(r=>r.key)).size,2);
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
  assert.deepEqual(body.structuredQuery.select.fields.map(f=>f.fieldPath),['questionId','kind','status']);
  if(queries++){assert.equal(body.structuredQuery.startAt.values[0].referenceValue,first.at(-1).name);return [{document:last}];}
  return first.map(document=>({document}));
 }commits++;return {};};
 const result=await collectAndResolveReports({request,headers:{},base:'https://example.com',resolutions:[],isDeployed:async()=>false});assert.equal(result.queue.pendingReports,201);assert.equal(commits,0);
 const resolution={key:reportKey(last.name),questionId:'114-3d-20',kind:'explanation',fixCommit:'a'.repeat(40),resolution:'已補推導',evidence:['https://example.com']};
 const single=async(url)=>{if(url.endsWith(':runQuery'))return [{document:last}];commits++;return {};};
 await assert.rejects(collectAndResolveReports({request:single,headers:{},base:'https://example.com',resolutions:[resolution],isDeployed:async()=>false}),/not successfully deployed/);assert.equal(commits,0);
 const resolved=await collectAndResolveReports({request:single,headers:{},base:'https://example.com',resolutions:[resolution],isDeployed:async()=>true});assert.equal(commits,1);assert.equal(resolved.queue.pendingReports,0);assert.equal(resolved.resolved,1);
});
