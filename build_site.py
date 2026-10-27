from pathlib import Path
import html,json,re,shutil
from import_novel import extract_story,render_story

ROOT=Path(__file__).parent;PUBLIC=ROOT/'public';TEMPLATES=ROOT/'templates'
def esc(value):return html.escape(str(value),quote=True)
meta=json.loads((ROOT/'content/book.json').read_text(encoding='utf8'))
b=int(meta['id']);title=esc(meta['title']);author=esc(meta['author'])
chapters=[]
for file in sorted((ROOT/'content/novel').glob('[0-9][0-9]-*.md')):
 name,body=extract_story(file.read_text(encoding='utf8'));position=int(file.name[:2])
 chapters.append({'id':str(b*100+position),'position':position,'name':name,'body':body,'wordCount':len(re.sub(r'\s','',body)),'stamp':'original-v1'})
assert len(chapters)==meta['chapterCount']==9
assert [c['position'] for c in chapters]==list(range(1,10))
words=sum(c['wordCount'] for c in chapters);last=chapters[-1]
book={'id':b,'bookId':b,'bookName':meta['title'],'authorName':meta['author'],'catId':1,'catName':meta['category'],'bookStatus':0,'wordCount':words,'visitCount':0,'picUrl':'/dashui/original-cover.svg','bookDesc':meta['description'],'lastIndexId':int(last['id']),'lastIndexName':last['name'],'preContentId':b*100+1,'preIndexName':chapters[0]['name'],'lastIndexUpdateTime':'2026-10-27','createTime':'2026-10-27','isVip':0}
seed=json.loads((PUBLIC/'preview/data.json').read_text(encoding='utf8'))
seed['books']=[book]+[x for x in seed['books'] if int(x['id'])!=b]
seed.setdefault('chapters',{})[str(b)]=chapters
seed.setdefault('casts',{})[str(b)]={'people':[],'relations':[]}
seed.setdefault('completedDefaults',{})[str(b)]=0
(PUBLIC/'preview/data.json').write_text(json.dumps(seed,ensure_ascii=False),encoding='utf8')
for file in (ROOT/'src').iterdir():
 if file.is_file():shutil.copyfile(file,PUBLIC/'preview'/file.name)

banner='''<div class="preview-banner"><strong>大水书阁 · 免费界面预览</strong><span>原创连载已加入 / 聊天为示例 / 无 API 费用</span><span class="preview-detail">书架、进度和留言仅保存在当前浏览器</span><label>演示身份 <select id="previewIdentity" aria-label="选择演示身份"><option value="7">读者</option><option value="8">另一位读者</option><option value="99">编辑</option><option value="guest">游客</option></select></label><a href="/book/7.html">读原创</a><a data-preview-reader href="/book/characters-1.html?chapterId=103&amp;personId=lin">样书角色体验</a><a data-preview-editor href="/author/characters.html?bookId=1">编辑预览</a></div>'''
def decorate(text):
 text=re.sub(r'<script[^>]+src="/javascript/header.js[^\"]*"[^>]*></script>','',text)
 text=text.replace('/javascript/common.js','/preview/legacy.js')
 text=text.replace('<head>','<head><script src="/preview/preview-api.js"></script><script src="/preview/runtime.js"></script><link rel="stylesheet" href="/preview/preview.css"/>',1)
 text=re.sub(r'(<body[^>]*>)',lambda m:m[0]+banner,text,count=1)
 return text
def write(path,text):
 file=PUBLIC/path;file.parent.mkdir(parents=True,exist_ok=True);file.write_text(decorate(text),encoding='utf8')
