/* slider.js
   Default promo slider on the home hero. The banners are fixed files in assets/banners/ and cannot be
   changed by the app user. To change them, replace the image files or edit BANNERS below. */
const BANNERS=[
  {src:'assets/banners/business-books.jpg',alt:'So simple even Gogo use it. Business books: quotations, invoices, receipts and more.',go:''},
  {src:'assets/banners/snap-receipts.jpg',alt:'Track your spending. Snap your receipts.',go:'scan'}
];
let sl=0,slTimer=null,slX=0;
function sliderHTML(){
  const track=BANNERS.map(b=>`<div class="sli"><img src="${b.src}" alt="${E(b.alt)}" ${b.go?`style="cursor:pointer" onclick="location.hash='${b.go}'"`:''}></div>`).join('');
  const ctl=`<button class="sln" style="left:8px" aria-label="Previous slide" onclick="slGo(sl-1);initSlider()">‹</button><button class="sln" style="right:8px" aria-label="Next slide" onclick="slGo(sl+1);initSlider()">›</button><div class="sldw">${BANNERS.map((_,k)=>`<button class="sld ${k==sl?'on':''}" aria-label="Slide ${k+1}" onclick="slGo(${k});initSlider()"></button>`).join('')}</div>`;
  return`<div class="sl" ontouchstart="slX=event.touches[0].clientX" ontouchend="const d=event.changedTouches[0].clientX-slX;if(Math.abs(d)>40){slGo(sl+(d<0?1:-1));initSlider()}"><div class="slt" id="slt" style="transform:translateX(-${sl*100}%)">${track}</div>${ctl}</div>`;
}
function slGo(i){const t=$('#slt');if(!t)return;const n=t.children.length;sl=(i+n)%n;t.style.transform=`translateX(-${sl*100}%)`;document.querySelectorAll('.sld').forEach((d,k)=>d.classList.toggle('on',k==sl))}
function initSlider(){clearInterval(slTimer);const t=$('#slt');if(!t||t.children.length<2)return;slTimer=setInterval(()=>slGo(sl+1),5000)}
