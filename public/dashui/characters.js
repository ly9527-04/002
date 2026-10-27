(function(){
 'use strict';
 const C=window.CharacterClient;if(!C)return;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn,cls)=>{const n=el('button',cls===undefined?'ds-button':cls,text);n.type='button';n.addEventListener('click',fn);return n;};
 const login=()=>{const a=el('a','ds-button','登录后参与');a.href='/user/login.html?originUrl='+encodeURIComponent(location.pathname+location.search);return a;};
 const notice=(target,text)=>target.append(el('p','cc-notice',text));
 const labels={profile:'人物特点',event:'人物经历',belief:'人物想法',alias:'其他称呼'};

 class CastPage {
  constructor(root){
   this.root=root;this.book=root.dataset.bookId||document.getElementById('bookId')?.value;
   this.openedChapter=root.dataset.chapterId||document.getElementById('preContentId')?.value||null;this.chapterId=new URLSearchParams(location.search).get('chapterId')||null;this.full=false;this.person='';this.pane=new URLSearchParams(location.search).get('pane')==='posts'?'posts':'about';
   this.generation=0;this.busy=false;this.sessions=new Map();this.controller=null;this.pending=null;
   this.build();this.load();
  }
  build(){
   this.root.replaceChildren();this.root.classList.add('cc-page');
   const head=el('div','cc-heading'),titles=el('div');titles.append(el('h1','','书中人'),el('p','','认识故事里的人，也听听他们的回答。'));
   const back=el('a','cc-back','返回作品');back.href='/book/'+encodeURIComponent(this.book)+'.html';head.append(titles,back);
   this.toolbar=el('div','cc-toolbar');this.layout=el('div','cc-layout');
   this.sidebar=el('aside','cc-sidebar');this.main=el('section','cc-main');this.main.setAttribute('aria-label','角色详情');
   this.status=el('p','cc-status');this.status.setAttribute('role','status');
   this.layout.append(this.sidebar,this.main);this.root.append(head,this.toolbar,this.status,this.layout);
  }
  base(){return '/api/characters/books/'+encodeURIComponent(this.book);}
  context(extra){return Object.assign({chapterId:this.chapterId,full:this.full,personId:this.person},extra||{});}
  query(extra){return C.query(this.context(extra));}
  async load(){
   const generation=++this.generation;this.status.textContent='正在整理当前章节可见的人物…';this.main.setAttribute('aria-busy','true');
   try{
    const data=await C.api(this.base()+'/cast?'+C.query({chapterId:this.chapterId,full:this.full}));
    if(generation!==this.generation)return;
    if(!data.signedIn&&!this.chapterId&&!this.full){let completed;try{completed=localStorage.getItem(C.completionKey(this.book));}catch(e){}if(completed&&data.chapters.some(c=>c.id===completed)){this.chapterId=completed;this.load();return;}}
    this.data=data;this.status.textContent=data.stale?'章节已更新，人物设定复核期间暂不开放新对话。':'';
    if(data.pendingChapters&&!data.stale)this.status.textContent='新章节的人物资料整理中，当前可查看至第 '+data.reviewedThrough+' 章。';
    this.renderToolbar();this.renderPeople();
    const wanted=new URLSearchParams(location.search).get('personId');
    if(!this.person&&wanted&&data.cast.people.some(p=>p.id===wanted))this.person=wanted;
    if(this.person&&!data.cast.people.some(p=>p.id===this.person))this.person='';
    this.renderPeople();this.renderMain();
    if(!data.version)notice(this.main,'人物资料正在整理。你可以先到“本书讨论”聊聊阅读感受。');
   }catch(e){if(generation!==this.generation)return;this.status.textContent='';this.main.replaceChildren(el('p','cc-notice',e.message),button('重新加载',()=>this.load()));}
   finally{if(generation===this.generation)this.main.removeAttribute('aria-busy');}
  }
  renderToolbar(){
   this.toolbar.replaceChildren();const label=el('label','','剧情范围'),select=el('select');select.setAttribute('aria-label','人物资料显示进度');
   const auto=el('option','','跟随已读完章节');auto.value='';select.append(auto);const before=el('option','','尚未读完第一章');before.value='0';select.append(before);
   this.data.chapters.forEach(c=>{const n=el('option','','第 '+c.position+' 章');n.value=c.id;select.append(n);});
   select.value=this.chapterId||'';select.disabled=this.full||this.busy;
   select.addEventListener('change',()=>{
    const next=select.value||null,position=this.data.chapters.find(c=>c.id===next)?.position||0;
    if(position>this.data.chapter&&!window.confirm('将显示至第 '+position+' 章的人物资料，可能包含尚未读完的剧情。继续吗？')){select.value=this.chapterId||'';return;}
    this.chapterId=next;this.load();
   });label.append(select);
   const mode=el('label'),check=el('input');check.type='checkbox';check.checked=this.full;check.disabled=this.busy;
   check.addEventListener('change',()=>{if(check.checked&&!window.confirm('全书模式会显示已经审核的后续人物与关系，可能剧透。确认开启吗？')){check.checked=false;return;}this.full=check.checked;this.load();});mode.append(check,document.createTextNode('全书模式（可能剧透）'));
   const correct=button('修正已读完进度',async()=>{
    const id=this.chapterId||this.data.chapters.find(c=>c.position===this.data.completed)?.id||'0',position=id==='0'?0:this.data.chapters.find(c=>c.id===id)?.position;
    if(!window.confirm('将已读完进度设为第 '+position+' 章，之后默认按此显示人物资料。确认吗？'))return;
    try{if(this.data.signedIn)await C.api(this.base()+'/progress',{method:'POST',body:{chapterId:id}});try{localStorage.setItem(C.completionKey(this.book),id);}catch(e){}this.chapterId=this.data.signedIn?null:id;this.load();}catch(e){this.status.textContent=e.message;}
   },'cc-text-button');correct.disabled=this.full||this.busy;
   this.toolbar.append(label,mode,el('span','ds-muted',this.full?'截至已审核第 '+this.data.chapter+' 章':'剧情截至第 '+this.data.chapter+' 章'),correct);
  }
  renderPeople(){
   this.sidebar.replaceChildren(el('h2','','这本书的人物'));const list=el('div','cc-person-list');
   const book=button('本书讨论',()=>this.choose('','posts'),'cc-book-pool');book.setAttribute('aria-pressed',String(!this.person));book.disabled=this.busy;list.append(book);
   this.data.cast.people.forEach(p=>{
    const n=button('',()=>this.choose(p.id,'about'),'cc-person');n.setAttribute('aria-pressed',String(this.person===p.id));n.disabled=this.busy;
    const text=el('span');text.append(el('strong','',p.name),el('small','','第 '+p.debut+' 章初登场'));n.append(el('span','cc-monogram',p.name.slice(0,1)),text);list.append(n);
   });this.sidebar.append(list);
   if(!this.data.cast.people.length)this.sidebar.append(el('p','cc-subtitle',this.data.version?'当前进度还没有可见人物。':'人物资料整理中。'));
   if(this.data.canEdit){const link=el('a','cc-text-button','维护人物资料');link.href='/author/characters.html?bookId='+encodeURIComponent(this.book);this.sidebar.append(link);}
  }
  choose(id,pane){if(this.busy)return;this.person=id;this.pane=pane;this.generation++;this.renderPeople();this.renderMain();}
  currentPerson(){return this.data.cast.people.find(p=>p.id===this.person);}
  renderMain(){
   this.main.replaceChildren();const person=this.currentPerson();this.root.classList.toggle('cc-chat-focus',!!person&&this.pane==='chat');
   if(!person){
    this.main.append(el('h2','','本书讨论'),el('p','cc-subtitle',this.data.book.name+' · 留言公开，私聊不会出现在这里。'));
    this.renderRecent(this.main);this.renderPosts(this.main);return;
   }
   const heading=el('div','cc-chat-heading');heading.append(el('h2','',person.name));
   if(this.pane==='chat')heading.append(button('换人物 / 调整进度',()=>this.choose(person.id,'about'),'cc-text-button'));
   this.main.append(heading,el('p','cc-subtitle','人物资料显示至第 '+this.data.chapter+' 章'));
   const tabs=el('div','cc-tabs');tabs.setAttribute('role','tablist');
   [['about','档案与关系'],['chat','和角色聊聊'],['posts','大家留言']].forEach(([id,text])=>{
    const n=button(text,()=>{if(!this.busy){this.pane=id;this.generation++;this.renderMain();}},'');n.setAttribute('role','tab');n.setAttribute('aria-selected',String(this.pane===id));n.disabled=this.busy;tabs.append(n);
   });this.main.append(tabs);const body=el('div');this.main.append(body);
   if(this.pane==='chat')this.renderChat(body,person);else if(this.pane==='posts')this.renderPosts(body);else this.renderAbout(body,person);
  }
  renderAbout(body,person){
   if(!person.facts.length)notice(body,'这位人物的详细档案还在补充。');
   person.facts.forEach(f=>{const row=el('div','cc-fact');row.append(el('p','',f.text),el('small','',(labels[f.type]||'人物资料')+' · 依据第 '+f.sources.join('、')+' 章'));body.append(row);});
   const actions=el('div','cc-actions');actions.append(button('和角色聊聊',()=>this.choose(person.id,'chat'),'ds-button cc-primary'),button('看看大家留言',()=>this.choose(person.id,'posts')));body.append(actions,el('h3','','人物关系'));
   const people=new Map(this.data.cast.people.map(p=>[p.id,p]));const relations=this.data.cast.relations.filter(r=>r.from===person.id||r.to===person.id);
   if(!relations.length){body.append(el('p','cc-subtitle','当前进度暂无已确认的人物关系。'));return;}
   const details=el('details');details.append(el('summary','cc-text-button','查看简洁关系图'));details.append(this.graph(person,relations,people));body.append(details);
   relations.forEach(r=>{const row=el('div','cc-relation');row.append(el('strong','',people.get(r.from).name+' → '+people.get(r.to).name+' · '+r.label),el('p','',r.detail),el('small','cc-source','依据第 '+r.sources.join('、')+' 章'));body.append(row);});
  }
  graph(person,relations,people){
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),others=[...new Set(relations.flatMap(r=>[r.from,r.to]))].filter(id=>id!==person.id).slice(0,10);
   const height=Math.max(170,others.length*70+20);svg.setAttribute('viewBox','0 0 650 '+height);svg.setAttribute('role','img');svg.setAttribute('aria-label',person.name+'的人物关系图，完整关系见下方列表');svg.classList.add('cc-map');
   const node=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;svg.append(n);return n;};
   const y=height/2;others.forEach((id,i)=>{const yy=i*70+45;node('line',{x1:190,y1:y,x2:450,y2:yy});node('rect',{x:450,y:yy-20,width:150,height:40,rx:5});node('text',{x:525,y:yy+5,'text-anchor':'middle'},people.get(id).name);const relation=relations.find(r=>r.from===id||r.to===id);node('text',{x:310,y:(y+yy)/2-6,'text-anchor':'middle',class:'cc-map-label'},(relation.from===person.id?'→ ':'← ')+relation.label);});
   node('rect',{x:30,y:y-24,width:160,height:48,rx:5});node('text',{x:110,y:y+5,'text-anchor':'middle'},person.name);return svg;
  }
  async renderChat(body,person){
   body.classList.add('cc-chat-body');const gen=this.generation,key=[this.book,person.id,this.full,this.data.chapter,this.data.version].join(':');
   body.append(el('p','cc-subtitle','AI 角色对话 · 仅自己可见 · 时间点固定为第 '+this.data.chapter+' 章'));
   if(!this.data.signedIn){notice(body,'登录后开始自己的角色对话，聊天记录不会进入公共留言区。');body.append(login());return;}
   if(this.data.stale){notice(body,'人物资料正在复核，请先阅读或到留言区讨论。');return;}
   if(!this.full&&this.chapterId&&this.data.chapters.some(c=>c.id===this.chapterId&&c.position>this.data.chapter)){
    notice(body,'所选章节的人物资料还在整理。可以先使用第 '+this.data.chapter+' 章的已审核设定。');
    body.append(button('使用第 '+this.data.chapter+' 章的角色设定',()=>{this.chapterId=this.data.chapters.find(c=>c.position===this.data.chapter)?.id||'0';this.load();}));return;
   }
   if(person.chatEnabled===false){notice(body,'这位人物的聊天设定还在校对，先看看档案或参与留言吧。');return;}
   const historyBox=el('details','cc-stage-history');historyBox.append(el('summary','','以前的对话（按剧情阶段）'));const stages=el('div');historyBox.append(stages);body.append(historyBox);
   C.api(this.base()+'/timeline?'+this.query()).then(values=>{
    if(gen!==this.generation)return;if(!values.length)stages.append(el('p','cc-subtitle','还没有以前的对话。'));
    values.forEach(item=>stages.append(button('第 '+item.chapter+' 章 · 设定 v'+item.version,async()=>{
     try{const turns=await C.api('/api/characters/sessions/'+item.id+'/history?'+C.query({chapterId:this.chapterId,full:this.full}));if(gen!==this.generation)return;let prior=historyBox.querySelector('.cc-prior-chat');if(!prior){prior=el('div','cc-prior-chat');historyBox.append(prior);}prior.replaceChildren(el('p','cc-subtitle','只读历史 · 不会自动带入当前对话'));turns.forEach(t=>{this.message(prior,'user',t.question,'你');if(t.answer)this.message(prior,'assistant',t.answer,person.name);});}catch(e){stages.append(el('p','cc-error',e.message));}
    },'cc-text-button')));
   }).catch(e=>{stages.textContent=e.message;});
   const log=el('div','cc-chat-log');log.setAttribute('aria-label','聊天记录');body.append(log);
   const state=el('p','cc-status');state.setAttribute('role','status');body.append(state);
   let session;
   try{
    session=this.sessions.get(key)||await C.api(this.base()+'/sessions',{method:'POST',body:this.context()});this.sessions.set(key,session);
    const history=await C.api('/api/characters/sessions/'+session.id+'/messages?'+C.query({chapterId:this.chapterId,full:this.full}));if(gen!==this.generation)return;
    history.forEach(t=>{this.message(log,'user',t.question,'你');if(t.answer){const reply=this.message(log,'assistant',t.answer,person.name);this.feedbackTools(reply,session.id,t.requestId);}else{const n=this.message(log,'assistant',t.status==='pending'?'上一条消息仍在回复，可稍后重新打开。':'这条消息未完成。',person.name);if(t.status!=='pending')n.append(button('重试这条消息',()=>send(t.question,t.requestId),'cc-text-button'));}});
    if(!history.length)log.append(el('p','cc-empty','从一句问候开始，也可以问问角色眼前的故事。'));
   }catch(e){state.textContent=e.message;return;}
   const form=el('form','cc-compose'),label=el('label','','你想对角色说什么？'),input=el('textarea');input.rows=2;input.maxLength=2000;input.setAttribute('aria-label','发给角色的话');label.append(input);
   const allowance=el('p','cc-subtitle');const refreshAllowance=()=>C.api('/api/characters/allowance').then(v=>{allowance.textContent='今日还可尝试 '+v.remaining+' 次 · 北京时间次日 00:00 恢复';}).catch(()=>{});body.append(allowance);refreshAllowance();
   const bar=el('div','cc-compose-bar'),sendButton=button('发送',()=>{} ,'ds-button cc-primary');sendButton.type='submit';
   const stop=button('停止等待',()=>this.stop());stop.hidden=true;const clear=button('清除本阶段聊天',()=>{
    if(clear.dataset.confirm!=='yes'){clear.dataset.confirm='yes';clear.textContent='确认清除聊天';return;}
    C.api('/api/characters/sessions/'+session.id,{method:'DELETE'}).then(()=>{this.sessions.delete(key);this.generation++;this.renderMain();}).catch(e=>{state.textContent=e.message;});
   },'cc-text-button');bar.append(clear,stop,sendButton);form.append(label,bar);body.append(form);
   if(!this.data.modelReady){notice(body,'角色聊天暂未开放，历史记录仍可查看；你可以先看档案或参与留言。');sendButton.disabled=true;input.disabled=true;}
   const page=this;
   async function send(text,requestId){
    if(page.busy||!text.trim())return;
    requestId=requestId||crypto.randomUUID();page.busy=true;page.controller=new AbortController();page.pending={session:session.id,requestId:requestId};
    sendButton.disabled=true;stop.hidden=false;clear.disabled=true;input.disabled=true;page.lock();state.textContent='角色正在回应，回复检查完成后显示…';
    let answer=null;
    try{
     await C.send('/api/characters/sessions/'+session.id+'/messages',{text:text,requestId:requestId},(type,value)=>{if(type==='answer')answer=value;},page.controller.signal);
     if(!answer)throw new Error('没有收到完整回复，请重试。');input.value='';
     const history=await C.api('/api/characters/sessions/'+session.id+'/messages?'+C.query({chapterId:page.chapterId,full:page.full}));log.replaceChildren();history.forEach(t=>{page.message(log,'user',t.question,'你');if(t.answer){const reply=page.message(log,'assistant',t.answer,person.name);page.feedbackTools(reply,session.id,t.requestId);}});state.textContent=answer.status==='guarded'?'回复已按当前剧情范围调整。':'';
    }catch(e){
     state.replaceChildren(el('span','',e.name==='AbortError'?'已停止等待。':e.message));
     if(e.name!=='AbortError')state.append(button('重试这条消息',()=>send(text,requestId),'cc-text-button'));
    }finally{page.busy=false;page.pending=null;page.controller=null;input.disabled=false;sendButton.disabled=!page.data.modelReady;clear.disabled=false;stop.hidden=true;page.lock();log.scrollTop=log.scrollHeight;refreshAllowance();}
   }
   form.addEventListener('submit',e=>{e.preventDefault();send(input.value);});log.scrollTop=log.scrollHeight;
  }
  feedbackTools(reply,session,request){
   const details=el('details','cc-feedback'),summary=el('summary','','反馈这条回复'),state=el('span');state.setAttribute('role','status');details.append(summary);
   [['voice','不像角色'],['plot','剧情有误'],['spoiler','涉及剧透']].forEach(([category,label])=>details.append(button(label,async()=>{
    try{await C.api('/api/characters/sessions/'+session+'/feedback',{method:'POST',body:{requestId:request,category:category}});state.textContent='已反馈，编辑会核对。';}catch(e){state.textContent=e.message;}
   },'cc-text-button')));details.append(el('small','','仅提交反馈类型，私聊正文不会发送到编辑端。'),state);reply.append(details);
  }
  async renderRecent(body){
   const section=el('details','cc-recent');section.append(el('summary','','本书最近讨论 · 含已出场人物留言'));const list=el('div');section.append(list);body.append(section);let page=1;const gen=this.generation;
   const load=async()=>{try{const rows=await C.api(this.base()+'/recent?'+this.query({page:page}));if(gen!==this.generation)return;list.replaceChildren();if(!rows.length)list.append(el('p','cc-subtitle','当前进度还没有可见的最近讨论。'));rows.forEach(p=>{
    const post=el('article','cc-post'),link=el('a','cc-text-button',p.poolName+' · '+p.authorName);link.href='/book/characters-'+encodeURIComponent(this.book)+'.html?'+C.query({personId:p.personId,pane:'posts',chapterId:this.data.chapters.find(c=>c.position===this.data.chapter)?.id||'0'});link.addEventListener('click',event=>{event.preventDefault();this.focusPost=p.id;this.choose(p.personId,'posts');});post.append(link,el('p','cc-post-content',p.content));list.append(post);
   });const nav=el('div','cc-pagination'),prev=button('上一页讨论',()=>{page--;load();}),next=button('下一页讨论',()=>{page++;load();});prev.disabled=page===1;next.disabled=rows.length<20;nav.append(prev,el('span','','第 '+page+' 页'),next);list.append(nav);}catch(e){list.textContent=e.message;}};section.addEventListener('toggle',()=>{if(section.open&&!list.childNodes.length)load();});
  }
  message(log,role,text,name){const n=el('div','cc-message');n.dataset.role=role;n.append(el('small','',name),document.createTextNode(text));log.append(n);return n;}
  lock(){this.toolbar.querySelectorAll('input,select').forEach(n=>n.disabled=this.busy||(n.tagName==='SELECT'&&this.full));this.sidebar.querySelectorAll('button').forEach(n=>n.disabled=this.busy);this.main.querySelectorAll('[role=tab]').forEach(n=>n.disabled=this.busy);}
  stop(){
   if(this.pending)C.api('/api/characters/sessions/'+this.pending.session+'/stop',{method:'POST',body:{requestId:this.pending.requestId}}).catch(()=>{});
   if(this.controller)this.controller.abort();
  }
  async renderPosts(body){
   const gen=this.generation;let page=1,parent=null,minimum=0;const focus=this.focusPost;this.focusPost=null;const feed=el('div'),status=el('p','cc-status');status.setAttribute('role','status');
   const top=el('div','cc-compose-bar'),title=el('p','cc-subtitle','这是公共留言界面的本地示例，当前内容仅在本浏览器保存。涉及后续剧情时，请标注章节。'),sort=el('select');sort.setAttribute('aria-label','留言排序');
   [['latest','最新留言'],['popular','最多点赞']].forEach(([value,text])=>{const n=el('option','',text);n.value=value;sort.append(n);});top.append(title,sort);body.append(top,feed,status);
   const load=async()=>{
    feed.replaceChildren(el('p','cc-empty','正在加载留言…'));
    try{
     const posts=await C.api(this.base()+'/posts?'+this.query({page:page,sort:sort.value}));if(gen!==this.generation)return;feed.replaceChildren();
     if(!posts.length)feed.append(el('p','cc-empty',page===1?'还没有公开留言，写下你的第一条阅读感受。':'这一页还没有留言。'));
     if(focus){const original=await C.api(this.base()+'/posts/'+encodeURIComponent(focus)+'?'+this.query({reveal:true}));if(gen!==this.generation)return;
      const focused=el('section','cc-focused-post');focused.append(el('h3','','选中的讨论'),renderPost(original));feed.append(focused);
     }
     posts.filter(p=>p.id!==focus).forEach(p=>feed.append(renderPost(p)));
     const nav=el('div','cc-pagination'),prev=button('上一页',()=>{page--;load();}),next=button('下一页',()=>{page++;load();});prev.disabled=page===1;next.disabled=posts.length<20;nav.append(prev,el('span','','第 '+page+' 页'),next);feed.append(nav);
    }catch(e){feed.replaceChildren(el('p','cc-error',e.message),button('重新加载',load));}
   };
   const renderPost=p=>{
    const row=el('article','cc-post');
    if(p.hidden){row.append(el('p','cc-subtitle','这条留言涉及第 '+p.spoiler+' 章之后的讨论。'),button('查看剧透留言',async()=>{
     try{const value=await C.api(this.base()+'/posts/'+p.id+'?'+this.query({reveal:true}));row.replaceWith(renderPost(value));}catch(e){status.textContent=e.message;}
    }));return row;}
    const head=el('div','cc-post-head');head.append(el('strong','',p.authorName),el('span','',p.status==='pending'?'审核中 · 仅自己可见':(p.createdAt||'').slice(0,16)),el('span','',p.spoiler?'涉及第 '+p.spoiler+' 章':'无剧透'));row.append(head,el('p','cc-post-content',p.content));
    const tools=el('div','cc-post-tools'),liked=button((p.liked?'取消点赞':'点赞')+' '+p.likes,async()=>{
     try{const data=await C.api(this.base()+'/posts/'+p.id+'/like?'+this.query(),{method:'POST',body:{liked:!p.liked}});p.liked=!p.liked;p.likes=data.likes;liked.textContent=(p.liked?'取消点赞':'点赞')+' '+p.likes;}catch(e){status.textContent=e.message;}
    },'cc-text-button');
    if(p.status==='approved')tools.append(liked,button('回复',()=>{parent=p.parentId||p.id;minimum=p.spoiler||0;target.textContent='正在回复 '+p.authorName+' · '+(minimum?'至少标记第 '+minimum+' 章':'公开回复');spoiler.value=String(Math.max(minimum,this.data.chapter));input.focus();},'cc-text-button'));
    if(!p.parentId&&p.status==='approved')tools.append(button('查看回复 '+p.replies,async()=>{
     const replies=el('div','cc-replies');row.querySelector('.cc-replies')?.remove();row.append(replies);
     const loadReplies=async page=>{replies.replaceChildren(el('p','cc-subtitle','正在加载回复…'));
      try{const values=await C.api(this.base()+'/posts?'+this.query({parentId:p.id,reveal:true,page:page}));replies.replaceChildren();if(!values.length)replies.append(el('p','cc-subtitle','这一页还没有公开回复。'));values.forEach(v=>replies.append(renderPost(v)));
       const nav=el('div','cc-pagination'),prev=button('上一页回复',()=>loadReplies(page-1)),next=button('下一页回复',()=>loadReplies(page+1));prev.disabled=page===1;next.disabled=values.length<20;nav.append(prev,el('span','','回复第 '+page+' 页'),next);replies.append(nav);
      }catch(e){replies.replaceChildren(el('p','cc-error',e.message),button('重新加载回复',()=>loadReplies(page)));}
     };loadReplies(1);
    },'cc-text-button'));
    if(p.mine)tools.append(button('删除自己的留言',async()=>{try{await C.api(this.base()+'/posts/'+p.id,{method:'DELETE'});load();}catch(e){status.textContent=e.message;}},'cc-text-button'));
    const report=el('details'),summary=el('summary','','举报'),reason=el('input');reason.placeholder='例如：未标记后续剧情';reason.maxLength=500;reason.setAttribute('aria-label','举报原因');report.append(summary,reason,button('提交举报',async()=>{try{await C.api(this.base()+'/posts/'+p.id+'/report?'+this.query(),{method:'POST',body:{reason:reason.value}});report.open=false;status.textContent='已收到举报，编辑会处理。';}catch(e){status.textContent=e.message;}},'cc-text-button'));tools.append(report);row.append(tools);return row;
   };
   const form=el('form','cc-compose'),target=el('p','cc-subtitle','发表公开留言'),input=el('textarea');input.rows=3;input.maxLength=2000;input.setAttribute('aria-label','公开留言内容');
   const label=el('label','','写下你的看法');label.append(input);const bar=el('div','cc-compose-bar'),spoilerLabel=el('label','','剧透标记'),spoiler=el('select');spoiler.setAttribute('aria-label','留言涉及章节');
   const none=el('option','','无剧透');none.value='0';spoiler.append(none);this.data.chapters.forEach(c=>{const option=el('option','','涉及第 '+c.position+' 章');option.value=c.position;spoiler.append(option);});spoiler.value=String(this.data.chapter);spoilerLabel.append(spoiler);
   const submit=button('提交留言',()=>{},'ds-button cc-primary');submit.type='submit';bar.append(spoilerLabel,submit,button('取消回复',()=>{parent=null;minimum=0;target.textContent='发表公开留言';spoiler.value=String(this.data.chapter);},'cc-text-button'));form.append(target,label,bar);
   form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;try{
    await C.api(this.base()+'/posts',{method:'POST',body:this.context({parentId:parent,content:input.value,spoiler:Math.max(minimum,Number(spoiler.value))})});
    input.value='';parent=null;minimum=0;target.textContent='发表公开留言';status.textContent='留言已提交，审核通过后公开。';page=1;load();
   }catch(error){status.textContent=error.message;}finally{submit.disabled=false;}});
   if(this.data.signedIn)body.append(form);else{notice(body,'登录后可以留言、回复或点赞。');body.append(login());}
   sort.addEventListener('change',()=>{page=1;load();});load();
  }
 }

 function start(){
  document.querySelectorAll('[data-cast]').forEach(root=>{if(!root.castPage)root.castPage=new CastPage(root);});
  if(document.getElementById('showReading')){
   if(!document.querySelector('.cc-reader-float')){const trigger=button('角色',()=>{},'ds-button cc-reader-float');trigger.dataset.openCast='';trigger.setAttribute('aria-label','打开人物与角色聊天');document.body.append(trigger);}
   const book=document.getElementById('bookId')?.value,chapter=document.getElementById('preContentId')?.value;
      if(book&&chapter&&!document.querySelector('.cc-complete-chapter')){
    const done=button('读完本章，更新人物进度',async()=>{
     done.disabled=true;try{let signedIn=false;const current=await C.api('/api/characters/books/'+encodeURIComponent(book)+'/cast');signedIn=current.signedIn;
      if(signedIn)await C.api('/api/characters/books/'+encodeURIComponent(book)+'/progress',{method:'POST',body:{chapterId:chapter}});
      try{localStorage.setItem(C.completionKey(book),chapter);}catch(e){}
      done.textContent='已读完本章 · 人物进度已更新';const page=document.querySelector('#dsCastDialog [data-cast]')?.castPage;if(page){page.chapterId=null;page.load();}
     }catch(e){done.textContent=e.message+' · 点击重试';done.disabled=false;}
    },'ds-button cc-complete-chapter');const wrap=el('div','cc-completion');wrap.append(done,el('p','cc-subtitle','打开章节不会自动解锁人物剧情；确认读完后再更新。'));
    document.getElementById('showReading').after(wrap);
   }
  }
 }
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-open-cast]');if(!trigger)return;
  let dialog=document.getElementById('dsCastDialog');
  if(!dialog){
   dialog=el('dialog','cc-dialog');dialog.id='dsCastDialog';dialog.setAttribute('aria-label','书中人');const head=el('div','cc-dialog-head'),root=el('div');
   root.dataset.cast='';root.dataset.bookId=document.getElementById('bookId')?.value||trigger.dataset.bookId;root.dataset.chapterId='';
   head.append(el('strong','','大水书阁 · 书中人'),button('返回阅读',()=>dialog.close()));dialog.append(head,root);document.body.append(dialog);
   dialog.addEventListener('close',()=>{root.castPage?.stop();document.documentElement.style.overflow=dialog.dataset.previousOverflow||'';trigger.focus();});root.castPage=new CastPage(root);
  }
  const size=()=>{dialog.style.setProperty('--cc-viewport-height',(window.visualViewport?.height||window.innerHeight)+'px');};size();if(!dialog.dataset.viewportBound){window.visualViewport?.addEventListener('resize',size);dialog.dataset.viewportBound='yes';}
  dialog.dataset.previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
