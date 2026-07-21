self.addEventListener('push', (event) => {
  let data = { title: 'دستیار خودرو', body: '' };
  try { data = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'دستیار خودرو', {
      body: data.body || '',
      icon: '/icon.png',
      dir: 'rtl',
      lang: 'fa',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/dashboard'));
});
