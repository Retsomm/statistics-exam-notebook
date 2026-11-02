"""Parse official text into review candidates; never invent missing options."""
import json
from pathlib import Path
import re
import sys
import unicodedata

def normalize(text):
    text=''.join(unicodedata.normalize('NFKC', c) if '\uf900' <= c <= '\ufaff' else c for c in text)
    # Relabel embedded-font item markers consistently in stems and choices.
    return re.sub(r'[\ue000-\ue004]',lambda m:'①②③④⑤'[ord(m[0])-0xe000],text).replace('\ue724','彙').replace('\ue98e','敕').replace('⳥','頠')

def clean(text):
    pages=text.split('\f')
    for index,page in enumerate(pages):
        if index:
            header=re.search(r'(?m)^\s*科\s*目[：:].*\n',page[:700])
            if header:pages[index]=page[header.end():]
    text='\f'.join(pages)
    text=re.sub(r'(?ms)^\s*二、複選題.*?(?=^\s*36\s)', '', text)
    lines=[]
    for line in normalize(text).splitlines():
        line=re.sub(r'\s*代號[：:].*$', '', line)
        if re.match(r'^\s*(?:頁次|全一張|（請接背面）|\(請接背面\))', line):
            continue
        if re.match(r'^\s*[一二]、[單複]選題',line) or re.match(r'^\s*說明：',line):
            continue
        # Older papers use embedded font glyphs for numbered questions.
        line=re.sub(r'^(\s*)([\ue0c6-\ue0f7])',lambda m:m[1]+str(ord(m[2])-0xe0c5)+' ',line)
        line=re.sub(r'(?<=回答)[\ue0c6-\ue0f7]|(?<=至)[\ue0c6-\ue0f7]',lambda m:str(ord(m[0])-0xe0c5),line)
        lines.append(line.rstrip())
    return '\n'.join(lines)

def split_context(body):
    marks=list(re.finditer(r'[\ue18c-\ue190]',body))
    if not marks:return body,''
    end_line=body.find('\n',marks[-1].end())
    if end_line<0:return body,''
    rest=body[end_line:]
    boundary=re.search(r'\n[ \t]*\n|\n(?=\s*(?:請依下文|閱讀下文|第\s*\d+\s*題至|【Questions))',rest)
    if boundary:
        cut=end_line+boundary.start()
        return body[:cut],body[cut:].strip()
    return body,''

def context_range(text,start,total):
    numbered=re.sub(r'[\ue0c6-\ue0f7]',lambda m:str(ord(m[0])-0xe0c5),text)
    m=re.search(r'(?:第\s*)?(\d{1,2})\s*題?\s*(?:至|[～~-])\s*(?:第\s*)?(\d{1,2})\s*題?',numbered)
    return (int(m[1]),int(m[2])) if m else (start,total)

def answers(text):
    return [key for line in unicodedata.normalize('NFKC',text).splitlines() if re.match(r'^\s*答案(?:\s|$)',line) for key in re.findall(r'[A-E]+|#',line)]

def parse_options(body):
    result={};stem=[];columns=[]
    for line in body.splitlines():
        marks=list(re.finditer(r'[\ue18c-\ue190]',line))
        if marks:
            columns=[(m.start(),chr(ord('A')+ord(m.group())-0xe18c)) for m in marks]
            if line[:marks[0].start()].strip():
                raise ValueError('text before option marker: '+line)
            for i,m in enumerate(marks):
                letter=columns[i][1]
                if letter in result:
                    raise ValueError('duplicate option '+letter)
                result[letter]=[line[m.end():marks[i+1].start() if i+1<len(marks) else len(line)].strip()]
        elif columns:
            for i,(start,letter) in enumerate(columns):
                part=line[0 if i==0 else start:columns[i+1][0] if i+1<len(columns) else len(line)].strip()
                if part:result[letter].append(part)
        else:
            stem.append(line)
    return '\n'.join(stem).strip(),[{'letter':letter,'text':'\n'.join(parts).strip()} for letter,parts in result.items()]

