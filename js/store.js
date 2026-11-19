/* store.js
   App state and saving. Data is written to localStorage and mirrored to IndexedDB; backup and restore. */
let S=null,ed=null,vw=null;
const KEY='ebuks';
const mergeData=o=>JSON.parse(JSON.stringify({set:{...D.set,...(o.set||{})},docs:{...D.docs,...(o.docs||{})},clients:o.clients||[],products:o.products||[],expenses:o.expenses||[]}));
S=mergeData({});
try{const r=localStorage.getItem(KEY);if(r)S=mergeData(JSON.parse(r))}catch(e){}
let warned=false;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){if(!warned){warned=true;alert('Storage is full. Download a backup in Settings and remove large images.')}}idbPut(S)};
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('ebuks-db',2);r.onupgradeneeded=()=>{const d=r.result;['kv','img'].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n)})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function idbPut(v){try{const d=await idb();d.transaction('kv','readwrite').objectStore('kv').put(JSON.stringify(v),KEY)}catch(e){}}
async function idbGet(){try{const d=await idb();return await new Promise(res=>{const q=d.transaction('kv').objectStore('kv').get(KEY);q.onsuccess=()=>res(q.result?JSON.parse(q.result):null);q.onerror=()=>res(null)})}catch(e){return null}}
async function initStorage(){
  try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist()}catch(e){}
  if(!localStorage.getItem(KEY)){const o=await idbGet();if(o){S=mergeData(o);save();render()}}else idbPut(S);
}
/* receipt photos live in their own IndexedDB store */
const imgTx=async(m,f)=>{const d=await idb();return new Promise((ok,no)=>{const t=d.transaction('img',m),r=f(t.objectStore('img'));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)})};
const imgPut=(k,v)=>imgTx('readwrite',s=>s.put(v,k)),imgGet=k=>imgTx('readonly',s=>s.get(k)),imgDel=k=>imgTx('readwrite',s=>s.delete(k));
async function imgAll(){const o={},ks=S.expenses.filter(e=>e.img).map(e=>e.id);for(const k of ks){try{const v=await imgGet(k);if(v)o[k]=v}catch(x){}}return o}
async function backup(){const o=JSON.parse(JSON.stringify(S));o.images=await imgAll();saveBlob('ebuks-backup-'+today()+'.json',JSON.stringify(o),'application/json')}
function restore(f){if(!f)return;const r=new FileReader();r.onload=async()=>{try{const o=JSON.parse(r.result);if(!o.docs)throw 0;if(!confirm('Replace all data on this device with this backup?'))return;S=mergeData(o);for(const k in (o.images||{}))await imgPut(k,o.images[k]);save();render();alert('Backup restored.')}catch(e){alert('That file is not a valid E-Buks backup.')}};r.readAsText(f)}
