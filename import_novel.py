from pathlib import Path
import re,html,json,hashlib

CHAPTER_NAMES=['第一章','第二章','第三章','第四章','第五章','第六章','第七章','第八章','第九章','第十章']
def discover_chapters(root):
 root=Path(root)
 return [root/f'{i:02}-{name}.md' for i,name in enumerate(CHAPTER_NAMES,1) if (root/f'{i:02}-{name}.md').is_file()]

def extract_story(markdown):
 text=markdown.lstrip('\ufeff').replace('\r\n','\n').replace('\r','\n')
 header=re.match(r'^#\s+([^\n]+)\n',text)
 if not header:raise ValueError('Chapter needs a first-level title at the start')
 body=text[header.end():]
 notes=re.search(r'^#{1,6}\s+连续性记录\s*$',body,re.M)
 if notes:body=body[:notes.start()];body=re.sub(r'\n\s*---\s*$','',body)
 return header[1].strip(),body.strip()

def render_story(body):
 blocks=[]
 for paragraph in re.split(r'\n\s*\n',body.strip()):
  if paragraph.strip()=='---':blocks.append('<hr class="story-scene-break"/>')
  else:blocks.append('<p>'+html.escape(paragraph).replace('\n','<br/>')+'</p>')
 return ''.join(blocks)

def import_chapters(source,target):
 target=Path(target);target.mkdir(parents=True,exist_ok=True);chapters=[]
 for path in discover_chapters(source):
  original=path.read_bytes();title,body=extract_story(original.decode('utf8'))
  clean='# '+title+'\n\n'+body+'\n'
  (target/path.name).write_bytes(clean.encode('utf8'))
  chapters.append({'position':int(path.name[:2]),'file':path.name,'name':title,'body':body,'wordCount':len(re.sub(r'\s','',body)),'sourceSha256':hashlib.sha256(original).hexdigest(),'publicSha256':hashlib.sha256(clean.encode('utf8')).hexdigest()})
 return chapters

if __name__=='__main__':
 import argparse
 parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('target');args=parser.parse_args()
 chapters=import_chapters(args.source,args.target)
 result={'chapters':[{k:v for k,v in ch.items() if k!='body'} for ch in chapters],'missingTopLevelChapters':[name for i,name in enumerate(CHAPTER_NAMES,1) if i not in {c['position'] for c in chapters}]}
 (Path(args.target)/'import-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps(result,ensure_ascii=True))
