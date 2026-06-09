'use client'

import { useEffect } from 'react'
import { useReminderStore } from '@/store/reminder-store'
import { startReminderEngine, stopReminderEngine } from '@/lib/reminder-engine'
import { preloadReminderSound } from '@/lib/sound-utils'

/**
 * Client-only provider that initializes the reminder store,
 * starts the engine tick loop, and registers the Service Worker.
 * Wrap your app (or just the main content) with this provider.
 */
export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const initialize = useReminderStore((s) => s.initialize)

  useEffect(() => {
    // 1. Initialize store from localStorage
    const cleanup = initialize()

    // 2. Start the reminder engine (1-second tick loop)
    startReminderEngine()

    // 3. Register Service Worker for background notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        // SW registration failure is non-critical — in-app reminders still work
        console.warn('SW registration failed (reminders still work in-app):', err?.message)
      })
    }

    // 4. Preload notification sound on first user interaction
    //    (browsers require user gesture before allowing audio playback)
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
    }
  }, [initialize])

  return <>{children}</>
}
