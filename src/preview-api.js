(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DashuiPreviewApi=factory();})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 function publicCast(cast,chapter){
  const people=cast.people.filter(p=>p.debut<=chapter).map(p=>({...copy(p),facts:p.facts.filter(f=>!['voice','prompt','example'].includes(f.type)&&f.reveal<=chapter&&(!f.until||chapter<=f.until)).map(f=>({...copy(f),knownFrom:0}))}));
  const ids=new Set(people.map(p=>p.id));return {people,relations:cast.relations.filter(r=>ids.has(r.from)&&ids.has(r.to)&&r.reveal<=chapter&&(!r.until||chapter<=r.until)).map(r=>({...copy(r),knownFrom:0}))};
 }
 function createApi(seed,storage){
  const key='dashui.preview.v1';let state;
  try{state=JSON.parse(storage.getItem(key)||'null');}catch(e){}
  if(!state||state.schema!==1)state={schema:1,user:7,completed:{},sessions:{},posts:[],versions:{},drafts:{},published:{},jobs:{},feedback:[],shelf:[],history:[],calls:0};
  state.positions=state.positions||{};
  const user=()=>state.user===null?null:Number(state.user);
  const save=()=>{try{storage.setItem(key,JSON.stringify(state));}catch(e){}};
  const uuid=()=>typeof crypto==='object'&&crypto.randomUUID?crypto.randomUUID():'demo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
  const needUser=()=>{if(user()===null)fail(401,'请选择一个演示身份后体验。');return user();};
  const needEditor=()=>{if(user()!==99)fail(404,'请先在页顶切换到编辑预览。');};
  const chapters=b=>seed.chapters?.[String(b)]?copy(seed.chapters[String(b)]):Array.from({length:10},(_,i)=>({id:String(Number(b)*100+i+1),position:i+1,name:'第 '+(i+1)+' 章 · 渡口来人',stamp:'preview'}));
  const book=b=>{if(!seed.books.some(x=>Number(x.id)===Number(b))&&(Number(b)<1||Number(b)>6))fail(404,'这里没有这本作品。');return seed.books.find(x=>Number(x.id)===Number(b))||{...seed.books[0],id:Number(b),bookName:'样书 '+b};};
  const cast=b=>state.published[b]||seed.casts?.[String(b)]||seed.cast;
  const version=b=>state.versions[b]?.published||1;
  function context(b,q){book(b);let chapter=q.get('chapterId');const full=q.get('full')==='true';
   const completed=state.completed[(user()??'guest')+':'+b]??seed.completedDefaults?.[String(b)]??3;
   chapter=chapter===null||chapter===''?completed:Number(chapter)===0?0:chapters(b).find(c=>c.id===String(chapter))?.position;
   if(chapter===undefined)fail(404,'这个章节不在样书中。');return {chapter:full?chapters(b).length:chapter,full,completed};
  }
  function owned(id){const s=state.sessions[id];if(!s||s.deleted||s.user!==needUser())fail(404,'这份演示聊天不属于当前身份。');return s;}
  function postView(p,ctx,reveal){if(p.spoiler>ctx.chapter&&!reveal)return {id:p.id,spoiler:p.spoiler,hidden:true,parentId:p.parentId};return {...copy(p),hidden:false,mine:p.userId===user(),liked:false,likes:p.likes||0,replies:state.posts.filter(x=>x.parentId===p.id&&x.status==='approved').length};}
  function allPosts(b){return [...(seed.posts||[]).filter(p=>String(p.bookId)===String(b)),...state.posts.filter(p=>String(p.bookId)===String(b))];}
  function run(method,address,body){
   const url=new URL(address,'https://preview.invalid'),path=url.pathname,q=url.searchParams;body=body||{};
   if(path==='/preview/identity'){state.user=body.user===null?null:Number(body.user);save();return {user:user()};}
   if(path==='/api/characters/allowance')return {remaining:Math.max(0,30-state.calls),limit:30,resetsAt:'次日 00:00 +08:00'};
   let m=path.match(/^\/api\/characters\/books\/(\d+)\/(cast|progress|sessions|timeline|posts|recent)(?:\/([^/]+)(?:\/(like|report))?)?$/);
   if(m){const [,b,action,id,operation]=m,ctx=context(b,q),document=cast(b),view=publicCast(document,ctx.chapter);let person=q.get('personId')||'';
    if(method==='GET'&&action==='cast')return {book:{id:Number(b),name:book(b).bookName},chapters:chapters(b),chapter:ctx.chapter,full:ctx.full,completed:ctx.completed,version:version(b),reviewedThrough:seed.casts?.[String(b)]?0:chapters(b).length,pendingChapters:seed.casts?.[String(b)]?chapters(b).length:0,stale:false,cast:view,signedIn:user()!==null,canEdit:user()===99,modelReady:true};
    if(action==='progress'){needUser();const ch=Number(body.chapterId)===0?0:chapters(b).find(x=>x.id===String(body.chapterId))?.position;if(ch===undefined)fail(404,'章节不可用。');state.completed[user()+':'+b]=ch;save();return {saved:true};}
    if(action==='sessions'){
     needUser();const use=context(b,new URLSearchParams({chapterId:body.chapterId??'',full:String(body.full===true)}));
     if(!publicCast(document,use.chapter).people.some(p=>p.id===body.personId))fail(404,'当前阶段还没有这个人物。');
     if(document.people.find(p=>p.id===body.personId).chatEnabled===false)fail(409,'这位角色正在校对，先看看档案吧。');
     let session=Object.values(state.sessions).find(s=>!s.deleted&&s.user===user()&&s.book===b&&s.person===body.personId&&s.chapter===use.chapter&&s.full===use.full&&s.version===version(b));
     if(!session){session={id:uuid(),user:user(),book:b,person:body.personId,chapter:use.chapter,full:use.full,version:version(b),turns:[]};state.sessions[session.id]=session;save();}return {id:session.id,chapter:session.chapter,full:session.full,version:session.version};
    }
    if(action==='timeline')return Object.values(state.sessions).filter(s=>!s.deleted&&s.user===needUser()&&s.book===b&&s.person===person&&s.full===ctx.full&&s.chapter<=ctx.chapter&&s.turns.length).map(s=>({id:s.id,chapter:s.chapter,version:s.version,createdAt:''}));
    if(action==='recent'){const ids=new Set(['',...view.people.map(p=>p.id)]);return allPosts(b).filter(p=>p.status==='approved'&&!p.parentId&&p.spoiler<=ctx.chapter&&ids.has(p.personId)).slice((Number(q.get('page')||1)-1)*20,Number(q.get('page')||1)*20).map(p=>({...postView(p,ctx,false),poolName:p.personId?view.people.find(x=>x.id===p.personId).name:'本书讨论'}));}
    if(action==='posts'){
     if(method==='POST'&&!id){needUser();const p={id:uuid(),bookId:Number(b),personId:body.personId||'',parentId:body.parentId||null,userId:user(),authorName:'演示读者'+user(),content:String(body.content||'').slice(0,2000),spoiler:Number(body.spoiler)||0,status:'pending',createdAt:new Date().toISOString()};if(!p.content.trim())fail(400,'先写一点内容吧。');state.posts.unshift(p);save();return {id:p.id,status:p.status};}
     if(person&&!view.people.some(p=>p.id===person))fail(404,'这个人物尚未出场。');
     if(id){let p=allPosts(b).find(x=>x.id===id&&x.personId===person);if(!p)fail(404,'留言不存在。');if(method==='DELETE'){needUser();if(p.userId!==user()&&user()!==99)fail(404,'无权删除。');if(!state.posts.includes(p))state.posts.push({...p,status:'deleted'});else p.status='deleted';save();return {removed:true};}if(operation){if(operation==='like'){p.likes=(p.likes||0)+(body.liked?1:-1);save();return {likes:Math.max(0,p.likes)};}return {reported:true};}if(p.status!=='approved'&&p.userId!==user())fail(404,'留言尚未公开。');return postView(p,ctx,q.get('reveal')==='true');}
     return allPosts(b).filter(p=>p.personId===person&&(p.status==='approved'||p.status==='pending'&&p.userId===user())&&(q.get('parentId')?p.parentId===q.get('parentId'):!p.parentId)).slice((Number(q.get('page')||1)-1)*20,Number(q.get('page')||1)*20).map(p=>postView(p,ctx,q.get('reveal')==='true'));
    }
   }
   m=path.match(/^\/api\/characters\/sessions\/([^/]+)(?:\/(messages|history|stop|feedback))?$/);
   if(m){const s=owned(m[1]),action=m[2];if(method==='DELETE'){s.deleted=true;s.turns=[];save();return {cleared:true};}
    if((action==='messages'||action==='history')&&method==='GET'){const ctx=context(s.book,q);if(s.full!==ctx.full||s.chapter>ctx.chapter)fail(404,'当前剧情范围不显示后期聊天。');return copy(s.turns.slice(-50));}
    if(action==='messages'&&method==='POST'){let turn=s.turns.find(t=>t.requestId===body.requestId);if(!turn){state.calls++;turn={requestId:body.requestId,question:String(body.text||'').slice(0,2000),answer:'【示例回复】渡口的风有些大，找个避风的地方坐下再说吧。\n这是一条用于体验界面的固定示例，未连接 AI，也不会产生费用。',status:'completed',createdAt:new Date().toISOString()};s.turns.push(turn);save();}return copy(turn);}
    if(action==='feedback'){state.feedback.push({id:uuid(),bookId:s.book,personId:s.person,category:body.category,status:'pending'});save();return {saved:true};}return {stopped:true};
   }
   m=path.match(/^\/api\/characters\/editor\/books\/(\d+)\/(draft|publish|prompt|test|source|prepare|jobs|moderation|metrics|feedback)(?:\/([^/]+)(?:\/(resolve))?)?$/);
   if(m){needEditor();const [,b,action,id]=m;const v=state.versions[b]||{latest:1,published:1};
    if(action==='draft'&&method==='GET')return {book:{id:Number(b),name:book(b).bookName},version:v.latest,publishedVersion:v.published,document:copy(state.drafts[b]||cast(b)),chapters:chapters(b),modelReady:true,preparationEnabled:true,stale:false};
    if(action==='draft'){if(Number(body.version)!==v.latest)fail(409,'草稿版本已更新，请刷新。');v.latest++;state.versions[b]=v;state.drafts[b]=copy(body.document);save();return {version:v.latest};}
    if(action==='publish'){v.published=v.latest;state.versions[b]=v;state.published[b]=copy(state.drafts[b]||cast(b));save();return {published:v.published};}
    if(action==='prompt'){const p=body.document.people.find(p=>p.id===body.personId);return {prompt:'界面预览提示词 · '+(p?.name||'角色')+' · 第 '+body.chapter+' 章\n'+(p?.facts||[]).filter(f=>f.reveal<=body.chapter&&f.knownFrom>0&&f.knownFrom<=body.chapter&&(!f.until||f.until>=body.chapter)).map(f=>f.type+'：'+f.text).join('\n')};}
    if(action==='test')return {answer:'【示例测聊】这是固定界面示例，未调用模型。正式上线后由服务端按人物设定调用 API。',guarded:false};
    if(action==='source'&&seed.chapters?.[String(b)]){const source=chapters(b).find(c=>c.position===Number(id));if(!source)fail(404,'章节不存在。');return {chapter:Number(id),text:source.name+'\n'+source.body,truncated:false};}
    if(action==='source')return {chapter:Number(id),text:'第 '+id+' 章（虚构样书）\n天色将明，林舟把信折好。许棠站在渡口等他。\n这是用于展示原文对照的示例，不是真实出版小说。',truncated:false};
    if(action==='prepare'){const job={id:uuid(),chapter:Number(body.chapter),status:'ready',document:{people:[],relations:[]}};state.jobs[job.id]=job;save();return job;}
    if(action==='jobs')return id?state.jobs[id]||{}:Object.values(state.jobs);
    if(action==='moderation'){if(id){let p=state.posts.find(x=>x.id===id);if(p){p.status=body.action==='approve'?'approved':body.action==='hide'?'hidden':p.status;if(body.action==='spoiler')p.spoiler=Number(body.spoiler);save();}return {saved:true};}return allPosts(b).map(p=>({...p,reports:[]}));}
    if(action==='feedback'){if(id){const f=state.feedback.find(f=>f.id===id);if(f)f.status='resolved';save();return {saved:true};}return state.feedback.filter(f=>String(f.bookId)===b);}
    if(action==='metrics')return {date:'本地示例',calls:state.calls,failed:0,unknownUsage:0,estimatedUsage:state.calls,inputTokens:0,outputTokens:0,averageMs:0,estimatedCost:null,currency:'CNY',roles:{},pendingPosts:state.posts.filter(p=>String(p.bookId)===b&&p.status==='pending').length,costNote:'这里只展示本浏览器的示例操作计数，没有真实模型用量或费用。'};
   }
   // Existing Thymeleaf book/account screens use the original envelope format.
   let data=[];const parameter=name=>q.get(name)??body[name];
   if(path==='/user/refreshToken')data={token:'preview-only',nickName:user()===99?'演示编辑':'演示读者'};
   else if(path==='/user/queryAuthor' || path==='/author/queryAuthor')data={id:99};
   else if(path==='/user/userInfo')data={id:7,nickName:'演示读者',username:'演示账号',userSex:'0',userPhoto:'/images/man.png'};
   else if(path==='/user/queryIsInShelf')data=state.shelf.includes(Number(parameter('bookId')));
   else if(path==='/user/addToBookShelf'){const id=Number(parameter('bookId'));if(!state.shelf.includes(id))state.shelf.push(id);save();data=true;}
   else if(path==='/user/removeFromBookShelf'||/^\/user\/removeFromBookShelf\/\d+$/.test(path)){const removed=Number(path.split('/')[3]||parameter('bookId'));state.shelf=state.shelf.filter(x=>x!==removed);save();data=true;}
   else if(path==='/user/addReadHistory'){const id=Number(parameter('bookId'));state.history=state.history.filter(x=>x!==id);state.history.unshift(id);const position=Number(parameter('preContentId'));if(chapters(id).some(c=>Number(c.id)===position))state.positions[id]=position;save();data=null;}
   else if(path==='/book/listBookCategory')data=['东方幻想','都市生活','悬疑推理','古代言情'].map((name,i)=>({id:i+1,name,catName:name,workDirection:0}));
   else if(path==='/book/queryIndexList'||path==='/book/queryNewIndexList')data=chapters(parameter('bookId')||1).map(c=>({...c,indexName:c.name,indexNum:c.position,isVip:0,wordCount:2186}));
   else if(path==='/book/queryBookDetail')data=book(parameter('bookId')||parameter('id')||1);
   else if(path==='/book/searchByPage'||path.includes('listBookShelfByPage')||path.includes('listReadHistoryByPage')||path==='/author/listBookByPage'){
    let list=copy(seed.books).map(b=>{const position=state.positions[b.id],chapter=chapters(b.id).find(c=>Number(c.id)===position);return chapter?{...b,preContentId:position,preIndexName:chapter.name}:b;});if(path.includes('Shelf'))list=list.filter(b=>state.shelf.includes(Number(b.id)));if(path.includes('ReadHistory'))list=list.filter(b=>state.history.includes(Number(b.id)));const keyword=String(parameter('keyword')||parameter('k')||'');if(keyword)list=list.filter(b=>(b.bookName+b.authorName).includes(keyword));data={list,total:list.length,pages:1};
   }else if(path.startsWith('/book/list')&&!path.includes('Comment'))data=seed.books;
   else if(/Comment|FeedBack|news\//i.test(path))data={list:[],total:0,pages:0};
   else if(path==='/author/queryIndexList')data={list:chapters(1).map(c=>({...c,indexName:c.name,wordCount:2186,isVip:0})),total:10,pages:1};
   else if(path==='/book/addVisitCount')data=null;
   else if(method!=='GET')return {code:409,msg:'免费界面预览：此项需要正式后端，目前不保存正式数据。'};
   return {code:200,data};
  }
  return {handle(method,path,body){try{return {status:200,data:run(method.toUpperCase(),path,body)};}catch(e){return {status:e.status||400,data:{code:'PREVIEW_ONLY',message:e.message}};}},identity(value){state.user=value;save();},get user(){return user();}};
 }
 return {createApi,publicCast};
});
