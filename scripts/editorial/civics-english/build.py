"""Build only individually authored notes; never infer explanatory reasons from an answer letter."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[3]
bank=json.loads((root/'data/bank.json').read_text())
questions={q['id']:q for q in bank['questions']}
exams={e['id']:e for e in bank['exams']}
refs={
 'fiscal':('IMF：財政政策與總需求','https://www.imf.org/external/pubs/ft/fandd/basics/36-fiscal-policy.htm'),
 'incrementTax':('財政部：土地增值稅課徵範圍','https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-q-and-a/local/land-value-increment-tax/o9RMNA8'),
 'correction108':('考選部：108年標準答案更正清冊（第15題一律給分）','https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=108010&t=A#page=1'),
 'neutral':('全國法規資料庫：公務人員行政中立法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=S0110036'),
 '718':('憲法法庭：釋字第718號','https://cons.judicial.gov.tw/docdata.aspx?fid=100&id=310899'),
 '490':('憲法法庭：釋字第490號','https://cons.judicial.gov.tw/docdata.aspx?fid=100&id=310671'),
 'education':('全國法規資料庫：國民教育法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=H0070001'),
 'temporary':('司法院：暫行安置及監護處分修法說明','https://www.judicial.gov.tw/tw/cp-1471-581247-8b5b1-1.html'),
 'labor':('全國法規資料庫：勞資爭議處理法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0020007'),
 'insurance':('勞保局：家庭幫傭自願加保說明','https://www.bli.gov.tw/0102458.html'),
 'asean':('東南亞國協：共同體介紹','https://asean.org/our-communities/'),
 'nationality':('全國法規資料庫：國籍法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0030001'),
 'presidential':('全國法規資料庫：總統副總統選舉罷免法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0020053'),
 'criminalprocedure':('全國法規資料庫：刑事訴訟法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=C0010001'),
 'civilprocedure':('全國法規資料庫：民事訴訟法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=B0010001'),
 'eu':('歐洲聯盟：組織與機構','https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies_en'),
 'copyright':('智慧財產局：著作權法','https://www.tipo.gov.tw/tw/copyright/693-8432.html'),
 'cptpp':('紐西蘭外交貿易部：CPTPP 第 5 條加入資格','https://www.mfat.govt.nz/en/about-us/who-we-are/treaties/comprehensive-and-progressive-agreement-for-tpp'),
 'criminal':('全國法規資料庫：中華民國刑法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=C0000001'),
 '721':('憲法法庭：釋字第 721 號','https://cons.judicial.gov.tw/docdata.aspx?fid=100&id=310902'),
 '331':('憲法法庭：釋字第 331 號','https://cons.judicial.gov.tw/docdata.aspx?fid=100&id=310512'),
 'election':('全國法規資料庫：公職人員選舉罷免法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0020010'),
 'covenants':('全國法規資料庫：兩公約施行法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0020028'),
 'university':('全國法規資料庫：大學法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=H0030001'),
 '784':('憲法法庭：釋字第 784 號','https://cons.judicial.gov.tw/docdata.aspx?fid=100&id=310965'),
 'indigenous':('全國法規資料庫：原住民族基本法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0130003'),
 'state':('全國法規資料庫：國家賠償法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0020004'),
 'amendments':('全國法規資料庫：中華民國憲法增修條文','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000002'),
 'correction114':('考選部：114 年初等考試標準答案更正清冊（第 34 題 A 或 B 均給分）','https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=114010&t=A'),
 'constitution':('全國法規資料庫：中華民國憲法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001'),
 'dv':('全國法規資料庫：家庭暴力防治法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0050071'),
 'referendum':('全國法規資料庫：公民投票法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0020050'),
 'citizen':('全國法規資料庫：國民法官法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0030320'),
 '807':('憲法法庭：釋字第 807 號解釋摘要','https://cons.judicial.gov.tw/docdata.aspx?fid=5301&id=168332'),
 'korea':('韓國法制處：韓國憲法第 63 條','https://www.law.go.kr/LSW/eng/engLsInfoR.do?lsiSeq=61603'),
 'cross':('大陸委員會：臺灣地區與大陸地區人民關係條例','https://www.mac.gov.tw/cp.aspx?n=AA7F5E39A6D3B893'),
 'rights':('法務部：兩公約國家報告國際審查制度說明','https://www.moj.gov.tw/2204/2795/2796/57917/'),
 'procedure':('全國法規資料庫：行政程序法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0030055'),
 'local':('全國法規資料庫：地方制度法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0040003'),
 'legislation':('立法院：議案審議的讀會程序','https://www.ly.gov.tw/EngPages/Detail.aspx?nodeid=217&pid=37534'),
 'gender':('全國法規資料庫：性別平等工作法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0030014'),
 'civil':('全國法規資料庫：民法','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=B0000001'),
 'litigation':('全國法規資料庫：行政訴訟法第 6 條','https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0030154'),
}
for path in sorted(Path(__file__).parent.glob('*.txt')):
 year=path.stem; entries={}; exam=exams[f'{year}-1']
 vocab=json.loads(path.with_name(year+'-vocabulary.json').read_text())
 for line in path.read_text().splitlines():
  if not line or line.startswith('#'):continue
  parts=line.split('|');assert len(parts)==7,(path,line[:40])
  number,summary,*tail=parts;negative=number.endswith('!');number=number.rstrip('!')
  qid=f'{year}-1-{number}';q=questions[qid];assert qid not in entries
  reasons=tail[:4];assert len(summary)>=90,(qid,'summary');assert '~' in summary,qid
  assert all(len(reason)>=30 for reason in reasons),(qid,'reasons')
  selected=set(''.join(q['accepted']))
  verdicts={o['letter']:(('敘述錯誤，因此本題應選。' if o['letter'] in selected else '敘述正確，因此本題不選。') if negative else ('本題正確答案，應選。' if o['letter'] in selected else '不符合本題條件，不選。')) for o in q['options']}
  sources=[{'title':'考選部：本卷官方試題','url':exam['source']+f"#page={q['page']+1}"},{'title':'考選部：本卷標準答案','url':exam['answerSource']}]
  for key in tail[4].split(','):
   if key!='official':sources.append(dict(zip(['title','url'],refs[key])))
  item={'summary':summary.replace('~','\n\n'),'options':dict(zip([o['letter'] for o in q['options']],reasons)),'optionVerdicts':verdicts,'sources':sources,'revision':2,'reviewedAt':'2026-10-19'}
  if int(number)>=36:item['vocabulary']=vocab.get(number,vocab.get('reading-46-50',[]))
  entries[qid]=item
 # Explicit editorial verdicts for alternatives that cannot honestly be called simply false.
 if year=='115':
  entries['115-1-9']['optionVerdicts']['D']='官方計分答案，應選；「無助於」有表述限制，詳見下方說明。'
  entries['115-1-27']['optionVerdicts']['D']='官方未採此項；二讀仍有議決實務，不能一概說完全錯誤。'
  entries['115-1-27']['optionVerdicts']['B']='官方計分答案，指一般付委原則，須留意例外。'
 if year=='114':
  for letter in ['A','B']:
   entries['114-1-34']['optionVerdicts'][letter]='官方更正接受此項；選 A 或 B 任一項皆給分，詳見要件分析。'
  entries['114-1-49']['optionVerdicts']={o['letter']:('本文未提及，因此本題應選；不表示現實不可能。' if o['letter']=='D' else '本文有提及，因此本題不選。') for o in questions['114-1-49']['options']}
 # Preserve official scoring while distinguishing disputed wording and reading scope.
 if year=='108':
  for letter in 'ABCD':entries['108-1-15']['optionVerdicts'][letter]='官方更正接受任一選項給分；不是要求四項皆選，概念差異詳見解析。'
 special={
 '106':{2:{'A':'相關概念有重疊；官方依本題教材分類採 B，詳見說明。'},21:{'C':'個案分類須看固定方式；官方採典型橋樑 B。','D':'個案分類須看設置型態；官方採典型橋樑 B。'}},
 '107':{6:{'D':'官方採此簡化比較；不代表所有思想流派皆如此。'},31:{'C':'官方以總經濟成本口徑採此答案；狹義機會成本須區分。'}},
 '108':{4:{'A':'依題目線索的官方答案；不憑單一新聞診斷依附。'},32:{'B':'官方採有效可用勞動減少的模型；其他模型詳見說明。'}},
 '109':{30:{'A':'部分歷史分工可如此描述；官方採 C 的結構說明。'},35:{'B':'官方採此錯配；現代軍購資本化口徑有差異，詳見說明。'}},
 '110':{2:{'D':'本題答案；社團為泛稱，不等於社團法人。'},17:{'B':'官方計分答案；再審方向較合，最高法院管轄表述有疑義。'},21:{'A':'規劃與評估可銜接；官方以既有政策檢討採 D。','D':'官方依政策檢討焦點歸評估，適用界線詳見說明。'},46:{'C':'原文橙子／橙色有疑義，官方未採此項，詳見說明。','D':'官方計分答案；本文未列護眼，不表示現實會傷眼。'}},
 '111':{34:{'D':'官方計分答案；較不直接改善國人認識，非完全無價值。'},35:{'A':'以個別車輛使用分類有依據；官方分析系統而採 B。','B':'官方依系統付費共享採此項；有限車輛仍有競爭與擁擠。'}},
 '113':{4:{'D':'長期供給效果可能成立；官方題意著重短期需求。'},12:{'A':'官方教材採擬制領土用語；不等於真正領土，詳見限制。'},18:{'B':'廣義政治參與可如此理解；官方採 D 的明確共同點。'},29:{'B':'原考年度依釋字490號計分；歷史理由不可泛化。'},33:{'A':'官方計分答案；處遇法定名稱及程序有表述疑義。'}}}
 for n,mapping in special.get(year,{}).items():entries[f'{year}-1-{n}']['optionVerdicts'].update(mapping)
 for qid,e in entries.items():
  if int(year)<=113:e['reviewedAt']='2026-10-20'
  if int(year)<=113 and int(qid.rsplit('-',1)[1])>=46 and qid not in ['110-1-46']:
   q=questions[qid]
   if 'NOT' in q['stem'] or 'not ' in q['stem']:
    e['optionVerdicts']={o['letter']:('不符本文或未按題意提及，因此本題應選；詳見逐項說明。' if o['letter'] in q['accepted'] else '本文有相應支持，因此本題不選。') for o in q['options']}
 assert len(entries)==50,(year,len(entries))
 (root/f'data/explanations/{year}-1.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
 print(year,len(entries),'questions;',sum(len(x.get('vocabulary',[])) for x in entries.values()),'vocabulary displays')
