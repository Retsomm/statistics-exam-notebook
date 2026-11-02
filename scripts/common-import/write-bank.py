"""Materialize reviewed candidates with the published answer corrections."""
import json
from pathlib import Path
import sys

CORRECTIONS={
 '100-0':{39:['C']},'100-1':{47:'all'},
 '101-0':{46:['A','B','AB']},
 '102-1':{14:'all',32:['A','B','C','D']},
 '103-1':{19:['C','D','CD'],25:'all'},
 '104-1':{30:['A','D','AD']},
 '112-1':{12:['A','B'],21:['C','D']},
 '97-1':{30:['B','C','BC']},
 '98-0':{6:['A','D']},
 '98-1':{24:['A','B','C','D'],50:['C','D']},
}

if __name__=='__main__':
 source_dir=Path(sys.argv[1]);meta=[]
 answer_path=Path('data/official-answer-keys.json');answer_keys=json.loads(answer_path.read_text())
 for path in sorted(source_dir.glob('*.json')):
  source=json.loads(path.read_text());candidate=json.loads((Path('/tmp/common-candidates')/path.name).read_text())
  qs=candidate['questions'];files=source['files'];exam_id=qs[0]['examId'];corrections=CORRECTIONS.get(source['id'],{})
  for q,key in zip(qs,candidate['corrected']):
   number=q['number']
   if key=='#' and number not in corrections:raise ValueError(f'{exam_id}-{number}: unresolved official correction')
   if number in corrections:
    correction=corrections[number]
    if correction=='all':q['allCredit']=True;q['accepted']=['A','B','C','D'];q['correction']='依考選部更正公告，本題一律給分。'
    else:q['accepted']=correction;q['correction']='依考選部更正公告，接受答案：'+'、'.join(correction)+'。'
   elif key!='#':q['accepted']=[key]
   if not q['stem'] or any(not o['text'] for o in q['options']):raise ValueError(q['id'])
   if any('\ue000'<=c<='\uf8ff' for c in q['stem']+q['passage']+''.join(o['text'] for o in q['options'])):raise ValueError(q['id']+' unresolved font character')
   q['text']=q['stem']+'\n'+'\n'.join('('+o['letter']+') '+o['text'] for o in q['options'])
  Path(f'data/papers/{exam_id}.json').write_text(json.dumps(qs,ensure_ascii=False,indent=2)+'\n')
  explanation=Path(f'data/explanations/{exam_id}.json')
  if not explanation.exists():explanation.write_text('{}\n')
  answer=files.get('S',files.get('M'))
  record={'id':exam_id,'year':source['year'],'subject':qs[0]['subject'],'subjectIndex':source['subjectIndex'],'count':len(qs),'pages':[],'source':files['Q']['url'],'answerSource':answer['url'],'listing':source['listing'],'correctionPdf':files['M']['url'] if 'M' in files else None,'explanationStatus':'pending','sourceSha256':files['Q']['sha256'],'answerSha256':answer['sha256']}
  if source['subjectIndex']==0 and source['year'] in [97,98]:record['practiceNote']='本年度國文含作文、公文及測驗；本站提供測驗部分 10 題、滿分 20 分。作文與公文請參閱官方原卷。'
  meta.append(record)
  answer_keys[exam_id]={'source':answer['url'],'answers':[q['accepted'][0] if key=='#' else key for q,key in zip(qs,candidate['corrected'])]}
 Path('data/common-bank-meta.json').write_text(json.dumps({'exams':meta},ensure_ascii=False,indent=2)+'\n')
 answer_path.write_text(json.dumps(answer_keys,ensure_ascii=False,indent=2)+'\n')
 print('Wrote',len(meta),'papers,',sum(e['count'] for e in meta),'questions')
