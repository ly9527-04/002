(function(){
 'use strict';
 let C;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn,cls)=>{const n=el('button',cls===undefined?'ds-button':cls,text);n.type='button';n.addEventListener('click',fn);return n;};
 const types=[['profile','人物特点'],['voice','说话方式'],['event','人物经历'],['belief','人物想法/误会'],['alias','其他称呼'],['prompt','补充扮演规则'],['example','对话样例（只用于角色扮演）']];
 function start(){
  C=window.CharacterClient;
  const root=document.getElementById('characterEditor');if(!root||!C)return;
  const book=root.dataset.bookId||new URLSearchParams(location.search).get('bookId');
  if(!book){root.textContent='请从作品的章节管理页进入人物维护台。';return;}
  const base='/api/characters/editor/books/'+encodeURIComponent(book);
  let state,baseline,selected='',dirty=false,rows,editor,status,versions,promptPerson,promptChapter,jobList,moderation,reviewBox,operations,feedbackList;
  const edits=C.editClock();
  const mark=()=>{edits.changed();dirty=edits.dirty();status.textContent='有未保存的修改，先保存草稿再发布。';renderReview();};
  const error=e=>{status.textContent=e.message||'操作失败，请重试。';status.classList.add('cc-error');};
  const perform=async fn=>{status.classList.remove('cc-error');try{await fn();}catch(e){error(e);}};
  const api=(path,body)=>C.api(base+path,body===undefined?{}:{method:'POST',body:body});

  function field(container,label,value,change,kind='text',options){
   const wrap=el('label','cc-field',label);let input;
   if(kind==='select'){
    input=el('select');options.forEach(([id,name])=>{const option=el('option','',name);option.value=id;input.append(option);});input.value=String(value);
   }else{input=el(kind==='textarea'?'textarea':'input');if(kind!=='textarea')input.type=kind;input.value=value??'';if(kind==='number'){input.min='0';input.max=String(state.chapters.length);}if(kind==='textarea'){input.rows=3;input.maxLength=2000;wrap.classList.add('cc-field-wide');}}
   input.addEventListener(kind==='select'?'change':'input',()=>{change(kind==='number'?Number(input.value):input.value);mark();});wrap.append(input);container.append(wrap);return input;
  }
  function interval(container,value){
   field(container,'向读者揭示 · 第几章',value.reveal,v=>value.reveal=v,'number');
   field(container,'该人物知晓 · 第几章（0 为不知）',value.knownFrom,v=>value.knownFrom=v,'number');
   field(container,'有效至第几章（0 为持续有效）',value.until,v=>value.until=v,'number');
   field(container,'原著依据章节，用逗号分隔',value.sources.join(','),v=>value.sources=v.split(/[,，、\s]+/).filter(Boolean).map(Number));
  }
  function renderPeople(){
   rows.replaceChildren();state.document.people.forEach(p=>{
    const n=button(p.name||'未命名人物',()=>{selected=p.id;renderPeople();renderPerson();},'cc-person');n.setAttribute('aria-pressed',String(selected===p.id));rows.append(n);
   });refreshSelectors();
  }
  function refreshSelectors(){
   if(!promptPerson)return;const selectedId=promptPerson.value;promptPerson.replaceChildren();
   state.document.people.forEach(p=>{const n=el('option','',p.name);n.value=p.id;promptPerson.append(n);});if(state.document.people.some(p=>p.id===selectedId))promptPerson.value=selectedId;
  }
  function renderPerson(){
   editor.replaceChildren();const person=state.document.people.find(p=>p.id===selected);
   if(!person){editor.append(el('p','cc-empty','先新建一个人物，再填写性格、说话方式和原著依据。'));return;}
   editor.append(el('h2','',person.name||'新人物'));const basic=el('div','cc-editor-grid');
   const id=field(basic,'书内人物编号（小写字母/数字）',person.id,v=>{
    const old=person.id;person.id=v;selected=v;state.document.relations.forEach(r=>{if(r.from===old)r.from=v;if(r.to===old)r.to=v;});
   });id.maxLength=48;id.addEventListener('blur',()=>{renderPeople();renderRelations();});
   const name=field(basic,'人物姓名',person.name,v=>person.name=v);name.maxLength=60;name.addEventListener('blur',()=>{renderPeople();renderRelations();});
   field(basic,'首次出现 · 第几章',person.debut,v=>person.debut=v,'number');field(basic,'角色聊天开放状态',person.chatEnabled===false?'off':'on',v=>person.chatEnabled=v==='on','select',[['off','校对中，先开放档案与留言'],['on','开放角色聊天']]);editor.append(basic,el('p','cc-subtitle','隐藏身份和后期性格变化请写在下方资料条目里，并设置正确的揭示章节。'));
   const facts=el('div');editor.append(facts);
   person.facts.forEach((f,index)=>{
    const row=el('section','cc-editor-row'),head=el('div','cc-editor-row-head');head.append(el('strong','','资料 '+(index+1)),button('移除这条资料',()=>{person.facts.splice(index,1);mark();renderPerson();},'cc-text-button'));
    const grid=el('div','cc-editor-grid');field(grid,'资料类型',f.type,v=>f.type=v,'select',types);field(grid,'内容',f.text,v=>f.text=v,'textarea');interval(grid,f);row.append(head,grid);facts.append(row);
   });
   const examples=el('details','cc-example-help');examples.append(el('summary','','怎样让这个人物说话有辨识度？'),el('p','cc-subtitle','选择“对话样例”，按当前阶段填写问题和角色回答。分别考虑被夸奖、被质疑、被误解、不知道答案、拒绝请求；示例需有性格依据，并设置揭示/知晓章节。'));
   examples.append(button('添加一条待填写的对话样例',()=>{person.facts.push({type:'example',text:'',reveal:person.debut,knownFrom:person.debut,until:0,sources:[person.debut]});mark();renderPerson();}));editor.append(examples);
   const actions=el('div','cc-actions');actions.append(button('添加人物资料',()=>{person.facts.push({type:'profile',text:'',reveal:person.debut,knownFrom:person.debut,until:0,sources:[person.debut]});mark();renderPerson();}),button('移除人物（先移除关联关系）',()=>{
    if(state.document.relations.some(r=>r.from===person.id||r.to===person.id)){error(new Error('这个人物还有关系记录，请先移除关联关系。'));return;}
    state.document.people=state.document.people.filter(p=>p!==person);selected=state.document.people[0]?.id||'';mark();renderPeople();renderPerson();
   },'cc-text-button'));editor.append(actions);
  }
  let relationRows;
  function renderRelations(){
   relationRows.replaceChildren();const choices=state.document.people.map(p=>[p.id,p.name]);
   state.document.relations.forEach((r,index)=>{
    const row=el('div','cc-editor-row'),head=el('div','cc-editor-row-head');head.append(el('strong','','关系 '+(index+1)),button('移除关系',()=>{state.document.relations.splice(index,1);mark();renderRelations();},'cc-text-button'));
    const grid=el('div','cc-editor-grid');field(grid,'从这个人物出发',r.from,v=>r.from=v,'select',choices);field(grid,'指向这个人物',r.to,v=>r.to=v,'select',choices);field(grid,'关系，例如：同伴/喜欢/师徒',r.label,v=>r.label=v);field(grid,'这段关系的真实情况',r.detail,v=>r.detail=v,'textarea');interval(grid,r);row.append(head,grid);relationRows.append(row);
   });
  }
  async function save(){
   const ticket=edits.ticket(),snapshot=structuredClone(state.document);const result=await api('/draft',{version:state.version,document:snapshot});baseline=snapshot;renderReview();state.version=result.version;edits.saved(ticket);dirty=edits.dirty();versions.textContent='当前草稿 v'+state.version+' · 已发布 v'+state.publishedVersion;status.textContent=dirty?'已保存请求发出时的草稿，另有新修改尚未保存。':'草稿已保存；读者仍使用已发布版本。';return result;
  }
  function download(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function acceptDocument(value,merge){
   if(!value||!Array.isArray(value.people)||!Array.isArray(value.relations))throw new Error('需要包含 people 和 relations 的人物资料 JSON。');
   if(value.people.some(p=>!p||typeof p.id!=='string'||typeof p.name!=='string'||!Array.isArray(p.facts)||p.facts.some(f=>!f||!Array.isArray(f.sources))))throw new Error('人物资料格式不完整，请检查人物编号、姓名、facts 和 sources。');
   if(value.relations.some(r=>!r||!Array.isArray(r.sources)))throw new Error('关系资料格式不完整，请检查 sources。');
   if(merge){
    value.people.forEach(person=>{const old=state.document.people.find(p=>p.id===person.id);if(old&&old.name!==person.name)throw new Error('人物编号 '+person.id+' 冲突，请先修改导入文件的编号。');});
    value.people.forEach(person=>{const old=state.document.people.find(p=>p.id===person.id);if(old){const known=new Set(old.facts.map(f=>JSON.stringify(f)));person.facts.forEach(f=>{if(!known.has(JSON.stringify(f)))old.facts.push(f);});}else{person.chatEnabled=false;state.document.people.push(person);}});
    const known=new Set(state.document.relations.map(r=>JSON.stringify(r)));value.relations.forEach(r=>{if(!known.has(JSON.stringify(r)))state.document.relations.push(r);});
   }else state.document=value;
   selected=state.document.people[0]?.id||'';mark();renderPeople();renderPerson();renderRelations();status.textContent='已导入到本地草稿，请校对后保存和发布。';
  }
  async function renderJobs(){
   const jobs=await api('/jobs');jobList.replaceChildren();if(!jobs.length)jobList.append(el('p','cc-subtitle','还没有自动整理任务。每次整理一章，结果只进入待审核草稿。'));
   jobs.forEach(j=>{const row=el('div','cc-editor-row');row.append(el('p','cc-subtitle','第 '+j.chapter+' 章 · '+({queued:'排队中',running:'整理中',ready:'待校对',failed:'未完成'}[j.status]||j.status)));
    row.append(button('查看任务',()=>perform(async()=>{const job=await api('/jobs/'+j.id);showJob(job);}),'cc-text-button'));jobList.append(row);});
  }
  function showJob(job){
   jobList.replaceChildren(el('p','cc-subtitle','第 '+job.chapter+' 章 · '+job.status));
   if(job.document){const changes=C.castChanges(state.document,job.document);jobList.append(el('p','cc-notice','本章提取 '+job.document.people.length+' 个人物、'+job.document.relations.length+' 条关系。合并会保留原条目并补充新条目；相同编号不同姓名会阻止合并，请对照原文核对。'));const preview=el('pre','cc-prompt',JSON.stringify(job.document,null,2));jobList.append(preview,button('合并到本地草稿',()=>perform(async()=>acceptDocument(job.document,true))));}
   else if(job.error)jobList.append(el('p','cc-error',job.error));
   else jobList.append(el('p','cc-subtitle','正在整理，不会自动发布给读者。'));
  }
  async function renderModeration(){
   const posts=await api('/moderation');moderation.replaceChildren();if(!posts.length)moderation.append(el('p','cc-subtitle','还没有需要处理的留言。'));
   posts.forEach(p=>{
    const row=el('article','cc-post');row.append(el('p','cc-post-head',(p.personId?'人物 '+p.personId:'本书讨论')+' · '+p.authorName+' · '+({pending:'待审核',approved:'已公开',hidden:'已隐藏'}[p.status]||p.status)),el('p','cc-post-content',p.content));
    p.reports.forEach(report=>row.append(el('p','cc-error','举报：'+report.reason)));
    const tools=el('div','cc-actions'),number=el('input');number.type='number';number.min=0;number.max=state.chapters.length;number.value=p.spoiler;number.setAttribute('aria-label','剧透章节（0 为无剧透）');number.style.maxWidth='110px';
    const act=action=>perform(async()=>{await api('/moderation/'+p.id,{action:action,spoiler:Number(number.value)});status.textContent='留言处理已保存。';renderModeration();});
    tools.append(button('通过',()=>act('approve')),button('隐藏',()=>act('hide')),number,button('修改剧透章节',()=>act('spoiler')));row.append(tools);moderation.append(row);
   });
  }
  function renderReview(){
   if(!reviewBox||!state)return;const changes=C.castChanges(baseline||state.document,state.document);reviewBox.replaceChildren(el('h2','','发布前校对'),el('p','cc-subtitle','相对本次加载/保存：新增 '+changes.addedPeople+' 人，修改 '+changes.changedPeople+' 人，移除 '+changes.removedPeople+' 人；关系'+(changes.relationsChanged?'有变化':'无变化')+'。'));
   const warnings=C.reviewCast(state.document);if(!warnings.length)reviewBox.append(el('p','cc-subtitle','未发现缺少出处、重复称呼或关系阶段重叠；仍需要人工核对原著。'));warnings.forEach(text=>reviewBox.append(el('p','cc-error',text)));
  }
  async function renderOperations(){
   const [m,feedback]=await Promise.all([api('/metrics'),api('/feedback')]);operations.replaceChildren();const table=el('table','cc-metrics');
   [['今天的调用',m.calls+' 次'],['失败 / 未知用量',m.failed+' / '+m.unknownUsage],['输入 / 输出 token',m.inputTokens+' / '+m.outputTokens],['估算用量的调用',m.estimatedUsage+' 次'],['平均等待',Math.round(m.averageMs/100)/10+' 秒'],['已知用量估算费用',m.estimatedCost===null?'未设置模型价格':m.estimatedCost+' '+m.currency],['待审核留言',m.pendingPosts+' 条']].forEach(([label,value])=>{const row=el('tr');row.append(el('th','',label),el('td','',value));table.append(row);});operations.append(table,el('p','cc-subtitle',m.costNote));
   const names=new Map(state.document.people.map(p=>[p.id,p.name]));Object.entries(m.roles).forEach(([id,count])=>operations.append(el('p','cc-subtitle',(names.get(id)||id)+'：'+count+' 次角色对话调用')));
   if(m.siteBudget){operations.append(el('p','cc-subtitle','站点每日聊天预算 '+m.dailySiteTokens+' token，整理预算 '+m.dailyPreparationTokens+' token；以下用量含未知消耗的保守预留。'));m.siteBudget.forEach(b=>operations.append(el('p','cc-subtitle',(b.scope==='chat-site'?'聊天':'整理')+'已预留 / 消耗 '+b.tokens+' token')));}
   feedbackList.replaceChildren(el('h3','','角色回复反馈'));if(!feedback.length)feedbackList.append(el('p','cc-subtitle','暂时没有反馈。读者可以在每条回答下标记问题。'));
   feedback.forEach(f=>{const row=el('div','cc-editor-row');row.append(el('p','',(names.get(f.personId)||f.personId)+' · '+({voice:'不像角色',plot:'剧情有误',spoiler:'涉及剧透'}[f.category]||f.category)+' · '+(f.status==='resolved'?'已处理':'待处理')));if(f.status!=='resolved')row.append(button('标记已处理',()=>perform(async()=>{await api('/feedback/'+f.id+'/resolve',{});renderOperations();}),'cc-text-button'));feedbackList.append(row);});
  }
  async function load(){
   root.replaceChildren(el('p','cc-empty','正在加载人物维护台…'));
   try{state=await api('/draft');baseline=structuredClone(state.document);build();}catch(e){root.replaceChildren(el('p','cc-error',e.message),button('重新加载',load));if(e.status===401){const link=el('a','ds-button','前往登录');link.href='/user/login.html?originUrl='+encodeURIComponent(location.pathname+location.search);root.append(link);}}
  }
  function build(){
   root.replaceChildren();const head=el('div','cc-heading'),titles=el('div');titles.append(el('h1','','人物与留言管理'),el('p','',state.book.name+' · 草稿经过校对和发布，才会影响读者。'));const back=el('a','cc-back','查看读者页面');back.href='/book/characters-'+encodeURIComponent(book)+'.html';head.append(titles,back);root.append(head);
   versions=el('p','cc-subtitle','当前草稿 v'+state.version+' · 已发布 v'+state.publishedVersion);root.append(versions);
   status=el('p','cc-status',state.stale?'章节有更新，请复核人物资料后重新保存和发布。':'');status.setAttribute('role','status');
   const actions=el('div','cc-editor-toolbar');actions.append(button('保存草稿',()=>perform(save),'ds-button cc-primary'),button('发布人物资料',()=>perform(async()=>{if(dirty||!state.version)await save();if(dirty)throw new Error('保存期间又有新修改，请保存最新草稿后再发布。');const result=await api('/publish',{version:state.version});state.publishedVersion=result.published;versions.textContent='当前草稿 v'+state.version+' · 已发布 v'+state.publishedVersion;status.textContent=dirty?'已发布 v'+state.publishedVersion+'，本地仍有未保存的修改。':'人物资料已发布，读者可以查看。';})),button('导出 JSON',()=>download(state.document,'大水书阁-人物档案-'+book+'.json')));
   const file=el('input','cc-file');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','导入人物 JSON（替换当前未保存草稿）');file.addEventListener('change',()=>perform(async()=>{const selected=file.files[0];if(!selected)return;if(selected.size>2000000)throw new Error('文件超过 2 MB，请精简后导入。');acceptDocument(JSON.parse(await selected.text()),false);}));actions.append(file);root.append(actions,status);
   reviewBox=el('section','cc-review-summary');root.append(reviewBox);
   const layout=el('div','cc-layout'),sidebar=el('aside','cc-sidebar');rows=el('div','cc-person-list');sidebar.append(el('h2','','人物列表'),rows,button('新建人物',()=>{const person={id:'person_'+crypto.randomUUID().slice(0,8),name:'新人物',debut:1,facts:[],chatEnabled:false};state.document.people.push(person);selected=person.id;mark();renderPeople();renderPerson();}));editor=el('section','cc-main');layout.append(sidebar,editor);root.append(layout);
   const relations=el('section','cc-editor-section');relations.append(el('h2','','人物关系'),el('p','cc-subtitle','关系有方向。“知晓章节”只表示起点人物知道；如果终点人物也知道，请补充对应人物的经历或想法。单向感情不会自动成为双方认知。'));relationRows=el('div');relations.append(relationRows,button('添加关系',()=>{
    if(state.document.people.length<2){error(new Error('请先添加至少两个人物。'));return;}
    const [from,to]=state.document.people,reveal=Math.max(from.debut,to.debut);state.document.relations.push({from:from.id,to:to.id,label:'同伴',detail:'',reveal:reveal,knownFrom:reveal,until:0,sources:[reveal]});mark();renderRelations();
   }));root.append(relations);
   const source=el('section','cc-editor-section');source.append(el('h2','','原文对照与校对'),el('p','cc-subtitle','选择依据章节，对照原文核查人物认知与关系；正文仅作品作者和站点编辑可见。'));
   const sourceBar=el('div','cc-editor-toolbar'),sourceChapter=el('select');sourceChapter.setAttribute('aria-label','原文对照章节');state.chapters.forEach(ch=>{const option=el('option','','第 '+ch.position+' 章 · '+ch.name);option.value=ch.position;sourceChapter.append(option);});
   const sourcePane=el('div','cc-source-compare'),sourceText=el('pre','cc-source-text','选择章节加载原文。'),sourceFacts=el('div');
   const showSource=async()=>{const number=Number(sourceChapter.value),value=await api('/source/'+number);sourceText.textContent=value.text+(value.truncated?'\n（超过显示长度，请回章节编辑页查看全文）':'');sourceFacts.replaceChildren(el('h3','','本地草稿中引用本章的资料'));
    state.document.people.forEach(p=>p.facts.filter(f=>f.sources?.includes(number)).forEach(f=>{const item=el('div','cc-fact');item.append(el('strong','',p.name+' · '+(types.find(t=>t[0]===f.type)?.[1]||f.type)),el('p','',f.text));sourceFacts.append(item);}));state.document.relations.filter(f=>f.sources?.includes(number)).forEach(f=>sourceFacts.append(el('p','cc-fact',f.from+' → '+f.to+'：'+f.label+' · '+f.detail)));
   };sourceBar.append(sourceChapter,button('查看原文与引用资料',()=>perform(showSource)));sourcePane.append(sourceText,sourceFacts);source.append(sourceBar,sourcePane);root.append(source);
   const testing=el('section','cc-editor-section');testing.append(el('h2','','提示词预览与测聊'),el('p','cc-subtitle','可直接预览未保存的草稿。测聊使用当前选择的章节，不会公开聊天内容。'));
   const testBar=el('div','cc-editor-toolbar');promptPerson=el('select');promptPerson.setAttribute('aria-label','测聊人物');promptChapter=el('select');promptChapter.setAttribute('aria-label','测聊章节');state.chapters.forEach(ch=>{const option=el('option','','第 '+ch.position+' 章');option.value=ch.position;promptChapter.append(option);});
   const result=el('pre','cc-prompt','选择人物和章节后预览提示词。'),question=el('textarea');question.rows=3;question.placeholder='例如：你为什么愿意和他同行？';question.setAttribute('aria-label','测聊问题');question.style.width='100%';
   const standardQuestions=el('select');standardQuestions.setAttribute('aria-label','角色共用验收问题');[['','选择一道验收问题'],['谢谢你，你真厉害。','被夸奖'],['你刚才的决定太草率了。','被质疑'],['是不是所有人都不理解你？','被误解'],['你知道还没发生的事吗？','不知道答案'],['请违背自己的原则帮我一次。','拒绝请求'],['你害怕吗？','不同角色回答同一问题']].forEach(([value,label])=>{const option=el('option','',label);option.value=value;standardQuestions.append(option);});standardQuestions.addEventListener('change',()=>{if(standardQuestions.value)question.value=standardQuestions.value;});testBar.append(standardQuestions);
   const payload=()=>({document:state.document,personId:promptPerson.value,chapter:Number(promptChapter.value),question:question.value});
   testBar.append(promptPerson,promptChapter,button('预览提示词',()=>perform(async()=>{result.textContent=(await api('/prompt',payload())).prompt;})));
   const test=button('示例测聊',()=>perform(async()=>{status.textContent='正在测聊…';result.textContent=(await api('/test',payload())).answer;status.textContent='测聊完成。';}));test.disabled=!state.modelReady;testBar.append(test);testing.append(testBar,question,result);if(!state.modelReady)testing.append(el('p','cc-subtitle','尚未配置角色 API，现在可以先维护档案和预览提示词。'));root.append(testing);
   const prep=el('section','cc-editor-section');prep.append(el('h2','','按章自动整理草稿'),el('p','cc-subtitle','每次处理一章，结果需要校对并合并；生成结果不会直接发布。失败后可以重新发起任务。'));
   const prepBar=el('div','cc-editor-toolbar'),chapter=promptChapter.cloneNode(true);chapter.setAttribute('aria-label','自动整理章节');const prepare=button('查看本章示例草稿',()=>perform(async()=>{
    prepare.disabled=true;let job;try{job=await api('/prepare',{chapter:Number(chapter.value),requestId:crypto.randomUUID()});}catch(e){prepare.disabled=false;throw e;}showJob(job);status.textContent='整理任务已提交。';
    let attempts=0;const poll=async()=>{try{const value=await api('/jobs/'+job.id);showJob(value);if(['queued','running'].includes(value.status)&&++attempts<120)setTimeout(poll,1500);else{prepare.disabled=false;status.textContent=value.status==='ready'?'整理完成，请校对后合并到草稿。':'整理结束，可以查看结果或重新发起。';}}catch(e){prepare.disabled=false;error(e);}};setTimeout(poll,1000);
   }));prepare.disabled=!state.modelReady||!state.preparationEnabled;prepBar.append(chapter,prepare,button('刷新任务记录',()=>perform(renderJobs)));jobList=el('div');prep.append(prepBar,jobList);root.append(prep);
   const mod=el('section','cc-editor-section');mod.append(el('h2','','公共留言审核'),el('p','cc-subtitle','书籍与人物留言分别归属。回复至少继承父帖的剧透范围；隐藏父帖会一并隐藏其回复。'),button('刷新留言队列',()=>perform(renderModeration)));moderation=el('div');mod.append(moderation);root.append(mod);
   const ops=el('section','cc-editor-section');ops.append(el('h2','','今日用量与质量反馈'),el('p','cc-subtitle','仅统计本书。费用按服务端当前模型价格估算已知用量；失败或未返回用量的调用可能还有额外费用。'),button('刷新用量与反馈',()=>perform(renderOperations)));operations=el('div');feedbackList=el('div');ops.append(operations,feedbackList);root.append(ops);
   selected=state.document.people[0]?.id||'';renderPeople();renderPerson();renderRelations();renderReview();perform(renderJobs);perform(renderModeration);perform(renderOperations);
  }
  load();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