base=(TEMPLATES/'index.html').read_text(encoding='utf8')
header=re.search(r'<header class="ds-header">.*?</header>',base,re.S)[0]
footer=re.search(r'<footer.*?</footer>',base,re.S)[0]
common_head=base[:base.index('</head>')]
common_head=re.sub(r'<title>.*?</title>','<title>'+title+' - 大水书阁</title>',common_head)
tail='<script src="/javascript/jquery-1.8.0.min.js"></script><script src="/preview/legacy.js"></script>'
def page(content):return common_head+'</head><body>'+header+content+footer+tail+'</body></html>'
hero='<section class="ds-feature"><div><span class="ds-tag">原创连载 · 已更新 9 章</span><h1>'+title+'</h1><p>'+author+' 著</p><p>'+esc(meta['description'])+'</p><div class="ds-actions"><a class="ds-button primary" href="/book/7/701.html">开始阅读</a><a class="ds-button" href="/book/7.html">作品详情</a></div></div><img class="ds-feature-cover" src="/dashui/original-cover.svg" alt="'+title+'"/></section>'
home=re.sub(r'<section class="ds-feature">.*?</section>',lambda _:hero,base,count=1,flags=re.S)
card='<a class="ds-book-card" href="/book/7.html"><img alt="'+title+'" loading="lazy" src="/dashui/original-cover.svg"/><div><h3>'+title+'</h3><div class="ds-muted">'+author+' 著</div><p>原创连载，已更新九章。</p><span class="ds-tag">免费阅读 · 原创</span></div></a>'
home=home.replace('<div class="ds-book-grid">','<div class="ds-book-grid">'+card,1).replace('在故事里，遇见未曾到过的世界。','虚构样书，仅供界面体验。')
write('index.html',home)
catalog=''.join('<li><a href="/book/7/'+c['id']+'.html">'+esc(c['name'])+'</a><span class="ds-muted"> '+str(c['wordCount'])+' 字</span></li>' for c in chapters)
notice='<p class="cc-subtitle">人物资料正在整理，本书暂未开放角色聊天。阅读正文无需登录；书架和进度仅保存在当前浏览器。</p>'
copyright='<p class="ds-muted">'+esc(meta['license'])+'</p>'
detail='<main class="ds-shell" style="padding-block:32px"><section class="ds-feature"><div><span class="ds-tag">原创 · '+esc(meta['category'])+' · 连载中</span><h1>'+title+'</h1><p>'+author+' 著 · '+str(words)+' 字 · 已更新 9 章</p><p>'+esc(meta['description'])+'</p><div class="ds-actions"><a class="ds-button primary" href="/book/7/701.html">开始阅读</a><a class="ds-button" href="/book/indexList-7.html">全部目录</a><a class="ds-button" href="/book/characters-7.html">本书人物与讨论</a></div></div><img class="ds-feature-cover" src="/dashui/original-cover.svg" alt="'+title+'"/></section><section><h2>最新章节</h2><p><a href="/book/7/709.html">'+esc(last['name'])+'</a></p>'+notice+'</section><section><h2>章节目录</h2><ol class="original-catalog">'+catalog+'</ol></section>'+copyright+'</main>'
write('book/7.html',page(detail))
write('book/indexList-7.html',page('<main class="ds-shell" style="padding-block:32px"><a href="/book/7.html">返回作品</a><h1>'+title+'</h1><p>'+author+' 著 · 正文九章</p><ol class="original-catalog">'+catalog+'</ol>'+copyright+'</main>'))
reader_template=(TEMPLATES/'book/book_content.html').read_text(encoding='utf8')
for c in chapters:
 n=c['position'];text=reader_template.replace('山海来信',title).replace('迟舟',author).replace('渡口来人',esc(c['name']))
 text=text.replace('/book/1.html','/book/7.html').replace('/book/indexList-1.html','/book/indexList-7.html').replace('/book/characters-1.html','/book/characters-7.html')
 text=text.replace('id="bookId" value="1"','id="bookId" value="7"').replace('id="preContentId" value="32"','id="preContentId" value="'+c['id']+'"').replace('2186 字',str(c['wordCount'])+' 字')
 text=re.sub(r'(<div id="showReading"[^>]*>).*?(</div>)',lambda m:m[1]+render_story(c['body'])+m[2],text,count=1,flags=re.S)
 text=text.replace('/book/1/31.html','/book/7/'+str(700+n-1)+'.html').replace('/book/1/33.html','/book/7/'+str(700+n+1)+'.html')
 if n==1:text=re.sub(r'<a class="prev"[^>]*>上一章</a>','<span class="ds-muted">已是第一章</span>',text)
 if n==len(chapters):text=re.sub(r'<a class="next"[^>]*>下一章</a>','<span class="ds-muted">已到最新章 · 待续</span>',text)
 text=text.replace('书中人 · 角色聊天','书中人 · 人物整理中')
 write('book/7/'+c['id']+'.html',text)
role=(TEMPLATES/'book/characters.html').read_text(encoding='utf8').replace('data-book-id="1"','data-book-id="7"')
role=role.replace('</header>','</header><div class="ds-shell">'+notice+'</div>',1)
write('book/characters-7.html',role)
cover='''<svg xmlns="http://www.w3.org/2000/svg" width="360" height="500" viewBox="0 0 360 500"><rect width="360" height="500" fill="#263f44"/><path d="M28 0v500M35 0v500" stroke="#d9bb7c" stroke-opacity=".35"/><circle cx="260" cy="390" r="145" fill="none" stroke="#d9bb7c" stroke-opacity=".35"/><text x="190" y="146" text-anchor="middle" font-family="SimSun,serif" font-size="36" fill="#f5eedb">还是让我</text><text x="190" y="202" text-anchor="middle" font-family="SimSun,serif" font-size="36" fill="#f5eedb">来吧</text><path d="M145 245h90" stroke="#d9bb7c"/><text x="190" y="290" text-anchor="middle" font-family="sans-serif" font-size="21" fill="#d9bb7c">ad钙 著</text><text x="190" y="446" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#f5eedb">原创连载 · 大水书阁</text></svg>'''
(PUBLIC/'dashui/original-cover.svg').write_text(cover,encoding='utf8')
for p in PUBLIC.rglob('*.html'):
 text=p.read_text(encoding='utf8')
 text=re.sub(r'<div class="preview-banner">.*?</div>',lambda _:banner,text,count=1,flags=re.S)
 p.write_text(text,encoding='utf8')
print(json.dumps({'book':meta['title'],'author':meta['author'],'chapters':len(chapters),'words':words,'entry':'/book/7.html'},ensure_ascii=True))
