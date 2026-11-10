// ANDIsGREENed Service Worker 5.5.0
// Nur die App-Oberfläche wird zwischengespeichert. Wetter- und Such-APIs (andere Hosts) laufen immer direkt ins Netz.
// Updates: Die Oberfläche (index.html) wird bei jedem Start im Hintergrund neu geladen. Enthält sie eine andere
// APP_VERSION als die angezeigte Seite, zeigt die Seite „Neue Version verfügbar“. SW_VERSION nur erhöhen, wenn sich
// diese Datei, das Manifest oder die Icons ändern.
const SW_VERSION = "5.5.0";
const CACHE = "andisgreened-shell-" + SW_VERSION;
const CORE = ["./", "index.html"];
const EXTRA = ["manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
const VERSION_RE = /const APP_VERSION = "([^"]+)"/;
let lastRevalidate = 0;

const versionOf = text => { const m = VERSION_RE.exec(text || ""); return m ? m[1] : null; };
async function fetchShell(){
  const res = await fetch(new Request("index.html", {cache: "no-cache"}));
  if(!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.clone().text();
  if(!versionOf(text)) throw new Error("keine App-Seite"); // z. B. WLAN-Anmeldeseite im Hotel: nicht speichern
  return {res, text};
}
async function cachedVersion(){
  const r = await (await caches.open(CACHE)).match("index.html");
  return r ? versionOf(await r.text()) : null;
}
async function storeShell(res){
  const c = await caches.open(CACHE);
  await c.put("index.html", res.clone());
  await c.put("./", res);
}

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const {res} = await fetchShell(); // schlägt das fehl, bleibt die bisherige Version aktiv
    await storeShell(res);
    const c = await caches.open(CACHE);
    await Promise.all(EXTRA.map(u => fetch(new Request(u, {cache: "reload"})).then(r => { if(r.ok) return c.put(u, r); }).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("andisgreened-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Oberfläche im Hintergrund aktualisieren (bei jedem Start, sonst höchstens einmal pro Minute) und Seiten bei neuer Version benachrichtigen
async function revalidate(force){
  if(!force && Date.now() - lastRevalidate < 60000) return;
  lastRevalidate = Date.now();
  try{
    const before = await cachedVersion();
    const {res, text} = await fetchShell();
    await storeShell(res);
    if(versionOf(text) !== before){
      for(const client of await self.clients.matchAll({type: "window"})) client.postMessage({type: "shell-updated"});
    }
  }catch(e){ /* offline oder Server nicht erreichbar: zwischengespeicherte Oberfläche bleibt */ }
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if(req.method !== "GET" || url.origin !== self.location.origin) return; // Wetter- und Such-APIs nie abfangen
  const scope = new URL(self.registration.scope);
  const isShell = req.mode === "navigate" || url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html";
  if(isShell){
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match("index.html");
      if(hit) return hit;
      try{ const {res} = await fetchShell(); await storeShell(res.clone()); return res; }
      catch(err){ return fetch(req); }
    })());
    e.waitUntil(revalidate(true)); // jeder App-Start prüft auf eine neue Oberfläche
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => {
    if(res && res.ok && url.pathname.startsWith(scope.pathname)) c.put(req, res.clone());
    return res;
  }))));
});

self.addEventListener("message", e => {
  const d = e.data || {};
  if(d.type !== "check" || !e.source) return;
  e.waitUntil((async () => {
    const v = await cachedVersion();
    e.source.postMessage({type: "check", outdated: !!(v && d.version && v !== d.version), cached: v});
    await revalidate(false);
  })());
});
