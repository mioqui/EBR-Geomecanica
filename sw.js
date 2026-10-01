const CACHE='ebr-rmr-v1-0-dict4';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
          return response;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(request.method==='GET' && response && response.status===200){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});
