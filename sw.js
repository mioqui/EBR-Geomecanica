const CACHE='ebr-rmr-v1-10-prueba2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png'];
// Con señal débil o intermitente (interior mina), la app no espera más de este tiempo a GitHub:
// abre la versión guardada y la actualización se descarga en segundo plano para la próxima apertura.
const ESPERA_RED_MS=3000;

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
    // Red primero, pero con límite de tiempo; si no responde a tiempo se usa la copia guardada.
    const red=fetch(request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        return caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).then(()=>response);
      }
      return response;
    });
    event.waitUntil(red.catch(()=>{})); // que la descarga termine aunque ya se haya mostrado la copia
    event.respondWith(
      caches.match('./index.html').then(guardada=>{
        if(!guardada) return red; // primera vez: no hay copia, hay que esperar a la red
        if(self.navigator&&self.navigator.onLine===false) return guardada; // sin señal: abrir al instante
        const limite=new Promise(res=>setTimeout(()=>res(guardada),ESPERA_RED_MS));
        return Promise.race([red.then(r=>r&&r.ok?r:guardada).catch(()=>guardada),limite]);
      })
    );
    return;
  }
  // Demás archivos: copia guardada al instante y actualización en segundo plano.
  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(request.method==='GET' && response && response.status===200){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      });
      if(cached){ event.waitUntil(network.catch(()=>{})); return cached; }
      return network;
    })
  );
});
