import {mkdirSync,writeFileSync} from 'node:fs';

const normalise=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const topics=[
 {match:/平均數|中位數|眾數|四分位|盒狀圖|直方圖|標準差|變異數|變異係數|偏態|柴比雪夫|Chebyshev|調和平均|描述統計/,label:'描述統計',rule:'先確認題目是在比較集中趨勢、離散程度或分布形狀。平均數會受極端值影響；標準差與變異係數用來描述資料的離散程度。'},
 {match:/機率|條件機率|貝氏|Bayes|獨立|聯合|彩券|骰子|抽球|至少|不放回|組合|排列/,label:'機率',rule:'先寫出事件與已知條件，再判斷是否要使用加法法則、乘法法則、條件機率或補事件。抽樣是否放回會改變各次抽取是否獨立。'},
 {match:/常態|標準常態|指數分配|卜瓦松|Poisson|二項|Binomial|隨機變數|機率密度|期望值|變異數|分配|壽命|到達/,label:'機率分配',rule:'先辨認隨機變數的分配種類，再使用該分配的平均數、變異數、累積機率或標準化關係。常態分配常先換成 Z 值；二項分配則要同時利用期望值與變異數。'},
 {match:/抽樣|樣本|母體|信賴區間|估計|抽樣分配|樣本數|系統抽樣|集群抽樣|分層抽樣/,label:'抽樣與區間估計',rule:'先辨識抽樣設計與估計對象。信賴區間以樣本統計量加減誤差範圍表示；樣本數增大通常會讓標準誤下降、區間縮小。'},
 {match:/檢定|虛無|對立假設|p 值|顯著水準|型 I|型 II|拒絕域|檢定統計量|power|比例差異/,label:'假設檢定',rule:'先寫出 H₀ 與 H₁，確認是單尾或雙尾，再用顯著水準、p 值或臨界值做結論。不要把「未拒絕 H₀」誤解成已經證明 H₀ 為真。'},
 {match:/ANOVA|變異數分析|處理間|區集|因子|交互作用|F 分配|MSTR|MSE|平方和|自由度/,label:'變異數分析',rule:'ANOVA 用處理間變異與誤差變異的比值檢驗多組平均數是否相同。解題時依設計種類確認自由度、平方和、均方與 F 統計量。'},
 {match:/迴歸|相關|散布圖|最小平方|SSE|SSR|R²|解釋能力|預測|斜率/,label:'相關與迴歸',rule:'相關係數描述線性關係的方向與強度；迴歸式則用 X 預測 Y。SSR/(SSR+SSE) 是模型解釋變異比例，斜率代表 X 增加一單位時 Y 的預期改變。'},
 {match:/卡方|列聯表|獨立|期望次數|適合度|類別|性別/,label:'卡方檢定',rule:'列聯表問題先計算各格期望次數，公式是「列總和 × 欄總和 ÷ 總數」。再以觀察值與期望值的差異判斷是否支持獨立或分布一致。'},
 {match:/無母數|充分性|估計量|統計量/,label:'統計推論概念',rule:'先從定義判斷統計方法需要的分布假設與資料尺度。無母數方法通常較少依賴特定母體分布，但可能犧牲部分效率。'},
];
const fallback={label:'統計基本概念',rule:'先整理題目給的數值、統計量與限制條件，再從各選項核對定義、公式或推論方向。'};
const topicFor=question=>{
 const text=normalise([question.stem,...question.options.map(option=>option.text)].join(' '));
 const priority=['卡方檢定','變異數分析','相關與迴歸','假設檢定','抽樣與區間估計','機率分配','機率','描述統計','統計推論概念'];
 return priority.map(label=>topics.find(topic=>topic.label===label)).find(topic=>topic?.match.test(text))||fallback;
};

