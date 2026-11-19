/* sw.js: lets E-Buks work offline. Bump CACHE when you change any file. */
const CACHE='ebuks-v12';
const FILES=["./", "index.html", "manifest.webmanifest", "assets/banners/business-books.jpg", "assets/banners/snap-receipts.jpg", "assets/logo.png", "css/app.css", "css/fonts.css", "fonts/Poppins-Bold.ttf", "fonts/Poppins-Medium.ttf", "fonts/Poppins-Regular.ttf", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "js/app.js", "js/cloud-config.js", "js/cloud.js", "js/barcode.js", "js/components.js", "js/config.js", "js/exports.js", "js/importers.js", "js/onboarding.js", "js/pages-books.js", "js/pages-clients.js", "js/pages-editor.js", "js/pages-home.js", "js/pages-products.js", "js/pages-scan.js", "js/pages-settings.js", "js/slider.js", "js/store.js", "js/utils.js", "js/whatsapp.js"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>{
    const net=fetch(r).then(res=>{if(res&&res.ok&&new URL(r.url).origin===location.origin){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res}).catch(()=>hit||(r.mode==='navigate'?caches.match('index.html'):Response.error()));
    return hit||net;
  }));
});
