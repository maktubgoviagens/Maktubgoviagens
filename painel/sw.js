// Maktub Go: service worker mínimo. Não guarda dados do cliente em cache.
const OFFLINE = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maktub Go</title><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a3826;color:#f9f6f1;font-family:Georgia,serif;text-align:center;padding:24px">
<div><p style="letter-spacing:.3em;font:12px sans-serif;text-transform:uppercase;color:#c9a96e">Maktub Go</p>
<h1 style="font-weight:400">Você está sem conexão.</h1><p style="font:15px sans-serif;opacity:.8">Seu painel volta assim que a internet voltar.</p></div></body></html>`;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