function plainGuide(topic){
 const guides={
  '描述統計':'先看題目是在問資料的中心、分散程度，還是整體形狀；不要把平均數、標準差和相關係數當成同一件事。',
  '機率':'把每一個事件拆開看：哪些情況可以相加、哪些情況要相乘。題目有寫「至少」或「沒有」時，常常從反面去算會更快。',
  '機率分配':'先認出這是哪一種分配，再把題目給的平均數、機率或標準差放到對應的規則裡。',
  '抽樣與區間估計':'先分清楚題目在談母體還是樣本；樣本只是拿來估計母體，不是母體本身。',
  '假設檢定':'把它當成判斷證據夠不夠強：先訂出原本的假設，再看資料有沒有強到足以推翻它。',
  '變異數分析':'它是在比較好幾組平均數。重點不是哪組數字最大，而是組與組之間的差異有沒有大到不像隨機波動。',
  '相關與迴歸':'相關是在看兩件事有沒有一起變動；迴歸則是在用一個變數去預測另一個變數，兩者不要混在一起。',
  '卡方檢定':'先用列總和和欄總和算出「如果沒有關係，理論上應有多少人」，再和實際數字比較。',
  '統計推論概念':'先把名詞換成日常語言：這個方法需要什麼假設、能回答什麼問題，再回頭看選項。',
  '電腦組織與資料表示':'先把題目中的單位、位元或記憶體位置拆開算；不要一次把十進位、二進位和位址混在一起。',
  '作業系統':'把作業系統想成資源管家：誰先用 CPU、資料放在哪裡、程式目前在等什麼，都要分開看。',
  '資料庫':'先看題目在談資料怎麼存、怎麼查，還是資料之間怎麼連結；主鍵、外鍵和 SQL 子句各有不同工作。',
  '電腦網路與資訊安全':'先分清楚資料是在同一個網路內傳，還是要跨網路；再判斷題目問的是設備、協定還是安全目的。',
  '資料結構與演算法':'先把資料怎麼進、怎麼出、怎麼走的順序畫清楚；只要順序抓對，選項通常就能排除。',
  '程式設計':'把程式當成逐行執行的指令：先追變數怎麼改，再判斷迴圈、函式或物件導向概念。',
  '網頁技術':'先記住分工：HTML 放內容結構、CSS 管外觀、JavaScript 做互動；題目問哪一件事，就回到對應工具。',
  '辦公軟體與資料處理':'先想清楚你真正要完成的工作，再找對應的軟體功能或函數，不要只憑名稱猜答案。',
  '資訊倫理與資安治理':'先看題目要保護的是誰的資料、權益或系統安全，再判斷行為有沒有踩到界線。',
  '電子商務與資訊應用':'先分清楚交易雙方和系統在流程中的角色，再看哪個選項真的能完成題目要的服務或流程。',
  '人工智慧':'先分清楚模型是在學習資料，還是在使用已學到的結果回答問題，兩個階段的工作不同。',
  '多媒體資料':'先看題目重視的是音質、檔案大小或能不能還原原始資料；這三件事常常需要取捨。',
  '統計基本概念':'先把題目給的數字和限制條件圈出來，再用最基本的定義逐一排除不符合的選項。',
  '資料處理基本概念':'先把題目真正要問的關鍵字抓出來，再把每個選項放回定義裡比對。',
 };
 return guides[topic.label]||'先把題目的關鍵條件抓出來，換成自己的話理解後，再回頭比對選項。';
}
function questionInPlainWords(question){
 const stem=normalise(question.stem);
 return stem.length>170?`${stem.slice(0,167)}……`:stem;
}

