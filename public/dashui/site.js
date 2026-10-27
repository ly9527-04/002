(function(){'use strict';
 var api=window.DashuiPreferences,storage;try{storage=window.localStorage;}catch(e){storage={};}
 var prefs=api.load(storage),root=document.documentElement;
 function apply(){
  root.dataset.mode=prefs.mode;root.dataset.palette=api.palette(prefs.mode);
  root.style.setProperty('--ds-read-size',prefs.fontSize+'px');root.style.setProperty('--ds-read-leading',prefs.lineHeight);
  root.style.setProperty('--ds-read-width',{narrow:'640px',standard:'740px',wide:'900px'}[prefs.width]);
  root.style.setProperty('--ds-read-font',prefs.font==='sans'?'"Microsoft YaHei",sans-serif':'"Source Han Serif SC","SimSun",serif');
  document.querySelectorAll('[data-ds-mode]').forEach(function(s){s.value=prefs.mode;});
  document.querySelectorAll('[data-ds-setting]').forEach(function(s){s.value=prefs[s.dataset.dsSetting];});
  document.querySelectorAll('[data-ds-font-value]').forEach(function(s){s.textContent=prefs.fontSize;});
 }
 function menu(){var label=document.createElement('label');label.className='ds-mode';label.appendChild(document.createTextNode('阅读模式 '));var select=document.createElement('select');select.setAttribute('aria-label','阅读模式');select.dataset.dsMode='';api.modes.forEach(function(m){var o=new Option(m.name,m.id);select.appendChild(o);});label.appendChild(select);return label;}
 function notify(text){var n=document.getElementById('dsNotice');if(!n){n=document.createElement('div');n.id='dsNotice';n.className='ds-notice';n.setAttribute('role','status');document.body.appendChild(n);}n.textContent=text;n.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(function(){n.hidden=true;},3500);}
 function installMenus(){document.querySelectorAll('[data-ds-mode-slot]').forEach(function(slot){if(!slot.querySelector('[data-ds-mode]'))slot.appendChild(menu());});}
 function readControls(){var content=document.getElementById('showReading');if(!content)return;
  document.body.classList.add('ds-reader');
  var wrap=document.querySelector('.readWrap')||content.parentNode;
  var tools=document.createElement('div');tools.className='ds-reading-tools';
  var catalog=document.createElement('a');catalog.className='ds-button';catalog.textContent='目录';var existing=document.querySelector('.ico_catalog');catalog.href=existing?existing.href:'/book/bookclass.html';tools.appendChild(catalog);
  tools.appendChild(menu());
  [['−',-2],['＋',2]].forEach(function(pair){var b=document.createElement('button');b.type='button';b.className='ds-button';b.dataset.dsFont=pair[1];b.setAttribute('aria-label',pair[1]<0?'减小字号':'增大字号');b.textContent=pair[0];tools.appendChild(b);});
  var size=document.createElement('span');size.dataset.dsFontValue='';size.setAttribute('aria-label','当前字号');tools.appendChild(size);
  var settings=document.createElement('button');settings.type='button';settings.className='ds-button';settings.textContent='排版设置';settings.dataset.dsOpen='';tools.appendChild(settings);
  wrap.parentNode.insertBefore(tools,wrap);
  var dialog=document.createElement('dialog');dialog.id='dsReadingSettings';dialog.className='ds-dialog';
  dialog.innerHTML='<form method="dialog"><button class="ds-close" aria-label="关闭排版设置">关闭</button></form><h2>排版设置</h2><label>正文字体<select data-ds-setting="font"><option value="serif">宋体</option><option value="sans">黑体</option></select></label><label>行距<select data-ds-setting="lineHeight"><option value="1.8">紧凑</option><option value="2">舒适</option><option value="2.2">宽松</option></select></label><label>正文宽度<select data-ds-setting="width"><option value="narrow">窄</option><option value="standard">标准</option><option value="wide">宽</option></select></label>';
  document.body.appendChild(dialog);
 }
 function decorateTables(){document.querySelectorAll('table').forEach(function(table){if(table.querySelector('#bookShelfList,#readHistoryList,#bookHistoryList'))table.classList.add('ds-book-table');if(table.closest('.ds-table-scroll'))return;var holder=document.createElement('div');holder.className='ds-table-scroll';table.parentNode.insertBefore(holder,table);holder.appendChild(table);});}
 function markPage(){var path=location.pathname;document.body.dataset.dsPage=path.includes('/author/')?'author':path.includes('/user/')?'user':path.includes('/book/')?'book':'home';
  if(path.includes('/user/login')||path.includes('/user/register'))document.body.classList.add('ds-auth');
  document.querySelectorAll('.log_list a').forEach(function(a){if(a.getAttribute('href')===path)a.setAttribute('aria-current','page');});
 }
 function imageFallbacks(){document.addEventListener('error',function(e){if(e.target.tagName==='IMG'&&!e.target.dataset.dsFallback){e.target.dataset.dsFallback='true';e.target.src='/dashui/cover.svg';}},true);}
 function settingsPage(){var host=document.getElementById('dsAppearance');if(!host)return;host.appendChild(menu());}
 function ready(){markPage();imageFallbacks();installMenus();readControls();settingsPage();decorateTables();apply();
  if(window.jQuery)window.jQuery(document).ajaxComplete(function(event,xhr,settings){
   var target=settings.url?.includes('/book/searchByPage')?document.getElementById('bookList'):settings.url?.includes('/user/listBookShelfByPage')?document.getElementById('bookShelfList'):settings.url?.includes('/user/listReadHistoryByPage')?document.getElementById('bookHistoryList'):null;
   if(target&&xhr.status===200&&xhr.responseJSON?.code===200&&Array.isArray(xhr.responseJSON.data?.list)&&xhr.responseJSON.data.list.length===0){var tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=8;td.className='ds-empty';td.textContent=target.id==='bookList'?'没有找到匹配作品，请换个关键词或清除筛选。':'这里还没有阅读记录，去书库选一本喜欢的小说吧。';tr.appendChild(td);target.replaceChildren(tr);}
  });
  document.querySelectorAll('input,textarea,select').forEach(function(input){if(!input.getAttribute('aria-label')&&!input.id?.startsWith('ds')&&!input.labels?.length){var label=input.getAttribute('placeholder')||input.getAttribute('title')||input.getAttribute('name');if(label)input.setAttribute('aria-label',label);}});
  // Preserve the account/author sidebars while allowing narrow screens to scroll them.
  document.querySelectorAll('.my_l').forEach(function(n){n.setAttribute('aria-label','功能导航');});
  var editor=document.getElementById('bookContent');if(editor&&location.pathname.includes('/author/')){var count=document.createElement('p');count.className='ds-editor-count';editor.insertAdjacentElement('afterend',count);function update(){count.textContent=editor.value.trim().length+' 字';}editor.addEventListener('input',update);update();}
 }
 document.addEventListener('change',function(e){var n=e.target;if(n.matches('[data-ds-mode]')){prefs.mode=n.value;prefs=api.save(storage,prefs);apply();}
  if(n.matches('[data-ds-setting]')){prefs[n.dataset.dsSetting]=n.value;prefs=api.save(storage,prefs);apply();}});
 document.addEventListener('click',function(e){var b=e.target.closest('[data-ds-font],[data-ds-open],[data-ds-retry]');if(!b)return;
  if(b.hasAttribute('data-ds-font')){prefs.fontSize+=Number(b.dataset.dsFont);prefs=api.save(storage,prefs);apply();}
  if(b.hasAttribute('data-ds-open')){var d=document.getElementById('dsReadingSettings');if(d&&d.showModal)d.showModal();}
  if(b.hasAttribute('data-ds-retry'))loadHome(b.dataset.dsRetry);
 });
 window.addEventListener('storage',function(e){if(e.key==='dashui.reading.v1'){prefs=api.load(storage);apply();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
 window.Dashui={notify:notify,apply:apply};

 // Homepage lists use the project's existing endpoints; content is inserted as text.
 async function loadHome(kind){var target=document.querySelector('[data-ds-list="'+kind+'"]');if(!target)return;
  target.setAttribute('aria-busy','true');target.replaceChildren();var hint=document.createElement('p');hint.className='ds-muted';hint.textContent='正在加载作品…';target.appendChild(hint);
  try{var response=await fetch('/book/'+(kind==='popular'?'listClickRank':'listUpdateRank'),{credentials:'same-origin'});if(!response.ok)throw new Error('network');var result=await response.json();if(Number(result.code)!==200)throw new Error('api');var list=Array.isArray(result.data)?result.data:[];target.replaceChildren();
   if(!list.length){hint.textContent='还没有作品，稍后再来看看。';target.appendChild(hint);}
   list.slice(0,kind==='popular'?5:8).forEach(function(book,i){var link=document.createElement('a');link.className=kind==='popular'?'ds-rank-row':'ds-update-row';link.href='/book/'+encodeURIComponent(book.id)+'.html';var title=document.createElement('strong');title.textContent=book.bookName||'未命名作品';var detail=document.createElement('span');detail.className='ds-muted';detail.textContent=kind==='popular'?(book.catName||'小说'):(book.lastIndexName||'暂无章节');var number=document.createElement('span');number.className='ds-rank-number';number.textContent=String(i+1).padStart(2,'0');link.append(number,title,detail);target.appendChild(link);});
  }catch(e){target.replaceChildren();hint.textContent='作品暂时没有加载出来。';var retry=document.createElement('button');retry.type='button';retry.className='ds-button';retry.textContent='重新加载';retry.dataset.dsRetry=kind;target.append(hint,retry);}
  finally{target.removeAttribute('aria-busy');}
 }
 document.addEventListener('DOMContentLoaded',function(){loadHome('popular');loadHome('updates');});
})();
