import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const hook=read('../lib/use-cloud-study.ts'),app=read('../components/study-app.tsx'),sync=read('../lib/cloud-sync.ts');
test('signed-in study waits for the received server state before enabling changes',()=>{
 assert.match(hook,/useState\(false\)/);
 assert.match(hook,/latest\.current=s;setStudy\(s\);readyRef\.current=true;setReady\(true\)/);
 assert.match(hook,/if\(uid&&!readyRef\.current\)return;\s*const previous=/);
 assert.match(hook,/ready:!uid\|\|ready/);
});
test('initial loading and retry never present local progress as cloud progress',()=>{
 assert.ok(app.indexOf('if(uid&&!cloud.ready)return')<app.indexOf('const stats='));
 assert.match(app,/cloud\.status==='offline'/);
 assert.match(app,/onClick=\{cloud.retry\}/);
 assert.match(hook,/retry:\(\)=>\{readyRef\.current=false;setReady\(false\);controller\.current\?\.retry\(\)/);
});
test('all Firestore subscriptions reject cached snapshots before publishing progress',()=>{
 assert.equal((sync.match(/if\(this.disposed\|\|snap.metadata.fromCache\)return/g)||[]).length,3);
 assert.match(sync,/if\(!this.qReady\|\|!this.sReady\|\|!this.mReady\)return/);
 assert.match(sync,/if\(\(snap.data\(\)\?\.revision\|\|0\)<this.sessionRevision\)return/);
});
test('automatic score recovery also waits for cloud initialization',()=>{
 assert.match(app,/if\(!bank\|\|!loaded\|\|!cloud.ready\|\|!session\?\.attemptId/);
});
