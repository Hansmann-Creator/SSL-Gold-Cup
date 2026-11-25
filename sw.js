/* Gold Cup Matchboard service worker: network first, offline fallback */
const C="gcmb-v4";
const CORE=["./","index.html","app.css","app.js","teaminfo.json","people.json","roster.json","results.json","brand/lockup.webp","brand/ssl.png","fonts/GeneralSans-Regular.woff2","fonts/GeneralSans-Medium.woff2","fonts/GeneralSans-Semibold.woff2","icons/icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
  const img=/\.(webp|png|woff2)$/.test(u.pathname);
  if(img){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp));return n})));return}
  e.respondWith(fetch(e.request).then(n=>{if(n.ok){const cp=n.clone();caches.open(C).then(c=>c.put(e.request.url.split("?")[0],cp))}return n}).catch(()=>caches.match(e.request.url.split("?")[0]).then(r=>r||caches.match("index.html"))))});
