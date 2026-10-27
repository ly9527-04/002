(function(){
 'use strict';
 const $=window.jQuery;if(!$)return;
 window.isLogin=true;window.token='preview-only';window.getSearchString=key=>new URLSearchParams(location.search).get(key)||undefined;
 window.searchByK=k=>{location.href='/book/bookclass.html?k='+encodeURIComponent(k||document.getElementById('searchKey')?.value||'');};
 window.logout=()=>DashuiPreview.notify('这是独立的演示身份，没有正式账号登录状态。');
 if(!String.prototype.isBlank)String.prototype.isBlank=function(){return !String(this).trim();};
 if(!String.prototype.isPhone)String.prototype.isPhone=function(){return /^1\d{10}$/.test(String(this));};
 if(!String.prototype.isNickName)String.prototype.isNickName=function(){return true;};
 // These are sample cookies in a dedicated storage namespace, never browser auth cookies.
 $.cookie=function(name,value){const key='dashui.preview.cookie.'+name;if(arguments.length>1){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,String(value));}catch(e){}return value;}if(name==='Authorization'||name==='dashui_auth')return 'preview-only';try{return localStorage.getItem(key);}catch(e){return null;}};
 $.ajax=function(options){
  const controller=new AbortController(),method=(options.type||options.method||'GET').toUpperCase();let path=options.url,body=options.data||{};
  if(typeof body==='string')body=Object.fromEntries(new URLSearchParams(body));
  if(method==='GET'){const query=new URLSearchParams(body);path+=(path.includes('?')?'&':'?')+query;}
  const task=window.fetch(path,{method,body:method==='GET'?undefined:JSON.stringify(body),signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.message||'示例操作未完成');options.success?.(data);$(document).trigger('ajaxComplete',[{status:200,responseJSON:data},{url:path}]);options.complete?.();return data;}).catch(error=>{options.error?.(null,'error',error);options.complete?.();});
  task.abort=()=>controller.abort();return task;
 };
 $.getJSON=(url,data,success)=>$.ajax({url,data,success});
})();
