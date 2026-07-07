// IMP Service Worker — offline support for shell pages
const CACHE = 'imp-v1'
const OFFLINE_URLS = ['/', '/auth/login']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))
})
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('googleapis') || e.request.url.includes('script.google')) return // never cache GAS calls
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone()
      caches.open(CACHE).then(c => c.put(e.request, clone))
      return res
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  )
})
