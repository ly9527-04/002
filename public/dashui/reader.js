(function(){'use strict';
 var book=document.getElementById('bookId'),chapter=document.getElementById('preContentId'),button=document.getElementById('dsShelf');
 if(!book||!chapter||!document.getElementById('showReading'))return;
 function url(path){return path+'?bookId='+encodeURIComponent(book.value);}
 function post(path){return fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({bookId:book.value,preContentId:chapter.value})}).then(function(r){if(!r.ok)throw new Error('network');return r.json();});}
 fetch(url('/user/queryIsInShelf'),{credentials:'same-origin'}).then(function(r){return r.json();}).then(function(data){if(Number(data.code)===200&&data.data&&button){button.textContent='已在书架';button.disabled=true;}}).catch(function(){});
 // Anonymous reading stays available; history endpoints may legitimately return NO_LOGIN.
 post('/user/addReadHistory').catch(function(){});
 post('/book/addVisitCount').catch(function(){});
 if(button)button.addEventListener('click',function(){button.disabled=true;post('/user/addToBookShelf').then(function(data){if(Number(data.code)===200){button.textContent='已在书架';}
  else if(Number(data.code)===1001){location.href='/user/login.html?originUrl='+encodeURIComponent(location.pathname);}
  else{button.disabled=false;Dashui.notify(data.msg||'暂时没有加入书架，请重试。');}
 }).catch(function(){button.disabled=false;Dashui.notify('网络连接失败，请重试。');});});
 document.addEventListener('keydown',function(e){if(e.target.closest('input,textarea,select,button,dialog,[contenteditable]')||e.altKey||e.ctrlKey||e.metaKey)return;var link=e.key==='ArrowLeft'?document.querySelector('.nextPageBox .prev'):e.key==='ArrowRight'?document.querySelector('.nextPageBox .next'):null;if(link){e.preventDefault();location.href=link.href;}});
})();
