import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
const checkedStatistics=new Set(['115-2s-25','115-2s-26','106-2s-8','107-2s-1']);
test('statistics and data-processing questions have hidden-dialog explanation payloads',()=>{for(const exam of bank.exams.filter(exam=>exam.subjectIndex>1)){const entries=JSON.parse(readFileSync(new URL(`../data/explanations/${exam.id}.json`,import.meta.url)));const questions=bank.questions.filter(q=>q.examId===exam.id);assert.equal(Object.keys(entries).length,questions.length);for(const q of questions){const e=entries[q.id];assert.ok(e.summary.includes('\n\n'));assert.deepEqual(Object.keys(e.options).sort(),['A','B','C','D']);assert.deepEqual(Object.keys(e.optionVerdicts).sort(),['A','B','C','D']);assert.ok(e.sources.length);}}});


test('every professional-subject explanation is written for its own question and answer',()=>{
 for(const exam of bank.exams.filter(exam=>exam.subjectIndex>1)){
  const entries=JSON.parse(readFileSync(new URL(`../data/explanations/${exam.id}.json`,import.meta.url)));
  const questions=bank.questions.filter(question=>question.examId===exam.id);
  assert.equal(new Set(questions.map(question=>entries[question.id].summary)).size,questions.length,`${exam.id} summaries must not reuse a template`);
  for(const question of questions){
   const entry=entries[question.id],correct=question.options.find(option=>question.accepted.includes(option.letter));
   const announcedAnswer=exam.subjectIndex===3?correct.text.replace(/\s+/g,' ').trim():correct.text.normalize('NFKC').replace(/\s+/g,' ').trim();
   assert.ok(entry.summary.includes(announcedAnswer),`${question.id} must explain its announced answer`);
   assert.doesNotMatch(entry.summary,/先辨認題目問的是定義、計算或推論/);
   if(exam.subjectIndex===3)assert.doesNotMatch(entry.summary,/這題其實在問：|學習重點：|判斷方式：/);
   else if(!checkedStatistics.has(question.id)){assert.match(entry.summary,/這題其實在問：/);assert.match(entry.summary,/學習重點：/);assert.match(entry.summary,/判斷方式：/);}
   assert.doesNotMatch(entry.summary,/把題目給的條件逐一對回定義|看起來可能有關|少了題幹的關鍵條件|只要「看起來相關」/);
   assert.doesNotMatch(entry.summary,/本題考的是/);
   const distinctChoices=exam.subjectIndex===3?new Set(question.options.map(option=>option.text.normalize('NFKC').replace(/\s+/g,' ').trim())).size:4;
   assert.equal(new Set(Object.values(entry.options)).size,distinctChoices,`${question.id} option explanations must follow the distinct choices`);
  }
 }
});


test('professional explanations avoid vague option templates and teach a concrete distinction',()=>{
 const banned=/把題目給的條件逐一對回定義|看起來可能有關|少了題幹的關鍵條件|只要「看起來相關」/;
 for(const exam of bank.exams.filter(exam=>exam.subjectIndex>1)){
  const entries=JSON.parse(readFileSync(new URL(`../data/explanations/${exam.id}.json`,import.meta.url)));
  for(const [id,entry] of Object.entries(entries)){
   if(exam.subjectIndex===3)assert.doesNotMatch(entry.summary,/這題其實在問：|學習重點：|判斷方式：/);
   else if(!checkedStatistics.has(id)){assert.match(entry.summary,/學習重點：/);assert.match(entry.summary,/判斷方式：/);}
   assert.doesNotMatch(entry.summary,banned);
   for(const detail of Object.values(entry.options)){
    assert.doesNotMatch(detail,banned);
    assert.ok(detail.length>(exam.subjectIndex===3||checkedStatistics.has(id)?15:25));
   }
  }
 }
 const storage=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-2'];
 assert.match(storage.summary,/機械動作/);
 assert.match(storage.options.A,/光學儲存媒介/);
 assert.match(storage.options.B,/碟片.*磁頭/);
 assert.match(storage.options.D,/控制器|介面/);
 const wireless=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-3'];
 assert.match(wireless.summary,/滑鼠、鍵盤、耳機/);
 assert.match(wireless.options.A,/物聯網|感測器/);
 assert.match(wireless.options.B,/幾公分|感應支付/);
 assert.match(wireless.options.C,/遠距離|傳輸速率很低/);
 assert.match(wireless.options.D,/個人區域網路|鍵盤、滑鼠/);
 const unix=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-4'];
 assert.match(unix.summary,/建立目錄，ls 只列出目錄項目/);
 assert.match(unix.options.A,/Windows|建立目錄/);
 assert.match(unix.options.B,/輸出到終端機/);
 assert.match(unix.options.C,/列出目錄/);
 assert.match(unix.options.D,/內建命令|別名|外部程式/);
 const frontend=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-11'];
 assert.match(frontend.summary,/瀏覽器原生支援|使用者的瀏覽器/);
 assert.match(frontend.options.A,/資料分析|人工智慧|自動化/);
 assert.match(frontend.options.B,/伺服器端|資料庫/);
 assert.match(frontend.options.C,/文字處理|系統管理/);
 assert.match(frontend.options.D,/瀏覽器.*互動|事件/);


});


