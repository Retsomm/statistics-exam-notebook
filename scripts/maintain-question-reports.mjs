import {createSign} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {collectAndResolveReports} from '../lib/report-maintenance.mjs';
const project='library-exam-notebook',repository='Retsomm/statistics-exam-notebook';
const api='https://firestore.googleapis.com/v1';
async function request(url,options={}){
 const response=await fetch(url,options);if(!response.ok)throw Error(`Service request failed (${response.status}); check operator permissions. No report contents were logged.`);return response.json();
}
async function accessToken(){
 const account=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'{}');
 if(!account.client_email||!account.private_key)throw Error('Firebase operator credentials are not configured.');
 const now=Math.floor(Date.now()/1000),encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const unsigned=[encode({alg:'RS256',typ:'JWT'}),encode({iss:account.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})].join('.');
 const signer=createSign('RSA-SHA256');signer.update(unsigned);const assertion=`${unsigned}.${signer.sign(account.private_key,'base64url')}`;
 const result=await request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 console.log(`::add-mask::${result.access_token}`);return result.access_token;
}
async function deployed(commit){
 const headers={Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json'};
 const runs=await request(`https://api.github.com/repos/${repository}/actions/workflows/firebase-hosting-merge.yml/runs?head_sha=${commit}&status=success&per_page=100`,{headers});
 return runs.workflow_runs.some(run=>run.head_sha===commit&&run.head_branch==='main'&&run.conclusion==='success');
}
async function main(){
 const token=await accessToken(),headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 const {resolutions}=JSON.parse(await readFile(new URL('../data/maintenance/report-resolutions.json',import.meta.url),'utf8'));
 const {queue,resolved}=await collectAndResolveReports({request,headers,base:`${api}/projects/${project}/databases/(default)/documents`,resolutions,isDeployed:deployed});
 await mkdir('report-maintenance-output',{recursive:true});
 await writeFile('report-maintenance-output/pending-question-reports.json',JSON.stringify(queue,null,2)+'\n');
 console.log(JSON.stringify(queue));
 console.log(`Report queue: ${queue.pendingReports} pending reports across ${queue.questions.length} questions; ${resolved} verified resolutions applied.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
