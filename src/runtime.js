(function(){
 'use strict';
 const realFetch=window.fetch.bind(window);let storage;
 try{storage=window.localStorage;}catch(e){storage={getItem(){return null;},setItem(){}};}
 const ready=realFetch('/preview/data.json').then(r=>r.json()).then(seed=>DashuiPreviewApi.createApi(seed,storage));
 window.DashuiPreview={ready,notify(text){if(window.Dashui)Dashui.notify(text);else alert(text);}};
 window.fetch=async function(input,options){
  const address=typeof input==='string'?input:input.url,url=new URL(address,location.href);options=options||{};
  if(url.origin!==location.origin)throw Error('此预览不调用第三方接口。');
  const apiRoute=url.pathname.startsWith('/api/characters/')||(/^\/(book|user|author|friendLink|news)\//.test(url.pathname)&&! /\.[a-z0-9]+$/i.test(url.pathname));
  if(!apiRoute)return realFetch(input,options);
  const api=await ready;let body={};
  if(typeof options.body==='string'){try{body=JSON.parse(options.body);}catch(e){body=Object.fromEntries(new URLSearchParams(options.body));}}else if(options.body instanceof URLSearchParams)body=Object.fromEntries(options.body);
  const method=(options.method||'GET').toUpperCase(),stream=method==='POST'&&/\/sessions\/[^/]+\/messages$/.test(url.pathname);
  if(stream){await new Promise(r=>setTimeout(r,350));if(options.signal?.aborted)throw new DOMException('已停止','AbortError');}
  const result=api.handle(method,url.pathname+url.search,body);
  if(stream&&result.status===200){const text='event: answer\ndata: '+JSON.stringify(result.data)+'\n\nevent: done\ndata: {}\n\n';return new Response(text,{status:200,headers:{'Content-Type':'text/event-stream;charset=utf-8'}});}
  return new Response(JSON.stringify(result.data),{status:result.status,headers:{'Content-Type':'application/json;charset=utf-8'}});
 };
 function init(){ready.then(api=>{
  const menu=document.getElementById('previewIdentity');if(menu){menu.value=api.user===null?'guest':String(api.user);menu.addEventListener('change',()=>{api.identity(menu.value==='guest'?null:Number(menu.value));location.reload();});}
  document.querySelectorAll('[data-preview-editor]').forEach(link=>link.addEventListener('click',()=>api.identity(99)));
  document.querySelectorAll('[data-preview-reader]').forEach(link=>link.addEventListener('click',()=>api.identity(7)));
  document.querySelectorAll('.user_link').forEach(n=>{n.replaceChildren();const a=document.createElement('a');a.href='/user/userinfo.html';a.textContent=api.user===99?'演示编辑':api.user===null?'选择演示身份':'演示读者';n.append(a);});
  document.querySelectorAll('[data-preview-login]').forEach(button=>button.addEventListener('click',()=>{api.identity(Number(button.dataset.previewLogin));location.href='/';}));
 });}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
