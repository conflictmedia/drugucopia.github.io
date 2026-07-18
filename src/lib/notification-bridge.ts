/**
 * Web Notification Bridge
 *
 * Unified notification interface using the browser Notification API.
 * Handles both direct Notification API and Service Worker paths.
 */

import type { ActiveReminder } from "@/types";

// ─── Runtime detection ─────────────────────────────────────────────────────────

export function isTauri(): boolean {
  return false; // Web-only build
}

// ─── Unified notification API ──────────────────────────────────────────────────

export type NotificationPermissionStatus = "granted" | "denied" | "default";

/**
 * Request notification permission.
 * Uses the browser Notification API.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === "undefined" || !("Notification" in window))
    return "denied";
  return Notification.requestPermission() as unknown as NotificationPermissionStatus;
}

/**
 * Check if notification permission is currently granted.
 */
export async function checkNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === "undefined" || !("Notification" in window))
    return "denied";
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Show a notification with an arbitrary title and body.
 * Uses Service Worker if available, otherwise direct Notification API.
 *
 * `tag` — optional stable notification tag. When the same tag is reused
 * across calls, the OS / browser REPLACES the prior notification instead
 * of stacking a new one. This is critical for timeline updates: without a
 * stable tag, every phase check spawns a brand-new notification that
 * piles up in the shade (perceived as "spam" on every page navigation).
 * When omitted, a unique tag is generated (legacy behavior).
 */
export async function sendGenericNotification(
  title: string,
  body: string,
  tag?: string,
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notifTag = tag || `timeline-${Date.now()}`;

  // Try Service Worker first for PWA/background notifications
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: {
        title,
        body,
        tag: notifTag,
        icon: "/logo.png",
      },
    });
    return;
  }

  // Fallback to direct Notification API
  try {
    // `tag` causes replacement instead of stacking
    new Notification(title, {
      body,
      tag: notifTag,
      icon: "/logo.png",
      renotify: false,
    } as NotificationOptions);
  } catch (e) {
    console.warn("[notification-bridge] Notification API failed:", e);
  }
}

/**
 * Show a notification for a fired reminder.
 * Uses the browser Notification API (with SW if available).
 */
export async function showNotification(
  reminder: ActiveReminder,
  customMessage?: string,
): Promise<void> {
  const title = `${reminder.substanceName} Reminder`;
  const body = customMessage || `Time for your next dose of ${reminder.substanceName}`;

  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: {
        title,
        body,
        tag: `reminder-${reminder.id}`,
        icon: "/logo.png",
        data: { reminderId: reminder.id },
      },
    });
    return;
  }

  try {
    new Notification(title, {
      body,
      tag: `reminder-${reminder.id}`,
      icon: "/logo.png",
    });
  } catch (e) {
    console.warn("[notification-bridge] showNotification failed:", e);
  }
}

/**
 * Whether the app should use its own sound playback.
 * In web, we use custom sound playback.
 */
export function shouldPlayWebSound(): boolean {
  return true;
}

/**
 * Whether the app should attempt Service Worker registration.
 * In web/PWA, yes.
 */
export function shouldRegisterServiceWorker(): boolean {
  return true;
}