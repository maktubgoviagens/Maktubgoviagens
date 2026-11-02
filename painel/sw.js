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

// Lembrete da fatura: chega às 10h do dia do vencimento e abre o painel ao tocar.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Maktub Go', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Maktub Go', {
    body: d.body || '',
    icon: '/ativos/app-icon-192.png',
    badge: '/ativos/app-icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || '/painel/' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/painel/', self.location.origin).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.includes('/painel/') && 'focus' in c) { await c.focus(); if ('navigate' in c) return c.navigate(url); return; }
    }
    return self.clients.openWindow(url);
  })());
});
