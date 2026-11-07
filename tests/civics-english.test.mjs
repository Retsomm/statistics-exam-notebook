import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
const entries=JSON.parse(readFileSync(new URL('../data/explanations/115-1.json',import.meta.url)));
const questions=bank.questions.filter(q=>q.examId==='115-1');
test('115 civics and English provide 50 individual explanations and 200 option reasons',()=>{
 assert.equal(questions.length,50);assert.equal(Object.keys(entries).length,50);
 const summaries=new Set();let optionCount=0;
 for(const q of questions){
  const e=entries[q.id];assert.ok(e,q.id);assert.equal(e.revision,['113-1-4','113-1-49'].includes(q.id)?3:2);assert.ok(e.summary.length>=90,q.id);
  assert.ok(e.summary.includes('\n\n'),q.id);summaries.add(e.summary);
  assert.deepEqual(Object.keys(e.options).sort(),q.options.map(o=>o.letter).sort(),q.id);
  assert.deepEqual(Object.keys(e.optionVerdicts).sort(),q.options.map(o=>o.letter).sort(),q.id);
  for(const reason of Object.values(e.options)){assert.ok(reason.length>=30,q.id);optionCount++;}
  assert.ok(e.sources.some(s=>s.url.includes('t=S')),q.id+' official answer');
 }
 assert.equal(summaries.size,50);assert.equal(optionCount,200);
});
test('every English question includes context vocabulary; each reading question retains the whole group glossary',()=>{
 for(const q of questions.filter(q=>q.number>=36)){
  const vocabulary=entries[q.id].vocabulary;assert.ok(vocabulary.length>=3,q.id);
  for(const item of vocabulary){assert.ok(item.word);assert.ok(item.partOfSpeech);assert.ok(item.meaning);assert.ok(item.usage.length>=15,q.id);}
 }
 for(let n=46;n<=50;n++){
  const e=entries[`115-1-${n}`];assert.equal(e.vocabulary.length,10);
  assert.ok(e.vocabulary.some(v=>v.word==='brain-computer interface'));
  assert.ok(e.vocabulary.some(v=>v.word==='initiate'));
  assert.deepEqual(e.vocabulary,entries['115-1-46'].vocabulary);
 }
 assert.match(entries['115-1-46'].options.C,/for sure.*possible/);
 assert.match(entries['115-1-48'].options.D,/範圍更廣/);
 assert.match(entries['115-1-49'].summary,/不是.*已經能保證/);
});
test('legal explanations preserve official grading and distinguish ambiguity and procedural exceptions',()=>{
 assert.match(entries['115-1-9'].summary,/不能理解成.*毫無價值/);
 assert.match(entries['115-1-16'].summary,/解任.*並非.*不信任/);
 assert.match(entries['115-1-27'].options.D,/不能.*全然錯誤/);
 assert.match(entries['115-1-34'].options.D,/第 6 條/);
 assert.match(entries['115-1-33'].summary,/18 歲.*20 歲/s);
 assert.match(entries['115-1-20'].summary,/4 個月.*70 歲/s);
 for(const [id,answer] of [['115-1-9','D'],['115-1-16','C'],['115-1-27','B'],['115-1-34','D']])assert.deepEqual(questions.find(q=>q.id===id).accepted,[answer]);
});
const entries114=JSON.parse(readFileSync(new URL('../data/explanations/114-1.json',import.meta.url)));
const questions114=bank.questions.filter(q=>q.examId==='114-1');
test('114 paper has complete individual teaching, original option coverage and contextual vocabulary',()=>{
 assert.equal(questions114.length,50);assert.equal(Object.keys(entries114).length,50);
 const summaries=new Set();
 for(const q of questions114){
  const e=entries114[q.id];assert.ok(e,q.id);assert.equal(e.revision,['113-1-4','113-1-49'].includes(q.id)?3:2);
  assert.ok(e.summary.length>=90);assert.ok(e.summary.includes('\n\n'));summaries.add(e.summary);
  for(const key of ['options','optionVerdicts'])assert.deepEqual(Object.keys(e[key]).sort(),q.options.map(o=>o.letter).sort(),q.id);
  for(const reason of Object.values(e.options))assert.ok(reason.length>=30,q.id);
  assert.ok(e.sources.some(s=>s.url.includes('t=S')),q.id);
  if(q.number>=36){assert.ok(e.vocabulary.length>=3,q.id);for(const v of e.vocabulary){assert.ok(v.word);assert.ok(v.meaning);assert.ok(v.partOfSpeech);assert.ok(v.usage.length>=15);}}
 }
 assert.equal(summaries.size,50);
 for(const [start,end] of [[41,45],[46,50]])for(let n=start;n<=end;n++)assert.deepEqual(entries114[`114-1-${n}`].vocabulary,entries114[`114-1-${start}`].vocabulary);
 assert.ok(entries114['114-1-41'].vocabulary.some(v=>v.word==='take many forms'));
 assert.ok(entries114['114-1-50'].vocabulary.some(v=>v.word==='break the ice'));
});
test('114 official correction preserves single-choice credit and explains presumed negligence without inventing an official rationale',()=>{
 const q=questions114.find(q=>q.number===34),e=entries114[q.id];
 assert.equal(q.multi,false);assert.deepEqual(q.accepted,['A','B']);
 for(const letter of q.accepted)assert.match(e.optionVerdicts[letter],/A 或 B 任一項皆給分/);
 assert.match(e.summary,/不是要求把 A、B 一起勾/);
 assert.match(e.summary,/不冒充官方說明/);
 assert.match(e.options.A,/191.*2.*推定過失/);
 assert.match(e.options.A,/駕駛須證明已盡相當注意/);
 assert.match(e.options.B,/第 9 條.*委託機關/);
 assert.ok(e.sources.some(s=>s.url.includes('code=114010&t=A')));
 const verified=JSON.parse(readFileSync(new URL('../scripts/editorial/civics-english/114-verification.json',import.meta.url)));
 for(const question of questions114)assert.deepEqual(question.accepted,verified.officialAnswers[question.id]);
});
test('114 teaching distinguishes model assumptions, optional agreements and unmentioned reading claims',()=>{
 assert.match(entries114['114-1-5'].summary,/沒有外部性.*基本競爭市場/s);
 assert.match(entries114['114-1-9'].options.B,/得協議.*不是/);
 assert.match(entries114['114-1-9'].options.D,/有無就業及求職/);
 assert.match(entries114['114-1-31'].options.B,/舉證.*衡平責任/);
 assert.match(entries114['114-1-49'].optionVerdicts.D,/本文未提及.*不表示現實不可能/);
 assert.match(entries114['114-1-47'].options.B,/and.*混合/);
 assert.match(entries114['114-1-48'].options.A,/most.*沒有/);
 for(const n of [41,43,45])assert.equal(questions114.find(q=>q.number===n).stem,`請選出文中第 ${n} 空格最合適的答案。`);
 for(const n of [38,39,46,47,48,49,50])assert.match(questions114.find(q=>q.number===n).stem,/^(How|The|Which|According)/);
});

