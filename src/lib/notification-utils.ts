/**
 * Pure notification utility — no store dependencies.
 * Used by both reminder-store.ts and reminder-engine.ts to avoid circular imports.
 */

import type { ActiveReminder } from '@/types'

/**
 * Show a browser notification for a fired reminder.
 * Tries Service Worker first (works when tab is backgrounded),
 * falls back to direct Notification API (foreground only).
 */
export function showBrowserNotification(
  reminder: ActiveReminder,
  customMessage?: string,
): void {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return

  const permission = Notification.permission
  if (permission !== 'granted') return

  const title = `${reminder.substanceName} Reminder`
  const body =
    customMessage ||
    `Time for your next dose of ${reminder.substanceName}`

  // Try Service Worker notification first (works when tab is backgrounded)
  if (
    'serviceWorker' in navigator &&
    navigator.serviceWorker.controller
  ) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title,
        body,
        tag: `reminder-${reminder.id}`,
        icon: '/logo.png',
        data: { reminderId: reminder.id },
      },
    })
  } else {
    // Fallback: direct Notification API (only works when tab is focused)
    try {
      new Notification(title, {
        body,
        tag: `reminder-${reminder.id}`,
        icon: '/logo.png',
      })
    } catch {
      // Notification API may not be available in all contexts
    }
  }
}

/**
 * Request browser notification permission.
 * Returns the permission result.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied'
  if (!('Notification' in window)) return 'denied'

  const result = await Notification.requestPermission()
  return result
}

/**
 * Format remaining time in a human-readable string.
 * e.g., "2h 34m", "45m", "30s"
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'Now'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Format an interval (in minutes) into a human-readable string.
 * e.g., "4 hours", "30 minutes", "1h 30m"
 */
export function formatIntervalMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (remaining === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`
  return `${hours}h ${remaining}m`
}
