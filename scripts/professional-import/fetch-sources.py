"""Download official professional papers for local review, never into the repository.

Usage: python fetch-sources.py /tmp/professional-sources
Requires requests, beautifulsoup4, pymupdf and pdfplumber.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import sys
import time
import unicodedata
from urllib.parse import parse_qs, urljoin, urlparse
import pymupdf as fitz
import pdfplumber
import requests
from bs4 import BeautifulSoup

ROOT = 'https://wwwq.moex.gov.tw/exam/'
YEARS = [112, *range(105, 96, -1)]
CODES = {101: '101020', 99: '099030', 98: '098030', 97: '097020'}
SUBJECTS = {'統計學大意': (2, '2s'), '資料處理大意': (3, '3d')}

def get(url):
    for attempt in range(4):
        try:
            response = requests.get(url, timeout=45)
            response.raise_for_status()
            if 'wFrmExamQandASearch' in url and '統計'.encode() not in response.content:
                raise requests.RequestException('Official listing returned a temporary error page')
            if 'wHandExamQandA_File' in url and not response.content.startswith(b'%PDF'):
                raise requests.RequestException('Official PDF returned a temporary error page')
            return response.content
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(attempt + 1)

def fetch_year(year, output):
    code = CODES.get(year, f'{year:03}010')
    listing = ROOT + f'wFrmExamQandASearch.aspx?e={code}&y={year + 1911}'
    html = get(listing)
    (output / f'{year}-listing.html').write_bytes(html)
    soup = BeautifulSoup(html, 'html.parser')
    found = {}
    for label in soup.find_all('label'):
        subject = re.sub(r'\s+', '', label.get_text())
        if subject not in SUBJECTS:
            continue
        category = soup.find('label', attrs={'for': label.get('for', '').rsplit('_', 1)[0]})
        if not category or not re.search(r'(?:^|_|＿)統計$', category.get_text().strip()):
            continue
        links = {}
        for link in label.find_parent('tr').find_all('a', href=True):
            url = urljoin(ROOT, link['href'])
            if 'wHandExamQandA_File.ashx' not in url:
                continue
            kind = parse_qs(urlparse(url).query).get('t', [''])[0].upper()
            if kind in ['Q', 'S', 'M']:
                links[kind] = url
        if 'Q' not in links or not ({'S', 'M'} & links.keys()):
            raise ValueError(f'{year} {subject}: incomplete official sources')
        index, suffix = SUBJECTS[subject]
        exam_id = f'{year:03}-{suffix}'
        files = {}
        for kind, url in links.items():
            path = output / f'{exam_id}-{kind}.pdf'
            content = path.read_bytes() if path.exists() else get(url)
            if not content.startswith(b'%PDF'):
                raise ValueError(f'{exam_id} {kind}: not a PDF')
            path.write_bytes(content)
            with fitz.open(path) as document:
                raw = '\f'.join(page.get_text() for page in document)
            with pdfplumber.open(path) as document:
                layout = '\f'.join(page.extract_text(layout=True) or '' for page in document.pages)
            files[kind] = {'url': url, 'sha256': hashlib.sha256(content).hexdigest(), 'text': raw, 'layout': layout}
            path.with_suffix('.txt').write_text(layout)
        header = re.sub(r'\s+', '', unicodedata.normalize('NFKC', files['Q']['text'][:2500]))
        if subject not in header or str(year) not in header:
            raise ValueError(f'{exam_id}: incorrect PDF header')
        record = {'id': exam_id, 'year': year, 'subject': subject, 'subjectIndex': index, 'listing': listing, 'files': files}
        (output / f'{exam_id}.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        found[index] = exam_id
    if set(found) != {2, 3}:
        raise ValueError(f'{year}: expected both statistics-category professional subjects, got {found}')
    print(f'{year}: verified official headers and downloaded both papers, answers and any correction', flush=True)

if __name__ == '__main__':
    output = Path(sys.argv[1])
    output.mkdir(parents=True, exist_ok=True)
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for year, future in zip(YEARS, [pool.submit(fetch_year, year, output) for year in YEARS]):
            try:
                future.result()
            except Exception as error:
                failures.append(f'{year}: {error}')
    if failures:
        raise ValueError('\n'.join(failures))
