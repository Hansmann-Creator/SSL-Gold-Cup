/* Gold Cup Matchboard service worker: network first, offline fallback */
const C="gcmb-v15";
const CORE=["./","index.html","config.js","app.css","app.js","teaminfo.json","people.json","roster.json","results.json","pf.json","sched.json","brand/lockup.webp","brand/ssl.png","fonts/GeneralSans-Regular.woff2","fonts/GeneralSans-Medium.woff2","fonts/GeneralSans-Semibold.woff2","icons/icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
  const img=/\.(webp|png|woff2)$/.test(u.pathname);
  /* images: cached copy at once, refreshed in the background (stale-while-revalidate), so a replaced portrait shows up on the next visit */
  if(img){e.respondWith(caches.open(C).then(c=>c.match(e.request).then(r=>{const f=fetch(e.request).then(n=>{if(n.ok)c.put(e.request,n.clone());return n}).catch(()=>r);if(r){e.waitUntil(f.catch(()=>{}));return r}return f})));return}
  e.respondWith(fetch(new Request(e.request.url,{cache:"no-cache",credentials:"same-origin"})).then(n=>{if(n.ok){const cp=n.clone();caches.open(C).then(c=>c.put(e.request.url.split("?")[0],cp))}return n}).catch(()=>caches.match(e.request.url.split("?")[0]).then(r=>r||caches.match("index.html"))))});