const conceptNotes={
 '平均數':'平均數把全部數值加總後除以筆數，容易受到少數極端值拉動。',
 '中位數':'中位數先排序再取中間位置；資料筆數為偶數時，取中間兩筆的平均。',
 '眾數':'眾數是出現次數最多的值，資料可以有一個、多個或沒有明顯眾數。',
 '標準差':'標準差衡量資料離平均數有多分散；數值越大，資料的波動越大。',
 '變異數':'變異數是離均差平方的平均；標準差是變異數開根號後的單位化結果。',
 '變異係數':'變異係數是標準差除以平均數，適合比較不同單位或不同平均水準資料的相對分散程度。',
 '常態分配':'常態分配以平均數為中心且左右對稱；不同位置的機率常先換算成 Z 值。',
 '二項分配':'二項分配描述固定次數、每次只有成功或失敗且成功機率相同的重複試驗。',
 '卜瓦松分配':'卜瓦松分配常用於固定時間或空間內的事件發生次數，參數 λ 同時是平均數與變異數。',
 '指數分配':'指數分配常描述等待下一次事件的時間；它具有無記憶性，速率 λ 的平均等待時間是 1/λ。',
 '條件機率':'條件機率是在已知事件 B 已發生時，重新計算事件 A 的機率，公式為 P(A∩B)/P(B)。',
 '獨立':'若兩事件獨立，知道其中一件發生不會改變另一件的機率，且 P(A∩B)=P(A)P(B)。',
 '信賴區間':'信賴區間由估計值加減誤差範圍構成；樣本數增加通常使標準誤和區間寬度降低。',
 '虛無假設':'虛無假設 H₀ 是檢定起點，通常表示沒有差異或沒有關係；證據不足時只能說未拒絕它。',
 'p 值':'p 值是在 H₀ 為真時，得到目前或更極端資料的機率；p 值小於顯著水準時拒絕 H₀。',
 '相關係數':'相關係數介於 -1 與 1，表示線性關係的方向與強度，不能單憑它推論因果。',
 '迴歸':'迴歸式用自變數預測依變數；斜率描述 X 增加一單位時，Y 的預期改變量。',
 'R²':'R² 是模型解釋的變異比例，等於 SSR/(SSR+SSE)，不是相關係數本身。',
 '卡方':'卡方檢定比較觀察次數與獨立假設下的期望次數；每格期望次數為列總和乘欄總和再除以總數。',
 'ANOVA':'變異數分析以處理間均方除以誤差均方得到 F 值，用來檢驗多組母體平均數是否相同。',
};
function noteFor(text){
 const compact=normalise(text);
 const key=Object.keys(conceptNotes).find(key=>compact.includes(key));
 return key?conceptNotes[key]:null;
}
function calculationNote(question,correct,topic){
 const stem=normalise(question.stem);
 if(/P\(A∪B\)/.test(stem))return '因為 A、B 獨立，聯集機率是 P(A)+P(B)-P(A)P(B)=0.4+0.5-0.2=0.7。這裡要扣掉同時發生的部分，避免重複計算。';
 if(/Chebyshev/.test(stem)&&/4.5 與 9.3/.test(stem))return '區間離平均數 2.4 小時，剛好是 2 個標準差。柴比雪夫定理指出，落在平均數正負 2 個標準差內的比例至少為 1-1/2²=75%。';
 if(/4 個燈泡中至少 1 個/.test(stem))return '「至少 1 個」可改算補事件：先求 4 個都沒有瑕疵的機率，再用 1 減掉它。這比逐一列出 1、2、3、4 個瑕疵更不容易漏算。';
 if(/平均長度為 4 分鐘/.test(stem)&&/2 分鐘內沒有/.test(stem))return '平均等待時間為 4 分鐘，所以指數分配速率 λ=1/4。2 分鐘內沒有人到達的機率是 e^{-λt}=e^{-0.5}，約 0.607。';
 if(/P\(X=x\)=ax/.test(stem))return '先讓所有機率加總為 1：a(1+2+3)=1，所以 a=1/6；再依 E(X)=ΣxP(X=x) 把每個可能值乘上它的機率後加總。';
 if(/P1：到達 0/.test(stem))return '這題使用可搶占式最短剩餘時間優先排程。每有新行程到達，就重新比較目前行程的剩餘時間與新行程所需時間，選較短者執行。';
 if(/SSE = 200/.test(stem))return '決定係數 R²=SSR/(SSR+SSE)=600/(600+200)=0.75。也就是模型解釋了 Y 總變異的 75%，剩下 25% 是殘差。';
 if(/中位數/.test(stem)&&/65, 90, 85/.test(stem))return '先排序為 65、68、77、79、81、85、90、100。共有 8 筆資料，因此中位數是第 4 與第 5 筆的平均，即 (79+81)/2=80。';
 if(/期望的 新生人數/.test(stem))return '在「新生組成未改變」的虛無假設下，期望次數等於總人數乘以前一年度比例：300×0.30=90。期望次數不是直接把兩年度人數相減。';
 return `${topic.rule}本題答案是「${normalise(correct.text)}」，因為它符合題幹指定的統計概念或計算結果。`;
}
function optionExplanation(question,option,correct,topic){
 const optionText=normalise(option.text),correctText=normalise(correct.text);
 const concept=noteFor(optionText)||noteFor(question.stem);
 if(option.letter===correct.letter){
  return `（${option.letter}）可以選。${concept||`它符合題目給定的條件，結論為「${correctText}」。`}請把它和題幹的數值、定義或推論方向一起核對。`;
 }
 return `（${option.letter}）不選。${concept||`「${optionText}」沒有得到題幹條件支持；依題意應選「${correctText}」。`}本題問的結論是「${correctText}」，不能只看名詞相近就選它。`;
}
const checkedCalculations={
 '115-2s-25':{
  summary:'先算三組平均數：A 組 23、B 組 27.25、C 組 20.75；全部 12 筆資料的總平均為 23.67。處理間平方和 SSTR = 4×[(23−23.67)²+(27.25−23.67)²+(20.75−23.67)²]，約為 87.17。三組的處理自由度為 3−1=2，因此處理間均方 MSTR = 87.17÷2，約為 43.58，選 A。',
  options:{A:'43.58 是處理間平方和約 87.17 除以自由度 2 的結果。',B:'7.33 不是由三組平均數計得的處理間均方。',C:'5.94 不符合以組間平方和除以 2 的結果。',D:'53.51 不是本題組間均方；計算時須先將各組平均與總平均的差平方，再乘各組樣本數。'}
 },
 '115-2s-26':{
  summary:'信賴區間總寬度不超過 0.10，因此單側誤差不得超過 0.05。90% 信賴水準取 z ≈ 1.645，已知瑕疵比例 p = 0.10。代入 n ≥ z²p(1−p)/E²，得到 1.645²×0.1×0.9÷0.05² ≈ 97.42；樣本數要向上取整，至少 98，選 D。',
  options:{A:'45 人不足以把總寬度控制在 0.10 以內。',B:'68 人小於向上取整所需的 98 人。',C:'78 人仍小於 98 人，不能滿足要求。',D:'98 人是將約 97.42 向上取整後的最少樣本數。'}
 },
 '106-2s-8':{
  summary:'莖葉圖例如 6｜2 代表 62 分。將 50 筆資料按大小排列，前 25 筆的中位數是第 13 筆 62，後 25 筆的中位數是第 38 筆 79。因此四分位距為 Q3−Q1=79−62=17，選 C。',
  options:{A:'13 不是上四分位數 79 與下四分位數 62 的差。',B:'15 不是 79−62 的結果。',C:'上四分位數 79 減下四分位數 62，四分位距為 17。',D:'19 與原卷莖葉圖計算出的四分位距 17 不符。'}
 },
 '107-2s-1':{
  summary:'先由條件機率算 P(A ∩ B)=P(A | B)P(B)=0.4×0.6=0.24。已知 P(A ∩ Bᶜ)=0.2，因此 A 在 B 外的部分為 0.2；聯集可視為整個 B 加上 A 在 B 外的部分，P(A ∪ B)=0.6+0.2=0.8，選 C。',
  options:{A:'0.6 只算了事件 B，漏掉 A 在 B 之外的 0.2。',B:'0.7 不是 0.6 加 0.2 的結果。',C:'聯集為 P(B)+P(A ∩ Bᶜ)=0.6+0.2=0.8。',D:'0.9 高於依題意算出的聯集機率 0.8。'}
 },
};
function explanationFor(question,exam){
 const checked=checkedCalculations[question.id];
 if(checked)return {summary:checked.summary.replace('。','。\n\n'),options:checked.options,optionVerdicts:Object.fromEntries(question.options.map(option=>[option.letter,question.accepted.includes(option.letter)?'可以選。':'不選。'])),sources:[{title:`${exam.year} 年初等考試統計學大意官方試題與答案`,url:exam.source}]};
 const topic=topicFor(question),correct=question.options.find(option=>question.accepted.includes(option.letter));
 if(!correct)throw Error(`Missing answer for ${question.id}`);
 const calculation=calculationNote(question,correct,topic),visualNote=question.hasVisual?'\n\n題目含表格、圖形或公式時，請同時開啟官方原卷核對原始版面與數值。':'';
 const shownAnswer=normalise(correct.text),shownQuestion=questionInPlainWords(question);
 const summary=`這題其實在問：${shownQuestion}\n\n學習重點：${plainGuide(topic)}\n\n判斷方式：${calculation}\n\n因此應選（${correct.letter}）${shownAnswer}。${visualNote}`;
 const options=Object.fromEntries(question.options.map(option=>[option.letter,optionExplanation(question,option,correct,topic)]));
 const optionVerdicts=Object.fromEntries(question.options.map(option=>[option.letter,option.letter===correct.letter
  ? `可以選。（${option.letter}）${normalise(option.text)}符合題幹要求。`
  : `不選。（${option.letter}）${normalise(option.text)}不是本題要求的結論。`,
 ]));
 return {summary,options,optionVerdicts,sources:[{title:`${exam.year} 年初等考試統計學大意官方試題與答案`,url:exam.source}]};
}

export function writeStatisticsExplanations(bank,baseUrl=new URL('../../data/explanations/',import.meta.url)){
 mkdirSync(baseUrl,{recursive:true});
 for(const exam of bank.exams.filter(exam=>exam.subjectIndex===2)){
  const entries=Object.fromEntries(bank.questions.filter(question=>question.examId===exam.id).map(question=>[question.id,explanationFor(question,exam)]));
  writeFileSync(new URL(`${exam.id}.json`,baseUrl),JSON.stringify(entries,null,2)+'\n');
 }
}