test('data-processing explanations stay on the exact question and avoid generic topic filler',()=>{
 const banned=/雖然和.*有關|用途或結果分開記憶|不是本題要求的答案|這個敘述主張|不是題幹所問的功能或概念|這個選項是「|先確認硬體元件的角色|作業系統負責管理 CPU|先判讀資料模型或 SQL 子句的職責|先辨識通訊層級與設備職責|先確認資料結構的存取順序|先依程式執行順序追蹤變數|HTML 負責文件語意與內容結構|先辨識軟體功能與題目要完成的工作|先找出題目要保護的權益|先確認交易雙方與資訊系統|先區分模型訓練與推理的工作|先區分格式的用途與壓縮方式|先圈出題幹的關鍵名詞與限制條件|把程式當成逐行執行的指令|物件導向題要區分類別|由位元、單位、索引或運算順序算錯/;
 for(const exam of bank.exams.filter(exam=>exam.subjectIndex===3)){
  const entries=JSON.parse(readFileSync(new URL(`../data/explanations/${exam.id}.json`,import.meta.url)));
  for(const question of bank.questions.filter(question=>question.examId===exam.id)){
   const entry=entries[question.id];
   assert.doesNotMatch(entry.summary,banned,`${question.id} summary`);
   assert.doesNotMatch(entry.summary,/這題其實在問：|學習重點：|判斷方式：/);
   for(const option of question.options){
    const detail=entry.options[option.letter];
    assert.doesNotMatch(detail,banned,`${question.id} ${option.letter}`);
    assert.ok(detail.length>15,`${question.id} ${option.letter} must give a useful reason`);
    assert.equal(entry.optionVerdicts[option.letter],question.accepted.includes(option.letter)?'可以選。':'不選。');
   }
  }
 }
});

test('numbered combination choices keep their circled numerals and explain each combination',()=>{
 const ids=['115-3d-38','111-3d-38','111-3d-40','107-3d-29','107-3d-45'];
 for(const id of ids){
  const examId=id.slice(0,id.lastIndexOf('-')),entry=JSON.parse(readFileSync(new URL(`../data/explanations/${examId}.json`,import.meta.url)))[id];
  assert.match(entry.summary,/[①②③]/,`${id} must preserve circled numerals`);
  assert.equal(new Set(Object.values(entry.options)).size,4,`${id} must explain each combination separately`);
  assert.doesNotMatch(JSON.stringify(entry),/由位元、單位、索引或運算順序算錯|組合題必須逐項核對|此組包含錯誤敘述或漏掉正確敘述/);
 }
 const sorting=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-38'];
 assert.match(sorting.summary,/遠距離交換.*快速排序.*分割交換/s);
 assert.match(sorting.options.A,/選擇排序.*相同值.*先後順序/);
 assert.match(sorting.options.C,/選擇排序.*快速排序.*不穩定/);
 assert.match(sorting.options.D,/插入排序.*穩定.*快速排序.*打亂/s);
 assert.match(sorting.summary,/應選（B）①③/);
 assert.doesNotMatch(sorting.summary,/應選（B）13/);
});

test('the system-software question explains only the software-to-hardware relationship',()=>{
 const entry=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-32'];
 assert.match(entry.summary,/作業系統.*驅動程式.*硬體資源/);
 assert.doesNotMatch(JSON.stringify(entry),/逐行執行|變數|迴圈|遞迴|物件導向|繼承|封裝|多型/);
 assert.match(entry.options.A,/作業系統.*系統呼叫.*驅動程式/);
 assert.match(entry.options.B,/不需要由應用軟體編譯/);
 assert.match(entry.options.C,/作業系統.*驅動程式.*硬體資源/);
 assert.match(entry.options.D,/職責不同.*不能互相取代/);
});

