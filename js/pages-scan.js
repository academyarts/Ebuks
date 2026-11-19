/* pages-scan.js
   Scan receipts with the phone camera (or upload a photo), store them on the device,
   and keep an organised expense ledger with a monthly books summary. */
const CATS=['Stock / Inventory','Rent','Utilities','Transport','Fuel','Salaries','Marketing','Office supplies','Meals','Equipment','Repairs','Other'];
const PAY=['Cash','Card','EFT / bank transfer','Mobile money','Other'];
let rc=null,bigId=null,fm='',fc='',enh=true;
const IC={};
const mlab=m=>new Date(m+'-01T00:00:00').toLocaleString(undefined,{month:'long',year:'numeric'});
const setF=(k,v)=>{if(!rc)return;rc[k]=v;const e=$('#rf_'+k);if(e)e.value=v};
async function loadImg(k){return IC[k]||(IC[k]=await imgGet(k))}
function fillImgs(){document.querySelectorAll('img[data-k]').forEach(async i=>{try{const u=await loadImg(i.dataset.k);if(u)i.src=u}catch(e){}})}
/* ---- read date, shop and total from recognised text ---- */
function parseReceipt(t){
  const lines=t.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out={},mo={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  out.vendor=(lines.find(l=>/[A-Za-z]{3}/.test(l)&&!/receipt|invoice|tax|vat|date|tel|phone|www|@/i.test(l))||'').slice(0,60);
  let m,d;
  if(m=t.match(/\b(20\d\d)[-\/.](\d{1,2})[-\/.](\d{1,2})\b/))d=[+m[1],+m[2],+m[3]];
  else if(m=t.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4}|\d{2})\b/))d=[+m[3]<100?2000+ +m[3]:+m[3],+m[2],+m[1]];
  else if(m=t.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})\b/i))d=[+m[3],mo[m[2].toLowerCase()],+m[1]];
  if(d&&d[1]>=1&&d[1]<=12&&d[2]>=1&&d[2]<=31)out.date=`${d[0]}-${String(d[1]).padStart(2,'0')}-${String(d[2]).padStart(2,'0')}`;
  const amt=l=>[...l.matchAll(/(\d[\d,]*\.\d{2})\b/g)].map(x=>num(x[1])),
    tl=lines.filter(l=>/total|amount due|balance due|to pay/i.test(l)&&!/sub\s*-?total|total\s+(vat|tax)/i.test(l)).flatMap(amt),all=lines.flatMap(amt);
  out.amount=tl.length?tl[tl.length-1]:(all.length?Math.max(...all):'');
  return out;
}
async function autoRead(cv){
  if(!('TextDetector' in window))return false;
  try{const b=await new TextDetector().detect(cv),p=parseReceipt(b.map(x=>x.rawValue).join('\n'));['date','vendor','amount'].forEach(k=>{if(p[k]&&!rc[k])setF(k,p[k])});return true}catch(e){return false}
}
/* ---- capture ---- */
async function scanFile(f){
  if(!f)return;
  const url=URL.createObjectURL(f),im=new Image();
  try{await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=url})}catch(e){alert('Could not open that image.');return}
  const k=Math.min(1,1600/Math.max(im.width,im.height)),cv=document.createElement('canvas');
  cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);
  const x=cv.getContext('2d');x.drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(url);
  if(enh){const d=x.getImageData(0,0,cv.width,cv.height),p=d.data;for(let i=0;i<p.length;i+=4){const g=(p[i]*.299+p[i+1]*.587+p[i+2]*.114-128)*1.45+138,v=g<0?0:g>255?255:g;p[i]=p[i+1]=p[i+2]=v}x.putImageData(d,0,0)}
  rc={id:0,img:cv.toDataURL('image/jpeg',.82),date:today(),vendor:'',category:'Other',amount:'',tax:'',method:'Cash',notes:''};bigId=null;render();
  autoRead(cv).then(ok=>{const n=$('#rnote');if(n)n.textContent=ok?'Auto-read finished. Please check the details below.':'Auto-read is not available in this browser. Please fill in the details below.'});
}
async function saveRc(){
  const r=rc,a=+r.amount;if(!(a>0))return alert('Enter the total amount on the receipt.');
  const e={id:r.id||Date.now().toString(36),date:r.date||today(),vendor:r.vendor.trim(),category:(r.category||'').trim()||'Other',amount:a,tax:+r.tax||0,method:r.method,notes:r.notes.trim(),img:false};
  if(r.id){const i=S.expenses.findIndex(x=>x.id==r.id);e.img=S.expenses[i].img;S.expenses[i]=e}
  else{e.img=!!r.img;S.expenses.push(e);if(r.img){IC[e.id]=r.img;try{await imgPut(e.id,r.img)}catch(x){e.img=false;alert('The photo could not be stored on this device, so only the details were saved.')}}}
  save();rc=null;render();
}
function delExp(id){if(!confirm('Delete this receipt record and its photo?'))return;const i=S.expenses.findIndex(x=>x.id==id);if(i<0)return;S.expenses.splice(i,1);imgDel(id).catch(()=>{});delete IC[id];bigId=null;save();render()}
function editExp(id){const e=S.expenses.find(x=>x.id==id);rc={...e,img:null,amount:e.amount,tax:e.tax||''};bigId=null;render()}
function expCsv(){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  saveBlob('ebuks-expenses-'+today()+'.csv',[['Date','Vendor','Category','Payment method','Amount','Tax included','Notes','Receipt photo']].concat(S.expenses.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.vendor,e.category,e.method,e.amount,e.tax,e.notes,e.img?'Yes':'No'])).map(r=>r.map(q).join(',')).join('\n'),'text/csv');
}
async function saveImgFile(id){const u=await loadImg(id);if(!u)return;const b=await (await fetch(u)).blob();saveBlob('receipt-'+id+'.jpg',b,'image/jpeg')}
/* ---- page ---- */
function scanPg(){
  const X=S.expenses,months=[...new Set(X.map(e=>e.date.slice(0,7)))].sort().reverse(),cm=today().slice(0,7),sp=m=>X.filter(e=>e.date.startsWith(m)).reduce((a,e)=>a+e.amount,0),
    lm=(()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')})(),
    list=X.filter(e=>(!fm||e.date.startsWith(fm))&&(!fc||e.category==fc)).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)),
    inc=m=>S.docs.invoice.filter(d=>d.status=='Paid'&&String(d.date).startsWith(m)).reduce((a,d)=>a+calc(d).t,0),
    allM=[...new Set([...months,...S.docs.invoice.filter(d=>d.status=='Paid'&&d.date).map(d=>d.date.slice(0,7))])].sort().reverse();
  const ff=(k,l,ty='text',x='')=>`<div><label>${l}</label><input id="rf_${k}" type="${ty}" ${ty=='number'?'step="0.01"':''} value="${E(rc[k])}" oninput="rc.${k}=this.value" ${x}></div>`;
  let h=nav('scan')+`<main><div class="row sp" style="margin-bottom:14px"><h2 style="margin:0">Scan receipts</h2></div>`;
  if(rc)h+=`<div class="card" style="margin-bottom:14px"><b>${rc.id?'Edit receipt':'New receipt'}</b><p class="muted" id="rnote" style="margin:4px 0 10px">${rc.img?'Reading the receipt…':''}</p>${rc.img?`<img src="${rc.img}" alt="Receipt" style="max-width:100%;max-height:360px;border:1px solid var(--bd);border-radius:8px;display:block;margin-bottom:12px">`:(rc.id&&(X.find(x=>x.id==rc.id)||{}).img?`<img data-k="${rc.id}" alt="Receipt" style="max-width:100%;max-height:360px;border:1px solid var(--bd);border-radius:8px;display:block;margin-bottom:12px">`:'')}<div class="g">${ff('date','Date','date')}${ff('vendor','Shop or supplier')}${ff('category','Category','text','list="cats"')}${ff('amount','Total paid','number')}${ff('tax','Tax included (optional)','number')}<div><label>Paid by</label><select onchange="rc.method=this.value">${PAY.map(p=>`<option ${p==rc.method?'selected':''}>${p}</option>`).join('')}</select></div></div><datalist id="cats">${CATS.map(c=>`<option value="${c}">`).join('')}</datalist><div style="margin:12px 0"><label>Notes</label><textarea rows="2" oninput="rc.notes=this.value">${E(rc.notes)}</textarea></div><div class="row"><button class="btn p" onclick="saveRc()">Save to books</button><button class="btn" onclick="rc=null;render()">Cancel</button></div></div>`;
  else{
    h+=`<div class="card" style="margin-bottom:14px"><div class="row"><button class="btn p" onclick="$('#cam').click()">Scan with camera</button><button class="btn" onclick="$('#gal').click()">Upload a photo</button><button class="btn" onclick="rc={id:0,img:null,date:today(),vendor:'',category:'Other',amount:'',tax:'',method:'Cash',notes:''};render()">Add without photo</button><label style="margin:0;display:flex;gap:6px;align-items:center"><input type="checkbox" style="width:auto" ${enh?'checked':''} onchange="enh=this.checked"> Clean up photo (black and white)</label></div><input id="cam" type="file" accept="image/*" capture="environment" hidden onchange="scanFile(this.files[0]);this.value=''"><input id="gal" type="file" accept="image/*" hidden onchange="scanFile(this.files[0]);this.value=''"><p class="muted" style="margin:10px 0 0">Photos are stored on this device and work offline. After each scan, check the details and save to your books.</p></div>`;
    if(bigId){const e=X.find(x=>x.id==bigId);if(e)h+=`<div class="card" style="margin-bottom:14px"><div class="row sp"><b>${E(e.vendor)||'Receipt'}: ${M(e.amount)}</b><button class="btn s" onclick="bigId=null;render()">Close</button></div>${e.img?`<img data-k="${e.id}" alt="Receipt" style="max-width:100%;max-height:520px;margin:10px 0;border:1px solid var(--bd);border-radius:8px">`:''}<div class="muted">${E(e.date)} · ${E(e.category)} · ${E(e.method)}${e.tax?' · Tax '+M(e.tax):''}${e.notes?'<br>'+E(e.notes):''}</div><div class="row" style="margin-top:10px"><button class="btn s" onclick="editExp('${e.id}')">Edit</button>${e.img?`<button class="btn s" onclick="saveImgFile('${e.id}')">Save photo</button>`:''}<button class="btn s d" onclick="delExp('${e.id}')">Delete</button></div></div>`}
    h+=`<div class="g" style="margin-bottom:14px"><div class="card"><small class="muted">Spent this month</small><h3 style="margin:2px 0">${M(sp(cm))}</h3></div><div class="card"><small class="muted">Spent last month</small><h3 style="margin:2px 0">${M(sp(lm))}</h3></div><div class="card"><small class="muted">Receipts stored</small><h3 style="margin:2px 0">${X.length}</h3></div></div>`;
    if(X.length){
      h+=`<div class="row sp no" style="margin-bottom:12px"><div class="row"><select style="width:auto" onchange="fm=this.value;render()"><option value="">All months</option>${months.map(m=>`<option value="${m}" ${fm==m?'selected':''}>${mlab(m)}</option>`).join('')}</select><select style="width:auto" onchange="fc=this.value;render()"><option value="">All categories</option>${[...new Set([...CATS,...X.map(e=>e.category)])].map(c=>`<option ${fc==c?'selected':''}>${E(c)}</option>`).join('')}</select></div><button class="btn" onclick="expCsv()">Export ledger (CSV)</button></div>`;
      const g={};list.forEach(e=>(g[e.date.slice(0,7)]=g[e.date.slice(0,7)]||[]).push(e));
      h+=Object.keys(g).sort().reverse().map(m=>`<div class="card wrap" style="margin-bottom:12px"><div class="row sp"><b>${mlab(m)}</b><b>${M(g[m].reduce((a,e)=>a+e.amount,0))}</b></div><table>${g[m].map(e=>`<tr><td style="width:52px">${e.img?`<img data-k="${e.id}" alt="" onclick="bigId='${e.id}';render()" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--bd);cursor:pointer;background:#f1f3f5">`:''}</td><td>${E(e.vendor)||'—'}<br><small class="muted">${E(e.date)} · ${E(e.method)}</small></td><td><span class="tag">${E(e.category)}</span></td><td style="text-align:right">${M(e.amount)}</td><td style="text-align:right;white-space:nowrap"><button class="btn s" onclick="bigId='${e.id}';render()">Open</button> <button class="btn s" onclick="editExp('${e.id}')">Edit</button></td></tr>`).join('')}</table></div>`).join('')||'<div class="card empty">No receipts match these filters.</div>';
      const cat={};list.forEach(e=>cat[e.category]=(cat[e.category]||0)+e.amount);const tot=list.reduce((a,e)=>a+e.amount,0);
      h+=`<div class="two" style="margin-top:6px"><div class="card wrap"><b>Expenses by category</b><table>${Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td>${E(c)}</td><td style="text-align:right">${M(v)}</td><td style="text-align:right" class="muted">${tot?Math.round(v/tot*100):0}%</td></tr>`).join('')}</table></div><div class="card wrap"><b>Books summary</b><table><tr><th>Month</th><th style="text-align:right">Income</th><th style="text-align:right">Expenses</th><th style="text-align:right">Net</th></tr>${allM.map(m=>`<tr><td>${mlab(m)}</td><td style="text-align:right">${M(inc(m))}</td><td style="text-align:right">${M(sp(m))}</td><td style="text-align:right"><b>${M(inc(m)-sp(m))}</b></td></tr>`).join('')}</table><small class="muted">Income counts paid invoices only, so a sale is never counted twice.</small></div></div>`;
    }else h+=`<div class="card empty">No receipts yet. Tap Scan with camera to add your first one.</div>`;
  }
  return h+`</main>`+foot;
}
