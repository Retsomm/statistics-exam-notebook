import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/serve-static.mjs'],{env:{...process.env,PORT:'3011'},stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',c=>{log+=c.toString()});server.stderr.on('data',c=>{log+=c.toString()});
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server did not start: '+log)),20000);server.stdout.on('data',()=>{if(log.includes('Static server ready')){clearTimeout(timeout);resolve();}});server.on('exit',code=>{clearTimeout(timeout);reject(Error('Server exited '+code+': '+log));});});
 const base='http://127.0.0.1:3011',results=[];
 const version=await(await fetch(base+'/version.json')).json();assert.match(version.version,/^[a-f0-9]{16}$/);
 const {buildVersion}=await import('../scripts/build-version.mjs');assert.equal(version.version,buildVersion(),'manifest matches current source');
 for(const [path,expected]of [['/',200],['/demo/',200],['/sign-in/',200],['/practice/',200],['/api/bank',404],['/api/auth/session',404]]){const r=await fetch(base+path,{redirect:'manual'});assert.equal(r.status,expected,path);if(expected===200){const html=await r.text();assert.ok(html.includes('data-app-version="'+version.version+'"'),path+' app release');}if(expected===200){
  const html=await(await fetch(base+path)).text();
  assert.match(html,/<link[^>]*rel="apple-touch-icon"[^>]*href="\/brand\/statistics-apple-touch-icon.png"/);
  assert.match(html,/<meta[^>]*name="apple-mobile-web-app-title"[^>]*content="統計研習所"/);
  assert.ok(html.includes('/site.webmanifest'));assert.ok(html.includes('/brand/statistics-favicon-32.png'));
 }results.push({path,status:r.status});}
 const manifestResponse=await fetch(base+'/site.webmanifest');assert.equal(manifestResponse.status,200);assert.match(manifestResponse.headers.get('content-type'),/manifest/);
 const manifest=await manifestResponse.json();assert.equal(manifest.short_name,'統計研習所');assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/practice/');
 for(const [file,size] of [['statistics-apple-touch-icon.png',180],['statistics-favicon-16.png',16],['statistics-favicon-32.png',32],['statistics-icon-192.png',192],['statistics-icon-512.png',512]]){
  const response=await fetch(base+'/brand/'+file);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/png/);
  const png=Buffer.from(await response.arrayBuffer());assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 const svg=await fetch(base+'/brand/statistics-mark.svg');assert.equal(svg.status,200);assert.match(svg.headers.get('content-type'),/image\/svg\+xml/);
 const ico=Buffer.from(await(await fetch(base+'/favicon.ico')).arrayBuffer());assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);

 const r=await fetch(base+'/bank.json'),bank=await r.json();assert.equal(bank.questions.length,2570);assert.equal(bank.exams.length,56);assert.ok(bank.questions.find(q=>q.id==='115-1-46').passage.includes('Elon Musk'));
 for(const exam of bank.exams){assert.deepEqual(exam.pages,[]);assert.equal(new URL(exam.source).hostname,'wwwq.moex.gov.tw');}
 for(const q of bank.questions)assert.deepEqual(q.images,[]);
 let explained=0;
 for(const exam of bank.exams){
  const expected=exam.explanationStatus==='pending'?0:exam.count;
  assert.equal(exam.explanationCount,expected,exam.id+' coverage label');
  if(expected){
   const response=await fetch(base+'/explanations/'+exam.id+'.json');assert.equal(response.status,200,exam.id);
   const entries=await response.json();assert.equal(Object.keys(entries).length,expected,exam.id);
   for(const q of bank.questions.filter(q=>q.examId===exam.id))assert.ok(entries[q.id]?.options,q.id);
   explained+=expected;
  }
 }
 assert.equal(explained,2570); // Existing 1665 plus 405 newly authored Chinese explanations.
 assert.equal((await fetch(base+'/official-papers.zip')).status,404);
 assert.equal((await fetch(base+'/pdf/115-0-questions.pdf')).status,404);
 const html=await(await fetch(base+'/sign-in/')).text();assert.ok(html.includes('以 Google 帳戶登入')||html.includes('正在確認登入設定'));assert.ok(!html.includes('/api/auth/'));
 console.log('STATIC HTTP CHECK PASS',JSON.stringify({routes:results,questions:bank.questions.length,officialSourceLinks:bank.exams.length}));
}finally{server.kill('SIGTERM');}
