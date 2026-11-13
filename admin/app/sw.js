// Maktub Go: service worker do app da operação. Recebe os avisos e abre a tela certa ao tocar.
// Não guarda dados em cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Sempre busca a versão mais nova do app ao abrir (evita o celular mostrar uma versão antiga guardada).
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() => fetch(e.request)));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Maktub Go', body: e.data ? e.data.text() : '' }; }
  // check-in pendente toca como alarme: vibra mais, fica na tela até alguém tocar e não chega em silêncio.
  // (no Android e no computador; no iPhone o sistema não deixa a notificação de um app da web tocar diferente)
  const alarme = /^checkin/.test(d.tag || '');
  e.waitUntil(self.registration.showNotification(d.title || 'Maktub Go', {
    body: d.body || '',
    icon: '/ativos/app-icon-192.png',
    badge: '/ativos/app-icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || '/admin/app/' },
    ...(alarme ? { requireInteraction: true, renotify: !!d.tag, silent: false, vibrate: [600, 200, 600, 200, 600, 200, 1200] } : {})
  }));
});

const pedirAoApp = (c, url) => new Promise((ok) => {
  const canal = new MessageChannel(), t = setTimeout(() => ok(false), 1500);
  canal.port1.onmessage = () => { clearTimeout(t); ok(true); };
  try { c.postMessage({ tipo: 'abrir', url }, [canal.port2]); } catch (_) { clearTimeout(t); ok(false); }
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/admin/app/', self.location.origin).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.includes('/admin/app/') && 'focus' in c) {
        await c.focus();
        // app aberto: ele mesmo troca de tela, pelo caminho que pergunta antes de sair de um formulário preenchido.
        // Versão antiga do app, que não responde: abre a tela como antes.
        if (await pedirAoApp(c, url)) return;
        if ('navigate' in c) return c.navigate(url);
        return;
      }
    }
    return self.clients.openWindow(url);
  })());
});
