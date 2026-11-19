/* importers.js
   Reads product lists from Excel (.xlsx), CSV, PDF or pasted text. Everything runs on the device, offline. */
const lat=u=>{let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return s};
async function inflate(u,fmt){const r=new Blob([u]).stream().pipeThrough(new DecompressionStream(fmt));return new Uint8Array(await new Response(r).arrayBuffer())}
const num=v=>{const s=String(v??'').replace(/[^\d.,-]/g,'');if(!s)return NaN;return parseFloat(/,\d{1,2}$/.test(s)&&!/\./.test(s)?s.replace(',','.'):s.replace(/,/g,''))};
const unxml=s=>String(s).replace(/<[^>]+>/g,'').replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi,(m,c)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[c.toLowerCase()]||(c[1]=='x'?String.fromCharCode(parseInt(c.slice(2),16)):String.fromCharCode(+c.slice(1)))));
/* ---- Excel .xlsx ---- */
async function xlsxRows(buf){
  const u=new Uint8Array(buf),dv=new DataView(buf);let e=u.length-22;
  while(e>=0&&dv.getUint32(e,true)!=0x06054b50)e--;
  if(e<0)throw new Error('This is not a valid .xlsx file.');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const F={};
  for(let i=0;i<n;i++){const m=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true),nm=new TextDecoder().decode(u.subarray(p+46,p+46+nl)),st=off+30+dv.getUint16(off+26,true)+dv.getUint16(off+28,true);F[nm]=[m,u.subarray(st,st+cs)];p+=46+nl+el+cl}
  const get=async nm=>{const f=F[nm];return f?new TextDecoder().decode(f[0]==0?f[1]:await inflate(f[1],'deflate-raw')):null};
  const ss=await get('xl/sharedStrings.xml'),shared=ss?[...ss.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>[...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t=>unxml(t[1])).join('')):[];
  const sn=Object.keys(F).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a,b)=>a.length-b.length||a.localeCompare(b))[0];
  if(!sn)throw new Error('No sheet found in this workbook.');
  const rows=[];
  for(const r of (await get(sn)).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
    const row=[];
    for(const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
      const a=c[1],ref=(a.match(/\br="([A-Z]+)\d*"/)||[])[1]||'A',col=[...ref].reduce((s,ch)=>s*26+ch.charCodeAt(0)-64,0)-1,t=(a.match(/\bt="(\w+)"/)||[])[1],body=c[2]||'',v=(body.match(/<v>([\s\S]*?)<\/v>/)||[])[1];
      row[col]=t=='s'?shared[+v]:t=='inlineStr'?unxml(body):v!==undefined?unxml(v):'';
    }
    rows.push(row);
  }
  return rows;
}
/* ---- CSV ---- */
function csvRows(t){
  t=t.replace(/^\uFEFF/,'');
  const d=[',',';','\t'].map(c=>[c,(t.split('\n')[0]||'').split(c).length]).sort((a,b)=>b[1]-a[1])[0][0],rows=[];let r=[],c='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch=='"')q=true;else if(ch==d){r.push(c);c=''}
    else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;r.push(c);rows.push(r);r=[];c=''}else c+=ch}
  r.push(c);if(r.some(x=>x))rows.push(r);return rows;
}
/* ---- table rows to products (finds Name / Price / SKU / Stock columns) ---- */
function rowsToProducts(rows){
  rows=rows.filter(r=>r&&r.some(x=>String(x??'').trim()));if(!rows.length)return[];
  const h=rows[0].map(x=>String(x??'').toLowerCase()),f=re=>h.findIndex(x=>re.test(x));
  let ni=f(/name|product|item|description|desc/),pi=f(/price|rate|cost|amount|selling/);const si0=f(/sku|code|barcode|ref/),qi0=f(/qty|quantity|stock|on hand|balance/),head=ni>=0&&pi>=0;
  const si=head?si0:-1,qi=head?qi0:-1;if(!head)ni=0;
  return (head?rows.slice(1):rows).map(r=>{
    let price=head?num(r[pi]):NaN;
    if(!head){for(let k=r.length-1;k>0;k--)if(!isNaN(num(r[k]))){price=num(r[k]);break}
      if(isNaN(price)&&r.length==1){const q=textProducts(String(r[0]))[0];if(q)return q}}
    return{name:String(r[ni]??'').trim(),sku:si>=0?String(r[si]??'').trim():'',price:isNaN(price)?0:price,qty:qi>=0&&!isNaN(num(r[qi]))?num(r[qi]):''};
  }).filter(p=>p.name&&!/^total/i.test(p.name));
}
/* ---- plain text lines such as "Bread 12.50" ---- */
function textProducts(t){
  return t.split(/\r?\n/).map(l=>{l=l.trim();const m=l.match(/^(.*?)[\s,:;|-]+(?:[A-Za-z$€£]{1,3}\.?\s?)?(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
    if(!m||!m[1].trim())return null;const price=num(m[2]);return isNaN(price)?null:{name:m[1].replace(/[\t|]+/g,' ').trim(),sku:'',price,qty:''}}).filter(Boolean);
}
const pasteParse=v=>v.includes('\t')?rowsToProducts(csvRows(v)):textProducts(v);
/* ---- PDF (best effort: text based PDFs only) ---- */
function a85(u){const s=lat(u).replace(/^\s*<~/,'').replace(/~>[\s\S]*$/,'').replace(/\s/g,''),o=[];let g=[];
  for(const ch of s){if(ch=='z'&&!g.length){o.push(0,0,0,0);continue}g.push(ch.charCodeAt(0)-33);
    if(g.length==5){let v=0;for(const x of g)v=v*85+x;o.push(v>>>24&255,v>>>16&255,v>>>8&255,v&255);g=[]}}
  if(g.length>1){const n=g.length;while(g.length<5)g.push(84);let v=0;for(const x of g)v=v*85+x;[v>>>24&255,v>>>16&255,v>>>8&255,v&255].slice(0,n-1).forEach(x=>o.push(x))}
  return new Uint8Array(o)}
function cmapParse(t,cm){
  const u=h=>{let s='';for(let i=0;i+3<h.length+1;i+=4)s+=String.fromCharCode(parseInt(h.substr(i,4),16));return s};
  for(const b of t.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))for(const m of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g))cm[parseInt(m[1],16)]=u(m[2]);
  for(const b of t.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))for(const m of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)){const lo=parseInt(m[1],16),hi=parseInt(m[2],16),d=parseInt(m[3],16);for(let k=lo;k<=hi&&k-lo<512;k++)cm[k]=String.fromCharCode(d+k-lo)}
}
function contentText(t,cm){
  const re=/\((?:\\[\s\S]|[^\\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|[-+]?\d*\.?\d+|[A-Za-z*'"]+/g,isS=x=>x[0]=='('||x[0]=='<',hasCm=Object.keys(cm).length>0;
  const str=x=>{if(x[0]=='(')return x.slice(1,-1).replace(/\\([nrtbf()\\]|[0-7]{1,3})/g,(_,c)=>({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'}[c]||(/^[0-7]/.test(c)?String.fromCharCode(parseInt(c,8)):c)));
    const h=x.slice(1,-1).replace(/\s/g,'');let o='';if(hasCm)for(let i=0;i<h.length;i+=4){const c=parseInt(h.substr(i,4),16);o+=cm[c]!==undefined?cm[c]:''}else for(let i=0;i<h.length;i+=2)o+=String.fromCharCode(parseInt(h.substr(i,2),16));return o};
  let out='',st=[],arr=null,ly=null,pend='',m;
  while((m=re.exec(t))){const k=m[0];
    if(k=='['){arr=[];continue}if(k==']'){st.push(arr||[]);arr=null;continue}
    if(isS(k)||/^[-+]?\d*\.?\d+$/.test(k)){(arr||st).push(k);continue}
    if(k=='Tj'||k=="'"||k=='"'){if(k!='Tj')pend='\n';out+=pend+str(st.pop()||'()');pend=''}
    else if(k=='TJ'){out+=pend+(st.pop()||[]).map(x=>isS(x)?str(x):(+x<-200?' ':'')).join('');pend=''}
    else if(k=='Td'||k=='TD'){pend='';out+=Math.abs(+st[st.length-1])>0.5?'\n':'\t'}
    else if(k=='Tm'){pend='';const y=+st[st.length-1];out+=ly!==null&&Math.abs(y-ly)>0.5?'\n':(out&&!out.endsWith('\n')?'\t':'');ly=y}
    else if(k=='T*')pend='\n';
    else if(k=='ET')pend='';
    st=[];
  }
  return out;
}
async function pdfText(buf){
  const u=new Uint8Array(buf),s=lat(u),re=/\d+ 0 obj((?:(?!endobj)[\s\S]){0,800}?)stream\r?\n/g,cm={},txt=[];let m;
  while((m=re.exec(s))){const a=re.lastIndex,b=s.indexOf('endstream',a);if(b<0)break;let d=u.subarray(a,b);re.lastIndex=b;
    if(/ASCII85Decode/.test(m[1]))d=a85(d);
    if(/FlateDecode/.test(m[1])){let e=d.length;while(e>0&&(d[e-1]==10||d[e-1]==13))e--;try{d=await inflate(d.subarray(0,e),'deflate')}catch(x){continue}}
    const t=lat(d);if(/beginbf(char|range)/.test(t))cmapParse(t,cm);else if(/\bBT\b/.test(t))txt.push(t);}
  return txt.map(t=>contentText(t,cm)).join('\n');
}
/* ---- file entry point ---- */
async function importFile(f){
  if(!f)return;const n=f.name.toLowerCase();let list=[];
  try{const buf=await f.arrayBuffer();
    if(n.endsWith('.xlsx'))list=rowsToProducts(await xlsxRows(buf));
    else if(n.endsWith('.pdf'))list=textProducts(await pdfText(buf));
    else if(n.endsWith('.xls'))throw new Error('Old .xls files are not supported. Save the sheet as .xlsx or .csv and try again.');
    else list=rowsToProducts(csvRows(new TextDecoder().decode(buf)));
  }catch(e){alert(e.message||'Could not read that file.');return}
  if(!list.length){alert(n.endsWith('.pdf')?'No products found in this PDF. Scanned or protected PDFs cannot be read. Use Excel or CSV, or copy the list and use Paste list.':'No products found. Use columns named Name and Price (optional: SKU, Stock).');return}
  imp=list;render();
}