const allPapers=new Map(bank.exams.filter(e=>e.subjectIndex===1&&[106,107,108,109,110,111,113,114,115].includes(e.year)).map(exam=>[exam.id,JSON.parse(readFileSync(new URL('../data/explanations/'+exam.id+'.json',import.meta.url)))]));
test('all nine civics-English papers have 450 distinct full explanations and 1800 individual option reasons',()=>{
 const qs=bank.questions.filter(q=>q.subjectIndex===1&&allPapers.has(q.examId)),summaries=new Set();let reasons=0;
 assert.equal(qs.length,450);assert.equal(allPapers.size,9);
 for(const [examId,items] of allPapers)assert.equal(Object.keys(items).length,50,examId);
 for(const q of qs){
  const e=allPapers.get(q.examId)[q.id];assert.ok(e,q.id);assert.equal(e.revision,['113-1-4','113-1-49'].includes(q.id)?3:2);
  assert.ok(e.summary.length>=90,q.id);assert.ok(e.summary.includes('\n\n'),q.id);summaries.add(e.summary);
  for(const field of ['options','optionVerdicts'])assert.deepEqual(Object.keys(e[field]).sort(),q.options.map(o=>o.letter).sort(),q.id);
  for(const reason of Object.values(e.options)){assert.ok(reason.length>=30,q.id);reasons++;}
  assert.ok(e.sources.some(s=>s.url.includes('t=Q')),q.id+' original paper');
  assert.ok(e.sources.some(s=>s.url.includes('t=S')),q.id+' official answer');
  if(q.number>=36){assert.ok(e.vocabulary.length>=3,q.id);for(const v of e.vocabulary){assert.ok(v.word);assert.ok(v.meaning);assert.ok(v.partOfSpeech);assert.ok(v.usage.length>=15,q.id);}}
 }
 assert.equal(summaries.size,450);assert.equal(reasons,1800);
 for(const year of [106,107,108,109,110,111,113]){
  const report=JSON.parse(readFileSync(new URL(`../scripts/editorial/civics-english/${year}-verification.json`,import.meta.url)));
  assert.match(report.answerPdfSha256,/^[a-f0-9]{64}$/);
  for(const q of qs.filter(q=>q.examId===`${year}-1`)){assert.deepEqual(q.accepted,report.officialAnswers[q.id],q.id);assert.ok(q.accepted.includes(report.originalAnswers[q.id]),q.id);}
 }
});
test('every grouped English item includes the complete glossary, including direct-entry reading questions',()=>{
 for(const [id,e] of allPapers){
  const groupedCloze=!['111-1','115-1'].includes(id);
  for(const [start,end] of groupedCloze?[[41,45],[46,50]]:[[46,50]]){
   assert.ok(e[`${id}-${start}`].vocabulary.length>=8,id);
   for(let n=start;n<=end;n++)assert.deepEqual(e[`${id}-${n}`].vocabulary,e[`${id}-${start}`].vocabulary,id+' '+n);
  }
 }
});
const entry=(year,n)=>allPapers.get(`${year}-1`)[`${year}-1-${n}`];
test('historical and disputed questions teach limitations without changing official accepted answers',()=>{
 const credit=bank.questions.find(q=>q.id==='108-1-15');assert.equal(credit.multi,false);assert.deepEqual(credit.accepted,['A','B','C','D']);
 for(const v of Object.values(entry(108,15).optionVerdicts))assert.match(v,/任一選項給分/);
 assert.ok(entry(108,15).sources.some(s=>s.url.includes('code=108010&t=A')));
 assert.match(entry(108,19).summary,/死亡不當然消滅姻親/);
 assert.match(entry(108,32).summary,/原曲線內部/);
 assert.match(entry(109,35).summary,/現代國民帳.*武器系統.*資本形成/s);
 assert.match(entry(110,17).summary,/管轄.*原審法院.*不能一律/s);
 assert.match(entry(110,30).summary,/最低工資高於原均衡/);
 assert.match(entry(110,38).summary,/官方原卷也寫 policy's command/);
 assert.match(entry(110,46).summary,/橙子.*橙色/s);
 assert.match(entry(111,8).summary,/自願投保/);
 assert.match(entry(111,34).summary,/間接減少誤會/);
 assert.match(entry(111,35).optionVerdicts.A,/個別車輛/);
 assert.match(entry(113,12).summary,/擬制領土.*不等同/s);
 assert.match(entry(113,17).summary,/五萬八千七百五十六/);
 assert.match(entry(113,33).summary,/監護處分.*暫行安置/s);
 assert.match(entry(113,50).options.C,/傳遞的社會倫理內容/);
});
