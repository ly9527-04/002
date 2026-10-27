(function(root,factory){
 'use strict';
 var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CharacterClient=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function query(values){var params=new URLSearchParams();Object.keys(values).forEach(function(key){if(values[key]!==null&&values[key]!==undefined)params.set(key,String(values[key]));});return params.toString();}
 async function api(path,options,fetcher){
  options=Object.assign({credentials:'same-origin'},options||{});
  options.headers=Object.assign({Accept:'application/json'},options.headers||{});
  if(options.body&&typeof options.body!=='string'){options.headers['Content-Type']='application/json';options.body=JSON.stringify(options.body);}
  var response=await(fetcher||fetch)(path,options),data;
  try{data=await response.json();}catch(e){throw new Error('没有收到有效回应，请稍后重试。');}
  if(!response.ok){var error=new Error(data.message||'操作没有完成，请重试。');error.code=data.code;error.status=response.status;throw error;}
  return data;
 }
 function sseParser(onEvent){
  var buffer='',done=false;
  function parse(frame){
   var type='message',data=[];
   frame.split(/\r?\n/).forEach(function(line){if(line.startsWith('event:'))type=line.slice(6).trim();else if(line.startsWith('data:'))data.push(line.slice(5).trimStart());});
   if(!data.length)return;
   var value;try{value=JSON.parse(data.join('\n'));}catch(e){throw new Error('回复格式有误，请重试。');}
   if(type==='done')done=true;
   if(type==='error'){var error=new Error(value.message||'回复没有完成。');error.code=value.code;throw error;}
   onEvent(type,value);
  }
  return {push:function(chunk){
   buffer+=chunk;if(buffer.length>200000)throw new Error('回复过长，请重试。');
   var match;while((match=/\r?\n\r?\n/.exec(buffer))){var frame=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);parse(frame);}
  },finish:function(){if(buffer.trim())parse(buffer);if(!done)throw new Error('连接中断，点击重试可以恢复这条消息。');}};
 }
 async function send(path,body,onEvent,signal){
  var response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify(body),signal:signal});
  if(!response.ok){var data=await response.json().catch(function(){return {};});var error=new Error(data.message||'对话暂时不可用，请稍后重试。');error.code=data.code;error.status=response.status;throw error;}
  if(!response.body)throw new Error('浏览器暂不支持流式回复。');
  var reader=response.body.getReader(),decoder=new TextDecoder(),parser=sseParser(onEvent);
  try{while(true){var part=await reader.read();if(part.done)break;parser.push(decoder.decode(part.value,{stream:true}));}parser.push(decoder.decode());parser.finish();}
  finally{reader.releaseLock();}
 }
 function editClock(){var generation=0,saved=0;return {changed:function(){generation++;},ticket:function(){return generation;},saved:function(ticket){saved=Math.max(saved,ticket);},dirty:function(){return generation!==saved;}};}
 function completionKey(book){return 'dashui.cast.completed.'+book;}
 function castChanges(before,after){
  var old=new Map((before.people||[]).map(p=>[p.id,p])),next=new Map((after.people||[]).map(p=>[p.id,p]));
  return {addedPeople:[...next.keys()].filter(id=>!old.has(id)).length,removedPeople:[...old.keys()].filter(id=>!next.has(id)).length,changedPeople:[...next.keys()].filter(id=>old.has(id)&&JSON.stringify(old.get(id))!==JSON.stringify(next.get(id))).length,relationsChanged:JSON.stringify(before.relations)!==JSON.stringify(after.relations)};
 }
 function reviewCast(doc){
  var warnings=[],names=new Map(),relations=doc.relations||[];
  (doc.people||[]).forEach(p=>{
   [p.name,...(p.facts||[]).filter(f=>f.type==='alias').map(f=>f.text)].forEach(name=>{if(names.has(name)&&names.get(name)!==p.id)warnings.push('称呼“'+name+'”对应多个人物，请核对别名。');names.set(name,p.id);});
   (p.facts||[]).forEach(f=>{if(!f.sources||!f.sources.length)warnings.push(p.name+' 的资料缺少原著依据章节。');});
  });
  relations.forEach((a,i)=>{
   if(!a.sources||!a.sources.length)warnings.push('关系 '+a.from+' → '+a.to+' 缺少原著依据。');
   relations.slice(i+1).forEach(b=>{if(a.from===b.from&&a.to===b.to&&a.label!==b.label&&Math.max(a.reveal,b.reveal)<=Math.min(a.until||Infinity,b.until||Infinity))warnings.push(a.from+' → '+a.to+' 的不同关系阶段重叠，请核对是否可以同时成立。');});
  });return [...new Set(warnings)];
 }
 return {completionKey:completionKey,castChanges:castChanges,reviewCast:reviewCast,query:query,api:api,sseParser:sseParser,send:send,editClock:editClock};
});
