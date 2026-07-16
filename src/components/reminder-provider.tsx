'use client'

import { useEffect, useState } from 'react'
import { useReminderStore } from '@/store/reminder-store'
import { startReminderEngine, stopReminderEngine } from '@/lib/reminder-engine'
import { preloadReminderSound } from '@/lib/sound-utils'

/** Initializes reminders and owns the production service-worker lifecycle. */
export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const initialize = useReminderStore((s) => s.initialize)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    const cleanup = initialize()
    startReminderEngine()

    let removeServiceWorkerListeners: (() => void) | undefined

    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        let refreshing = false
        const onControllerChange = () => {
          if (refreshing) return
          refreshing = true
          window.location.reload()
        }
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

        void navigator.serviceWorker.register('/sw.js').then((registration) => {
          if (registration.waiting) setWaitingWorker(registration.waiting)

          const onUpdateFound = () => {
            const installing = registration.installing
            if (!installing) return
            const onStateChange = () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(installing)
              }
            }
            installing.addEventListener('statechange', onStateChange)
          }
          registration.addEventListener('updatefound', onUpdateFound)
          removeServiceWorkerListeners = () => {
            registration.removeEventListener('updatefound', onUpdateFound)
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
          }
        }).catch((err) => {
          navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
          console.warn('SW registration failed (reminders still work in-app):', err?.message)
        })
      } else {
        // Clean up workers/caches left by an older development session. If a
        // worker controlled this load, reload exactly once after unregistering
        // so subsequent Turbopack requests bypass it.
        void (async () => {
          const wasControlled = Boolean(navigator.serviceWorker.controller)
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((registration) => registration.unregister()))
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys
              .filter((key) => key.startsWith('drugucopia-'))
              .map((key) => caches.delete(key)))
          }
          const reloadKey = 'drugucopia-dev-sw-cleanup'
          if (wasControlled && sessionStorage.getItem(reloadKey) !== 'done') {
            sessionStorage.setItem(reloadKey, 'done')
            window.location.reload()
          } else if (!wasControlled) {
            sessionStorage.removeItem(reloadKey)
          }
        })()
      }
    }

    const onFirstInteraction = () => {
      preloadReminderSound()
      document.removeEventListener('click', onFirstInteraction)
      document.removeEventListener('keydown', onFirstInteraction)
    }
    document.addEventListener('click', onFirstInteraction)
    document.addEventListener('keydown', onFirstInteraction)

    return () => {
      stopReminderEngine()
      cleanup?.()
      removeServiceWorkerListeners?.()
      document.removeEventListener('click', onFirstInteraction)
      document.removeEventListener('keydown', onFirstInteraction)
    }
  }, [initialize])

  const applyUpdate = () => waitingWorker?.postMessage({ type: 'SKIP_WAITING' })

  return (
    <>
      {children}
      {waitingWorker && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[100] flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-xl"
        >
          <p className="text-sm">An update is ready. Apply it when you have finished editing.</p>
          <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={applyUpdate}>
            Update
          </button>
        </div>
      )}
    </>
  )
}
