import {brand} from './brand.mjs';
export const reportKinds={scan:'題目或選項辨識錯誤',answer:'標準答案或計分有疑問',explanation:'解析內容有疑問',source:'原卷／答案連結無法開啟',other:'其他問題'};
export function makeReport(question,exam,kind,detail,answer=[],now=new Date().toISOString(),id=crypto.randomUUID()){
 if(!Object.hasOwn(reportKinds,kind))throw Error('請選擇問題類型。');
 const note=detail.trim();if(!note||note.length>2000)throw Error('請填寫 1–2,000 字的問題說明。');
 const snapshot={year:question.year,subject:question.subject,number:question.number,stem:question.stem,options:question.options,accepted:question.accepted,allCredit:!!question.allCredit,correction:question.correction,answer,page:question.page+1,source:exam.source,answerSource:exam.answerSource,listing:exam.listing,correctionPdf:exam.correctionPdf};
 const snapshotJSON=JSON.stringify(snapshot);if(snapshotJSON.length>30000)throw Error('題目資料過長，請先複製題號回報。');
 return {id,questionId:question.id,kind,detail:note,createdAt:now,snapshotJSON};
}
export function reportText(report){
 const s=JSON.parse(report.snapshotJSON);
 return [`請查核${brand.name}題目回報 ${report.id}`,`題號：${report.questionId}（${s.year} 年／${s.subject}／第 ${s.number} 題）`,`類型：${reportKinds[report.kind]||report.kind}`,`問題：${report.detail}`,'',s.stem,...s.options.map(o=>`${o.letter}. ${o.text}`),`網站計分答案：${s.allCredit?'一律給分':s.accepted.join(' 或 ')}`,`使用者作答：${s.answer?.join('、')||'未作答'}`,`官方更正：${s.correction||'未記錄'}`,`原卷（PDF 第 ${s.page} 頁）：${s.source}`,`官方標準答案：${s.answerSource||s.listing}`,`官方更正檔：${s.correctionPdf||'未記錄'}`,`官方查詢頁：${s.listing}`,'請比對原卷、官方標準／更正答案與網站計分、解析；區分文字辨識、網站資料或官方答案疑義，查證後再修正。'].join('\n');
}
export function mergeReports(local,remote){
 const map=new Map(local.map(r=>[r.id,r]));for(const r of remote)map.set(r.id,{...map.get(r.id),...r,synced:true});return [...map.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
