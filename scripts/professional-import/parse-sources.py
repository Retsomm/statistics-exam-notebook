"""Create text candidates for review. Does not publish candidates or explanations."""
import json
from pathlib import Path
import re
import sys
import textwrap
import unicodedata

SYMBOLS = dict(zip('\uf03d\uf02d\uf02b\uf0b1\uf03c\uf03e\uf0a3\uf0b3\uf0b9\uf0b4\uf0b8\uf0c8\uf0c7\uf0e5\uf070\uf06d\uf073\uf061\uf062\uf063\uf071\uf06c\uf0a5\uf0ce\uf0ae\uf0b0', '=−+±<>≤≥≠×÷∪∩Σπμσαβχθλ∞∈→°'))
CORRECTIONS = {'097-2s': {30: ['A', 'D', 'AD']}, '098-3d': {6: ['A', 'B', 'C', 'D']}, '099-2s': {38: ['B', 'C']}, '099-3d': {47: ['A', 'B']}, '101-2s': {7: ['C']}, '101-3d': {33: ['A', 'B', 'AB']}, '105-3d': {34: 'all'}}

def normalize(text):
    text = ''.join(unicodedata.normalize('NFKC', c) if '\uf900' <= c <= '\ufaff' else SYMBOLS.get(c, c) for c in text)
    text = re.sub(r'(?m)^([ \t]*)([\ue0c6-\ue0f7])', lambda m: m[1] + str(ord(m[2])-0xe0c5) + ' ', text)
    return text

def clean(text):
    text = re.sub(r'(?m)^.*(?:代號[：:]|頁次[：:]).*$', '', text)
    text = text.replace('\f', '\n')
    text = '\n'.join(line.rstrip() for line in text.splitlines())
    return re.sub(r'\n[ \t]*\n(?:[ \t]*\n)*', '\n\n', textwrap.dedent(text)).strip()

def parse(source):
    exam_id = source['id']
    files = source['files']
    answer = files.get('M', files.get('S'))
    keys = []
    for line in answer['layout'].splitlines():
        if line.strip().startswith('答案'):
            keys.extend(re.findall(r'\b[A-E]\b|[#＃]', line))
    count = 40 if source['subjectIndex'] == 2 else 50
    if len(keys) != count:
        raise ValueError(f'{exam_id}: expected {count} answers, got {len(keys)}')
    raw = normalize(files['Q']['layout'])
    positions = []
    cursor = 0
    for number in range(1, count+1):
        match = re.search(r'(?m)^[ \t]{0,11}' + str(number) + r'(?:[.、][ \t]*|[ \t]+|\n)', raw[cursor:])
        if not match:
            raise ValueError(f'{exam_id}: missing question {number}')
        start, end = cursor+match.start(), cursor+match.end()
        positions.append((start, end))
        marks = list(re.finditer('[\ue18c-\ue18f]', raw[end:]))
        if len(marks) < 4:
            raise ValueError(f'{exam_id}-{number}: missing option markers')
        cursor = end+marks[3].end()
    questions = []
    for number, (start, end) in enumerate(positions, 1):
        chunk = raw[end:positions[number][0] if number < count else len(raw)]
        if number == count:
            chunk = chunk.split('\f')[0]
        marks = []
        cursor = 0
        for letter in '\ue18c\ue18d\ue18e\ue18f':
            at = chunk.find(letter, cursor)
            if at < 0:
                raise ValueError(f'{exam_id}-{number}: missing option marker')
            marks.append(at)
            cursor = at+1
        parts = [chunk[:marks[0]], *[chunk[at+1:marks[i+1] if i<3 else len(chunk)] for i, at in enumerate(marks)]]
        parts = [part.translate(str.maketrans('\ue18c\ue18d\ue18e\ue18f', 'ABCD')) for part in parts]
        stem = clean(parts[0])
        options = [{'letter': letter, 'text': clean(text)} for letter, text in zip('ABCD', parts[1:])]
        correction = CORRECTIONS.get(exam_id, {}).get(number)
        if keys[number-1] in ['#', '＃'] and not correction:
            raise ValueError(f'{exam_id}-{number}: unresolved correction')
        accepted = correction if isinstance(correction, list) else ([keys[number-1]] if correction != 'all' else list('ABCD'))
        q = {'id': f'{exam_id}-{number}', 'examId': exam_id, 'year': source['year'], 'subject': source['subject'], 'subjectIndex': source['subjectIndex'], 'number': number, 'points': 100/count, 'multi': False, 'images': [], 'text': stem+'\n'+'\n'.join('('+o['letter']+') '+o['text'] for o in options), 'page': raw[:end].count('\f'), 'accepted': accepted, 'correction': ('依考選部更正公告，本題一律給分。' if correction == 'all' else '依考選部更正公告，接受答案：'+'、'.join(accepted)+'。') if correction else None, 'stem': stem, 'options': options, 'textFallback': False, 'passage': '', 'hasVisual': bool(re.search(r'下表|下圖|圖示|如圖|附圖|莖葉圖|ANOVA|變異數分析表', chunk))}
        if correction == 'all':
            q['allCredit'] = True
        questions.append(q)
    return {'source': {k: source[k] for k in ['id', 'year', 'subject', 'subjectIndex', 'listing']}, 'files': {k: {x: v[x] for x in ['url', 'sha256']} for k, v in files.items()}, 'questions': questions, 'officialKeys': keys}

if __name__ == '__main__':
    source_dir, target = map(Path, sys.argv[1:3])
    target.mkdir(parents=True, exist_ok=True)
    errors = []
    for path in sorted(source_dir.glob('*.json')):
        try:
            candidate = parse(json.loads(path.read_text()))
            (target / path.name).write_text(json.dumps(candidate, ensure_ascii=False, indent=2)+'\n')
            print(path.stem, len(candidate['questions']))
        except Exception as error:
            errors.append(str(error))
    if errors:
        raise ValueError('\n'.join(errors))