def parse(source):
    files=source['files'];raw=clean(files['Q']['text']);keys=answers(files.get('S',files.get('M'))['text'])
    corrected=answers(files['M']['text']) if 'M' in files else keys
    if len(keys)!=len(corrected):raise ValueError('answer count mismatch')
    matches=[];expected=1
    for m in re.finditer(r'(?m)^\s*(\d{1,2})[ \t]+(?=\S)',raw):
        if int(m[1])==expected:
            matches.append(m);expected+=1
    if len(matches)!=len(keys):raise ValueError(f'question markers {len(matches)} != answers {len(keys)}')
    exam_id=f"{source['year']:03}-{source['subjectIndex']}";out=[];contexts=[]
    preamble=raw[:matches[0].start()]
    if re.search(r'依上文回答',preamble):
        passage=preamble[preamble.rfind('禁止使用電子計算器。')+len('禁止使用電子計算器。'):].strip()
        contexts.append((*context_range(passage,1,len(keys)),passage))
    for i,m in enumerate(matches):
        body=raw[m.end():matches[i+1].start() if i+1<len(matches) else len(raw)].strip('\n')
        special={(97,1,40):'What is your favorite color?',(97,1,45):'The Old Man and the Sea is a novel',(98,1,40):'The original Monopoly,',(98,1,45):'Dear Agnes:'}
        boundary=special.get((source['year'],source['subjectIndex'],i+1))
        manual_context=''
        if boundary:
            cut=body.find(boundary)
            if cut<0:raise ValueError(f'missing context boundary: {boundary}')
            manual_context=body[cut:];body=body[:cut]
        body,context=split_context(body)
        context=manual_context or context
        if source['year']==103 and source['subjectIndex']==1 and i==34:
            context=''
        if context:contexts.append((*context_range(context,i+2,len(keys)),context))
        stem,options=parse_options(body)
        if source['year']==100 and source['subjectIndex']==1 and i==31:
            stem=re.sub(r'機會成本比較表[\s\S]*$','機會成本比較表\n產品  曉明  筱梅\n衣服  0.5 雙襪子  2 雙襪子\n襪子  2 件衣服  0.5 件衣服',stem)
        if source['year']==98 and source['subjectIndex']==1 and i==31:
            stem=re.sub(r'\n\s*春嬌[\s\S]*$','\n飲品（杯／小時）  春嬌  志明\n珍珠奶茶  60  30\n檸檬蘆薈  20  15',stem)
        if source['year']==103 and source['subjectIndex']==1 and i==34:
            options=[{'letter':letter,'text':letter+'點'} for letter in 'ABCD']
        key=keys[i];multi=len(options)==5
        if ''.join(o['letter'] for o in options)!=('ABCDE' if multi else 'ABCD') or not all(o['text'] for o in options):
            raise ValueError(f'{exam_id}-{i+1}: invalid options {options}')
        page=next((index for index,value in enumerate(files['Q']['text'].split('\f')) if re.search(r'(?m)^\s*'+str(i+1)+r'\s+\S',clean(value))),0)
        out.append({'id':f'{exam_id}-{i+1}','examId':exam_id,'year':source['year'],'subject':['國文','公民與英文'][source['subjectIndex']],'subjectIndex':source['subjectIndex'],'number':i+1,'points':3 if multi else 2,'multi':multi,'images':[],'text':stem+'\n'+'\n'.join('('+o['letter']+') '+o['text'] for o in options),'page':page,'accepted':[key],'correction':None,'stem':stem,'options':options,'textFallback':False,'passage':'','hasVisual':bool(re.search(r'下表|下圖|圖示|如圖|附圖',body))})
    for j,(start,end,passage) in enumerate(contexts):
        if j+1<len(contexts):end=min(end,contexts[j+1][0]-1)
        passage=re.sub(r'【Questions[^】]+】','',passage)
        passage=re.sub(r'(?:請依下文回答|閱讀下文，回答|第\s*\d+\s*題至第\s*\d+\s*題，請依文意)[^\n]*','',passage)
        passage=re.sub(r'（請依據上述文章，回答第\s*\d+\s*[～-]\s*\d+\s*題）','',passage)
        passage=re.sub(r'請回答下列第\s*\d+\s*題至第\s*\d+\s*題','',passage).strip()
        for q in out:
            if start<=q['number']<=end:q['passage']=passage
    cloze_numbers={q['passage']:[x['number'] for x in out if x['passage']==q['passage'] and not x['stem']] for q in out if q['passage']}
    for i,q in enumerate(out):
        if source['subjectIndex']==1 and q['number']>=36:
            q['englishFormat']='cloze' if not q['stem'] else ('reading' if q['passage'] else 'standalone')
            if q['englishFormat']=='cloze':q['clozeNumbers']=cloze_numbers[q['passage']]
            if q['englishFormat']=='standalone':
                q['stem']=re.sub(r'(?m)^(\s*\w+:)[ \t]*$',r'\1 _____',q['stem'])
                if q['id']=='103-1-39':q['stem']='_____ '+q['stem']
        if not q['stem']:q['stem']=f"請選出文中第 {q['number']} 空格最合適的答案。"
        if i and re.match('承上',q['stem']) and not q['passage']:
            q['passage']=out[i-1]['passage'] or out[i-1]['stem']
    return out,raw[:matches[0].start()],corrected

if __name__=='__main__':
    output=Path('/tmp/common-candidates');output.mkdir(exist_ok=True)
    for path in sorted(Path(sys.argv[1]).glob('*.json')):
        source=json.loads(path.read_text())
        try:
            questions,preamble,corrected=parse(source)
            (output/path.name).write_text(json.dumps({'questions':questions,'preamble':preamble,'corrected':corrected},ensure_ascii=False,indent=2)+'\n')
            print(path.stem,'OK',len(questions))
        except Exception as error:
            print(path.stem,'ERROR',error)
