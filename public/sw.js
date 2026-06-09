self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon, data } = event.data.payload
    self.registration.showNotification(title, {
      body,
      tag,
      icon: icon || '/logo.png',
      data,
      requireInteraction: true,
      vibrate: [200, 100, 200],
    })
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Focus or open the app
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        if (clients.length > 0) {
          clients[0].focus()
        } else {
          self.clients.openWindow('/')
        }
      }),
  )
})
