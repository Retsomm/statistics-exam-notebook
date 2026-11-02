"""Fetch official common-subject papers into text-only review files.

PDFs stay in a temporary directory and are never committed.
"""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import tempfile
import time
import unicodedata
from urllib.parse import parse_qs, urljoin, urlparse

from bs4 import BeautifulSoup, NavigableString, Tag
import requests

ROOT = 'https://wwwq.moex.gov.tw/exam/'
YEARS = [112, *range(105, 96, -1)]
EXAM_CODES = {101: '101020', 99: '099030', 98: '098030', 97: '097020'}
OUTPUT = Path('data/import-review/common-sources')
CATEGORIES = {'一般行政', '社會行政', '人事行政', '原住民族行政', '勞工行政', '教育行政', '財稅行政', '金融保險', '統計', '會計', '經建行政', '地政', '圖書資訊管理', '政風', '廉政', '交通行政', '電子工程'}


def get(url):
    for attempt in range(4):
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            return response.content
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(attempt + 1)


def paper_links(page):
    soup = BeautifulSoup(page, 'html.parser')
    category = ''
    subject = None
    found = []
    for element in soup.descendants:
        if isinstance(element, NavigableString):
            label = str(element).strip()
            if re.search(r'初等(?:考試)?[_＿].+', label) or label in CATEGORIES:
                category = label
                subject = None
            elif len(label) < 80 and re.match(r'^國\s*文', label):
                subject = 0
            elif len(label) < 80 and re.match(r'^公民[與与]英文', label):
                subject = 1
            elif len(label) < 80 and re.search(r'大意|概要', label):
                subject = None
        elif isinstance(element, Tag) and element.name == 'a':
            raw = html.unescape(element.get('href', ''))
            match = re.search(r'(?:https?://[^\s\'"<>]+/)?wHandExamQandA_File\.ashx\?[^\s\'"<>)]+', raw, re.I)
            if match:
                url = urljoin(ROOT, match.group())
                query = {key.lower(): value[0] for key, value in parse_qs(urlparse(url).query).items()}
                if '統計' in category and subject is not None:
                    found.append({'category': category, 'url': url, 'subjectIndex': subject, 'type': query.get('t', '').upper()})
    return found


def fetch_year(year):
    code = EXAM_CODES.get(year, f'{year:03}010')
    listing = ROOT + f'wFrmExamQandASearch.aspx?e={code}&y={year + 1911}'
    links = paper_links(get(listing))
    if not links:
        raise ValueError(f'{year}: could not locate statistics common-subject links')
    result = []
    with tempfile.TemporaryDirectory() as temp:
        for subject in [0, 1]:
            sources = {link['type']: link['url'] for link in links if link['subjectIndex'] == subject}
            if 'Q' not in sources or not ({'S', 'M'} & sources.keys()):
                raise ValueError(f'{year}-{subject}: incomplete question/answer source: {sources}')
            files = {}
            for kind, url in sources.items():
                content = get(url)
                if not content.startswith(b'%PDF'):
                    raise ValueError(f'{year}-{subject}-{kind}: response is not a PDF')
                path = Path(temp) / f'{subject}-{kind}.pdf'
                path.write_bytes(content)
                subprocess.run(['pdftotext', '-layout', str(path), str(path.with_suffix('.txt'))], check=True)
                files[kind] = {'url': url, 'sha256': hashlib.sha256(content).hexdigest(), 'text': path.with_suffix('.txt').read_text()}
            header = re.sub(r'\s+', '', unicodedata.normalize('NFKC', files['Q']['text'][:1500]))
            expected_subject = '國文' if subject == 0 else '公民與英文'
            if expected_subject not in header:
                raise ValueError(f'{year}-{subject}: PDF subject does not match {expected_subject}')
            result.append({'id': f'{year}-{subject}', 'year': year, 'subjectIndex': subject, 'listing': listing, 'files': files})
    for entry in result:
        (OUTPUT / f"{entry['id']}.json").write_text(json.dumps(entry, ensure_ascii=False, indent=2) + '\n')
    print(f'{year}: fetched two papers and official answers', flush=True)


if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for year, future in zip(YEARS, [pool.submit(fetch_year, year) for year in YEARS]):
            try:
                future.result()
            except Exception as error:
                failures.append(f'{year}: {error}')
    if failures:
        raise ValueError('\n'.join(failures))
