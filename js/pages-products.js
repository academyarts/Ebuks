/* pages-products.js
   Products and stock: manual entry, import preview, and the helpers that fill prices into documents. */
let imp=null,pf=null,pq='',pasteOpen=false;
const pm=v=>{v=String(v||'').trim().toLowerCase();return v&&S.products.find(p=>p.name.toLowerCase()==v||(p.sku&&p.sku.toLowerCase()==v))};
const pl=()=>`<datalist id="pl">${S.products.map(p=>`<option value="${E(p.name)}" label="${E(M(p.price))}${p.qty===''?'':' · '+p.qty+' in stock'}"></option>`).join('')}</datalist>`;
const stockHint=x=>{const p=pm(x.d);return p&&p.qty!==''&&(+x.q||0)>p.qty?`<small class="muted" style="grid-column:1/-1">Only ${p.qty} in stock</small>`:''};
function pickP(i,v){const p=pm(v);if(!p)return;const x=ed.d.items[i];x.d=p.name;x.p=p.price;if(!(+x.q))x.q=1;its()}
/* invoices and receipts take stock out; editing or deleting them puts it back correctly */
function applyStock(t,d,old){
  if(t!='invoice'&&t!='receipt')return;
  const m=x=>{const r={};((x&&x.items)||[]).forEach(i=>{const p=pm(i.d);if(p&&p.qty!=='')r[p.name]=(r[p.name]||0)+(+i.q||0)});return r};
  const a=m(d),b=m(old);
  new Set([...Object.keys(a),...Object.keys(b)]).forEach(n=>{const p=S.products.find(x=>x.name==n);if(p)p.qty=(+p.qty||0)-((a[n]||0)-(b[n]||0))});
}
function saveP(){
  const p={name:pf.name.trim(),sku:(pf.sku||'').trim(),price:+pf.price||0,qty:pf.qty===''||pf.qty==null?'':+pf.qty};
  if(!p.name)return alert('Enter a product name.');
  if(pf.id)S.products[pf.id-1]=p;else S.products.push(p);save();pf=null;render();
}
const delP=i=>{if(confirm('Delete this product?')){S.products.splice(i,1);save();render()}};
function commitImp(replace){
  if(replace)S.products=imp.map(p=>({...p}));
  else imp.forEach(p=>{const o=S.products.find(x=>x.name.toLowerCase()==p.name.toLowerCase()||(p.sku&&x.sku==p.sku));
    if(o){o.price=p.price;if(p.sku)o.sku=p.sku;if(p.qty!=='')o.qty=p.qty}else S.products.push({...p})});
  save();imp=null;render();
}
function ptable(){
  const q=pq.toLowerCase(),V=S.products.map((p,i)=>({p,i})).filter(x=>!q||x.p.name.toLowerCase().includes(q)||(x.p.sku||'').toLowerCase().includes(q));
  if(!V.length)return`<div class="card empty">${S.products.length?'No products match your search.':'No products yet. Add one, import a file, or paste a list.'}</div>`;
  return`<div class="card wrap"><table><tr><th>Product</th><th>SKU</th><th style="text-align:right">Price</th><th style="text-align:right">In stock</th><th></th></tr>${V.map(({p,i})=>`<tr><td>${E(p.name)}</td><td>${E(p.sku)||'—'}</td><td style="text-align:right">${M(p.price)}</td><td style="text-align:right">${p.qty===''?'—':(p.qty<=0?'<b>Out</b>':p.qty)}</td><td style="white-space:nowrap;text-align:right"><button class="btn s" onclick="pf={...S.products[${i}],id:${i+1}};imp=null;render()">Edit</button> <button class="btn s d" onclick="delP(${i})">Delete</button></td></tr>`).join('')}</table></div>`;
}
function productsPg(){
  const f=(k,l,ty='text')=>`<div><label>${l}</label><input type="${ty}" ${ty=='number'?'step="0.01"':''} value="${E(pf[k])}" oninput="pf.${k}=this.value"></div>`;
  return nav('products')+`<main><div class="row sp" style="margin-bottom:14px"><h2 style="margin:0">Products and stock</h2><div class="row"><button class="btn p" onclick="pf={id:0,name:'',sku:'',price:'',qty:''};imp=null;render()">Add product</button><button class="btn" onclick="pasteOpen=!pasteOpen;render()">Paste list</button></div></div>`
  +`<div class="dz" style="margin-bottom:14px" ondragover="event.preventDefault();this.classList.add('ov')" ondragleave="this.classList.remove('ov')" ondrop="event.preventDefault();importFile(event.dataTransfer.files[0])" onclick="$('#pfile').click()"><input id="pfile" type="file" accept=".xlsx,.csv,.txt,.pdf" hidden onchange="importFile(this.files[0])" onclick="event.stopPropagation()"><b>Import a product list</b><span class="muted">Drop an Excel (.xlsx), CSV or PDF file here, or click to choose. Columns: Name, Price, and optionally SKU and Stock.</span></div>`
  +(pasteOpen?`<div class="card" style="margin-bottom:14px"><label>Paste one product per line, for example: Bread 12.50</label><textarea id="pt" rows="5"></textarea><div class="row" style="margin-top:10px"><button class="btn p" onclick="imp=pasteParse($('#pt').value);if(!imp.length){imp=null;alert('No products found.')}pasteOpen=false;render()">Preview</button></div></div>`:'')
  +(imp?`<div class="card" style="margin-bottom:14px"><b>${imp.length} product${imp.length==1?'':'s'} found</b><div class="muted">Check the first rows. Products with the same name are updated, not duplicated.</div><div class="wrap"><table><tr><th>Product</th><th>SKU</th><th style="text-align:right">Price</th><th style="text-align:right">Stock</th></tr>${imp.slice(0,8).map(p=>`<tr><td>${E(p.name)}</td><td>${E(p.sku)||'—'}</td><td style="text-align:right">${M(p.price)}</td><td style="text-align:right">${p.qty===''?'—':p.qty}</td></tr>`).join('')}</table></div><div class="row" style="margin-top:12px"><button class="btn p" onclick="commitImp(false)">Add to my list</button><button class="btn" onclick="commitImp(true)">Replace whole list</button><button class="btn" onclick="imp=null;render()">Cancel</button></div></div>`:'')
  +(pf?`<div class="card" style="margin-bottom:14px"><div class="g">${f('name','Product name')}${f('sku','SKU or code (optional)')}${f('price','Selling price','number')}${f('qty','Stock on hand (leave empty to not track)','number')}</div><div class="row" style="margin-top:12px"><button class="btn p" onclick="saveP()">Save product</button><button class="btn" onclick="pf=null;render()">Cancel</button></div></div>`:'')
  +`<input placeholder="Search products" value="${E(pq)}" oninput="pq=this.value;$('#ptb').innerHTML=ptable()" style="max-width:320px;margin-bottom:12px"><div id="ptb">${ptable()}</div></main>`+foot;
}
