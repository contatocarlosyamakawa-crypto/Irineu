// Guarda o app no celular pra abrir rápido e até sem internet.
// Sempre tenta a versão mais nova primeiro; se estiver sem internet, usa a guardada.
const CACHE='irineu-v6';
const BASE=['./','./index.html','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(BASE)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  // cache:'no-store' pula a cópia de 10 minutos do GitHub e pega sempre a versão publicada agora.
  e.respondWith(fetch(new Request(e.request.url,{cache:'no-store',credentials:'same-origin'})).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
