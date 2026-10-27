from pathlib import Path
from html.parser import HTMLParser
import html,json,re,hashlib
from import_novel import extract_story
ROOT=Path(__file__).parent;PUBLIC=ROOT/'public'
class ReadingText(HTMLParser):
 def __init__(self):super().__init__();self.reading=False;self.result=[]
 def handle_starttag(self,tag,attrs):
  if tag=='div' and dict(attrs).get('id')=='showReading':self.reading=True
 def handle_endtag(self,tag):
  if self.reading and tag=='div':self.reading=False
 def handle_data(self,data):
  if self.reading:self.result.append(data)
def verify():
 meta=json.loads((ROOT/'content/book.json').read_text(encoding='utf8'));seed=json.loads((PUBLIC/'preview/data.json').read_text(encoding='utf8'))
 assert meta['title']=='还是让我来吧' and meta['author']=='ad钙'
 assert len(seed['chapters']['7'])==9
 for n in range(1,10):
  source=next((ROOT/'content/novel').glob(f'{n:02}-*.md'));name,body=extract_story(source.read_text(encoding='utf8'))
  page=(PUBLIC/f'book/7/{700+n}.html').read_text(encoding='utf8');p=ReadingText();p.feed(page)
  assert re.sub(r'\s|---','',body)==re.sub(r'\s','', ''.join(p.result)),f'Chapter {n} public text differs from approved body'
  assert name in page and 'ad钙' in page
  assert '连续性记录' not in page and '下一章起接位置' not in page
  if n>1:assert f'/book/7/{699+n}.html' in page
  if n<9:assert f'/book/7/{701+n}.html' in page
 assert '/book/7/710.html' not in (PUBLIC/'book/7/709.html').read_text(encoding='utf8')
 assert seed['casts']['7']=={'people':[],'relations':[]}
 assert '还是让我来吧' in (PUBLIC/'index.html').read_text(encoding='utf8')
 forbidden=[];secret=[];links=[]
 for p in ROOT.rglob('*'):
  if not p.is_file() or any(part in {'.git','.vercel','__pycache__'} for part in p.relative_to(ROOT).parts):continue
  rel=p.relative_to(ROOT).as_posix()
  if any(word in rel.lower() for word in ['drawgame','mist-doors','旧稿归档','人物志','设定.md','chat-cli']) or p.suffix in ['.zip','.jar','.sql','.bundle'] or p.name.startswith('.env'):forbidden.append(rel)
  if p.suffix in ['.html','.js','.json','.py','.md','.css']:
   text=p.read_text(encoding='utf8',errors='replace')
   if re.search(r'(?:sk-[A-Za-z0-9_-]{20,}|sbp_[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]{0,20}PRIVATE KEY-----)',text):secret.append(rel)
   if p.is_relative_to(PUBLIC) and p.suffix=='.html':
    assert '免费界面预览' in text,rel
    for url in re.findall(r'href=[\"\'](/book/\d+/\d+\.html)',text):
     if not (PUBLIC/url.lstrip('/')).exists():links.append((rel,url))
 assert not forbidden,forbidden
 assert not secret,secret
 assert not links,links
 return {'chaptersVerified':9,'textMatches':9,'forbiddenFiles':len(forbidden),'secretMatches':len(secret),'missingChapterLinks':len(links),'paidModelCalls':False}
if __name__=='__main__':print(json.dumps(verify()))
