/* utils.js
   Small helpers: escaping, money format, totals maths, dates, file saving. */
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=s=>document.querySelector(s);
const M=n=>S.set.cur+' '+(+n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const calc=d=>{const s=d.items.reduce((a,x)=>a+(+x.q||0)*(+x.p||0),0),dc=s*(+d.disc||0)/100,tb=s-dc,tx=tb*(+d.tax||0)/100;return{s,dc,tx,t:tb+tx}};
const sum=t=>S.docs[t].reduce((a,d)=>a+calc(d).t,0);
const today=()=>new Date().toISOString().slice(0,10);
const R=()=>location.hash.slice(1)||'home';
const waNum=x=>{const r=String(x||'').trim(),d=r.replace(/\D/g,''),cc=String(S.set.cc||'266').replace(/\D/g,'');if(!d)return'';if(r.startsWith('+'))return d;if(d.startsWith('00'))return d.slice(2);if(d.startsWith('0'))return cc+d.slice(1);if(d.length<=9)return cc+d;return d};
function saveBlob(name,data,mime){const b=data instanceof Blob?data:new Blob([data],{type:mime||'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