test('code and calculation questions show their actual execution steps',()=>{
 const generic=/題目所問的正確項目|題目要找出不符合條件|依題目給定的數值與運算規則/;
 const code=/printf|cout|for\s*\(|while\s*\(|fibonacci\(|FR\(|ds\(|processArray|struct iptr|SELECT COUNT/;
 for(const exam of bank.exams.filter(exam=>exam.subjectIndex===3)){
  const entries=JSON.parse(readFileSync(new URL(`../data/explanations/${exam.id}.json`,import.meta.url)));
  for(const question of bank.questions.filter(question=>question.examId===exam.id&&code.test(question.stem))){
   assert.doesNotMatch(entries[question.id].summary,generic,`${question.id} must trace the code or calculation`);
  }
 }
 const entry=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-34'];
 assert.match(entry.summary,/arr \+ 2.*arr\[2\].*arr\[3\].*arr\[4\]/s);
 assert.match(entry.summary,/\{1, 2, 6, 8, 10\}/);
 assert.match(entry.options.A,/arr\[3\].*4.*8/);
 assert.match(entry.options.C,/arr\[1\].*仍是 2/);
});

test('binary-tree traversal includes an exact visual model and distinct traversal reasons',()=>{
 const entry=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-39'];
 assert.equal(entry.diagram.kind,'binary-tree');
 assert.deepEqual(entry.diagram.sequence,['15','10','8','12','20','17','25']);
 assert.deepEqual(entry.diagram.edges,[['15','10'],['15','20'],['10','8'],['10','12'],['20','17'],['20','25']]);
 assert.deepEqual(entry.diagram.nodes.map(node=>[node.label,node.step]),[['15',1],['10',2],['20',5],['8',3],['12',4],['17',6],['25',7]]);
 assert.match(entry.options.A,/中序走訪.*左、根、右/);
 assert.match(entry.options.B,/尚未走訪.*8、12/);
 assert.match(entry.options.C,/根、左、右.*15.*10、8、12.*20、17、25/s);
 assert.match(entry.options.D,/後序走訪.*左、右、根/);
});

test('gateway explanation derives both slash-24 networks before choosing the answer',()=>{
 const entry=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-44'];
 assert.match(entry.summary,/255\.255\.255\.0.*24 位.*\/24/s);
 assert.match(entry.summary,/190\.114\.1\.50.*190\.114\.1\.0\/24/s);
 assert.match(entry.summary,/190\.114\.2\.254.*190\.114\.2\.0\/24/s);
 assert.match(entry.options.A,/主機號碼 50.*網路位址 0.*廣播位址 255/s);
 assert.match(entry.options.B,/190\.114\.1\.0\/24.*190\.114\.2\.0\/24/s);
 assert.match(entry.options.C,/沒有提供.*MAC/);
 assert.match(entry.options.D,/DNS.*使用 IP 位址.*仍可連線/s);
});

test('negative-stem answers are never described as correct statements',()=>{
 const negativeStem=/不正確|錯誤|不包含|不包括|不是|不屬於|最不適合|最不符合|何者非|何者不/;
 const contradiction=/這項描述正確|此敘述正確|這項比較正確|這項大小關係正確/;
 for(const question of bank.questions.filter(question=>question.subjectIndex===3&&negativeStem.test(question.stem))){
  const entries=JSON.parse(readFileSync(new URL(`../data/explanations/${question.examId}.json`,import.meta.url)));
  const entry=entries[question.id];
  assert.doesNotMatch(entry.summary,contradiction,`${question.id} summary contradicts its negative stem`);
  for(const letter of question.accepted)assert.doesNotMatch(entry.options[letter],contradiction,`${question.id} accepted option contradicts its negative stem`);
 }
});

test('5 GHz negative question explains why option D reverses the band characteristics',()=>{
 const entry=JSON.parse(readFileSync(new URL('../data/explanations/115-3d.json',import.meta.url)))['115-3d-46'];
 assert.match(entry.summary,/最不符合.*5 GHz/s);
 assert.match(entry.summary,/牆壁.*衰減.*2\.4 GHz/s);
 assert.match(entry.summary,/特性說反/);
 assert.match(entry.options.A,/短距離.*較高傳輸速率.*不選/s);
 assert.match(entry.options.B,/2\.4 GHz.*擁擠.*5 GHz.*干擾較少/s);
 assert.match(entry.options.C,/穿過牆壁.*衰減.*短於 2\.4 GHz/s);
 assert.match(entry.options.D,/把特性說反.*穿牆能力.*較弱.*2\.4 GHz/s);
 assert.doesNotMatch(entry.options.D,/描述正確|敘述正確/);
});

test('114 data processing 15 explains value lookup in every structure and each incorrect ordering',()=>{
 const entry=JSON.parse(readFileSync(new URL('../data/explanations/114-3d.json',import.meta.url)))['114-3d-15'];
 assert.match(entry.summary,/不是比較.*取出隊首/);
 assert.match(entry.summary,/負載因子.*平均／期望搜尋時間為 O\(1\)/);
 assert.match(entry.summary,/左右子樹的高度差最多 1/);
 assert.match(entry.summary,/環狀.*逐項比對/);
 assert.match(entry.summary,/最差可能退化為 O\(N\)/);
 assert.match(entry.summary,/1 與 9/);
 for(const [letter,detail]of Object.entries(entry.options)){
  for(const pattern of [/雜湊/,/AVL/,/O\(1\)/,/O\(log N\)/,/O\(N\)/])assert.match(detail,pattern,letter);
 }
 assert.match(entry.options.A,/排第一/);assert.match(entry.options.B,/排到最後/);assert.match(entry.options.D,/顛倒/);
 assert.equal(new Set(Object.values(entry.options)).size,4);
});

import {buildDataProcessingExplanations} from '../scripts/data-processing/build-explanations.mjs';
test('reviewed lookup explanation survives regeneration and is the deployed payload',()=>{
 const expected=JSON.parse(readFileSync(new URL('../scripts/data-processing/reviewed-explanations.json',import.meta.url)))['114-3d-15'];
 const first=buildDataProcessingExplanations(bank).get('114-3d')['114-3d-15'];assert.deepEqual(first,expected);
 first.summary='temporary mutation';assert.deepEqual(buildDataProcessingExplanations(bank).get('114-3d')['114-3d-15'],expected);
 const published=JSON.parse(readFileSync(new URL('../public/explanations/114-3d.json',import.meta.url)))['114-3d-15'];assert.deepEqual(published,expected);
});


test('reviewed graph explanations persist and diagram sequences follow the edges',()=>{
 const reviewed=JSON.parse(readFileSync(new URL('../scripts/data-processing/reviewed-explanations.json',import.meta.url)));
 for(const id of ['114-3d-17','115-3d-16','108-3d-17','107-3d-44']){
  const exam=id.slice(0,id.lastIndexOf('-'));const expected=reviewed[id];
  assert.deepEqual(buildDataProcessingExplanations(bank).get(exam)[id],expected);
  assert.deepEqual(JSON.parse(readFileSync(new URL(`../public/explanations/${exam}.json`,import.meta.url)))[id],expected);
  assert.equal(new Set(Object.values(expected.options)).size,4);
  if(!expected.diagram)continue;
  const d=expected.diagram,adj=new Map(d.nodes.map(n=>[n.id,[]]));
  for(const [a,b]of d.edges){adj.get(a).push(b);adj.get(b).push(a);}
  for(const list of adj.values())list.sort();
  const seen=new Set(),dfs=[];const visit=n=>{seen.add(n);dfs.push(n);for(const next of adj.get(n))if(!seen.has(next))visit(next);};visit('A');
  assert.deepEqual(d.sequence,dfs);
  const found=new Set(['A']),queue=['A'],bfs=[];
  while(queue.length){const n=queue.shift();bfs.push(n);for(const next of adj.get(n))if(!found.has(next)){found.add(next);queue.push(next);}}
  assert.deepEqual(d.breadthSequence,bfs);
 }
 const entry=reviewed['114-3d-17'];
 assert.match(entry.summary,/呼叫堆疊/);assert.match(entry.summary,/先進先出/);
 assert.match(entry.options.A,/Hash.*已發現/s);assert.match(entry.options.B,/Heap.*優先/s);
 assert.match(reviewed['108-3d-17'].options.B,/鏈結串列.*佇列/s);
 assert.match(reviewed['107-3d-44'].summary,/d\[i,j\].*min/);
});


test('114 normalization explanation derives the dependencies, anomalies and lossless member split',()=>{
 const id='114-3d-20';
 const reviewed=JSON.parse(readFileSync(new URL('../scripts/data-processing/reviewed-explanations.json',import.meta.url)))[id];
 assert.match(reviewed.summary,/同一個 X.*Y 就必須相同/s);
 assert.match(reviewed.summary,/tNo → mId → birthday/);
 assert.match(reviewed.summary,/T001.*T002.*更新異常/s);
 assert.match(reviewed.summary,/主鍵是 tNo.*主鍵是 mId.*外鍵/s);
 assert.match(reviewed.summary,/相同的 mId 連接/);
 assert.match(reviewed.options.A,/年月日/);
 assert.match(reviewed.options.B,/複合候選鍵.*單一欄位 tNo/s);
 assert.match(reviewed.options.C,/mId 不是超鍵.*birthday/s);
 assert.match(reviewed.options.D,/不可能符合 4NF/);
 assert.deepEqual(buildDataProcessingExplanations(bank).get('114-3d')[id],reviewed);
 assert.deepEqual(JSON.parse(readFileSync(new URL('../public/explanations/114-3d.json',import.meta.url)))[id],reviewed);
});

test('reported 111 merge-sort question explains the split, merge and every alternative',()=>{
 const id='111-3d-12',reviewed=JSON.parse(readFileSync(new URL('../scripts/data-processing/reviewed-explanations.json',import.meta.url)))[id];
 assert.deepEqual(buildDataProcessingExplanations(bank).get('111-3d')[id],reviewed);
 assert.deepEqual(JSON.parse(readFileSync(new URL('../public/explanations/111-3d.json',import.meta.url)))[id],reviewed);
 assert.match(reviewed.summary,/拆成「3」與「1、2」/);assert.match(reviewed.summary,/先取 1、再取 2.*剩下的 3/s);
 assert.match(reviewed.options.A,/相鄰.*交換/s);assert.match(reviewed.options.B,/拆.*合併/s);assert.match(reviewed.options.C,/最小值.*交換/s);assert.match(reviewed.options.D,/逐筆.*插/s);
 assert.deepEqual(reviewed.diagram.sequence,['1','2','3']);assert.equal(reviewed.diagram.sequenceLabel,'排序後的合併結果：');
 assert.equal(new Set(Object.values(reviewed.options)).size,4);
});

test('reported warehouse question distinguishes incorrect OLTP from analytical use',()=>{
 const id='111-3d-18',reviewed=JSON.parse(readFileSync(new URL('../scripts/data-processing/reviewed-explanations.json',import.meta.url)))[id];
 assert.deepEqual(buildDataProcessingExplanations(bank).get('111-3d')[id],reviewed);
 assert.deepEqual(JSON.parse(readFileSync(new URL('../public/explanations/111-3d.json',import.meta.url)))[id],reviewed);
 assert.match(reviewed.options.D,/OLTP.*結帳/s);assert.match(reviewed.options.D,/OLAP.*分析/s);
 assert.match(reviewed.options.B,/資料探勘/);assert.match(reviewed.options.C,/非揮發/);
 assert.equal(reviewed.optionVerdicts.D,'可以選。');assert.match(reviewed.options.D,/描述錯誤/);
});

test('reported peripheral question explains GPIO and the correct PCIe description',()=>{
 const id='111-3d-28',reviewed=JSON.parse(readFileSync(new URL('../scripts/data-processing/reviewed-explanations.json',import.meta.url)))[id];
 assert.deepEqual(buildDataProcessingExplanations(bank).get('111-3d')[id],reviewed);
 assert.deepEqual(JSON.parse(readFileSync(new URL('../public/explanations/111-3d.json',import.meta.url)))[id],reviewed);
 assert.match(reviewed.options.B,/通用輸入／輸出.*按鈕.*LED/s);
 assert.match(reviewed.options.C,/PCIe.*顯示卡.*正確/s);
 assert.match(reviewed.options.D,/接頭.*不代表一定支援 USB PD/s);
});

test('reported attack question distinguishes observation from replay and disruption',()=>{
 const id='111-3d-44',reviewed=JSON.parse(readFileSync(new URL('../scripts/data-processing/reviewed-explanations.json',import.meta.url)))[id];
 assert.deepEqual(buildDataProcessingExplanations(bank).get('111-3d')[id],reviewed);
 assert.deepEqual(JSON.parse(readFileSync(new URL('../public/explanations/111-3d.json',import.meta.url)))[id],reviewed);
 assert.match(reviewed.options.A,/被動攻擊.*選 A/s);
 assert.match(reviewed.options.B,/被動監聽.*重新發送.*主動攻擊/s);
 assert.match(reviewed.options.C,/可用性.*主動攻擊/s);
 assert.match(reviewed.options.D,/修改.*主動攻擊/s);
});
