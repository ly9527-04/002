(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DashuiPreferences=api;})(typeof window==='object'?window:this,function(){
 'use strict';
 var modes=[{id:'paper',name:'纸感'},{id:'light',name:'明亮'},{id:'night',name:'夜间'},{id:'pink',name:'粉色'}];
 var key='dashui.reading.v1';
 function number(value,fallback,min,max){var n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
 function normalize(value){var p=value&&typeof value==='object'?value:{};return {mode:modes.some(function(m){return m.id===p.mode;})?p.mode:'paper',fontSize:number(p.fontSize,20,16,30),lineHeight:number(p.lineHeight,2,1.6,2.5),width:['narrow','standard','wide'].includes(p.width)?p.width:'standard',font:p.font==='sans'?'sans':'serif'};}
 function load(storage){try{return normalize(JSON.parse(storage.getItem(key)||'{}'));}catch(e){return normalize({});}}
 function save(storage,value){var normalized=normalize(value);try{storage.setItem(key,JSON.stringify(normalized));}catch(e){}return normalized;}
 function palette(mode){return mode==='pink'?'paper':(['paper','light','night'].includes(mode)?mode:'paper');}
 return {modes:modes,normalize:normalize,load:load,save:save,palette:palette};
});
