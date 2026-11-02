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
from urllib.parse import parse_qs, urljoin, urlparse

from bs4 import BeautifulSoup, NavigableString, Tag
import requests

ROOT = 'https://wwwq.moex.gov.tw/exam/'
YEARS = [112, *range(105, 96, -1)]
OUTPUT = Path('data/import-review/common-sources')


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
    found = []
    for element in soup.descendants:
        if isinstance(element, NavigableString):
            label = str(element).strip()
            if re.search(r'初等考試[_＿].+', label):
                category = label
        elif isinstance(element, Tag) and element.name == 'a':
            raw = html.unescape(element.get('href', ''))
            match = re.search(r'(?:https?://[^\s\'"<>]+/)?wHandExamQandA_File\.ashx\?[^\s\'"<>)]+', raw, re.I)
            if match:
                url = urljoin(ROOT, match.group())
                query = {key.lower(): value[0] for key, value in parse_qs(urlparse(url).query).items()}
                if '統計' in category and query.get('s') in ['0101', '0102']:
                    found.append({'category': category, 'url': url, 'subjectIndex': 0 if query['s'] == '0101' else 1, 'type': query.get('t', '').upper()})
    return found


def fetch_year(year):
    listing = ROOT + f'wFrmExamQandASearch.aspx?e={year}010&y={year + 1911}'
    links = paper_links(get(listing))
    if not links:
        raise ValueError(f'{year}: could not locate statistics common-subject links')
    result = []
    with tempfile.TemporaryDirectory() as temp:
        for subject in [0, 1]:
            sources = {link['type']: link['url'] for link in links if link['subjectIndex'] == subject}
            if not {'Q', 'S'}.issubset(sources):
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
            result.append({'id': f'{year}-{subject}', 'year': year, 'subjectIndex': subject, 'listing': listing, 'files': files})
    for entry in result:
        (OUTPUT / f"{entry['id']}.json").write_text(json.dumps(entry, ensure_ascii=False, indent=2) + '\n')
    print(f'{year}: fetched two papers and official answers', flush=True)


if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(fetch_year, YEARS))
