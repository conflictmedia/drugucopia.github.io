/**
 * Timeline Live Notification Engine (Web Version)
 *
 * Maintains notifications for each active dose, updated when the phase changes.
 * Uses the browser Notification API with tagged replacement to avoid spam.
 * On PWA/Android, uses Service Worker for persistent notifications.
 */

import { useDoseStore } from "@/store/dose-store";
import { useTimelineNotificationStore } from "@/store/timeline-notification-store";
import {
  parseDurationToMinutes,
  calculatePhaseTimings,
  intensityAt,
} from "@/components/dose-timeline/dose-timeline-utils";
import { sendGenericNotification, checkNotificationPermission, requestNotificationPermission } from "./notification-bridge";
import type { DoseLog } from "@/types";
import type { PhaseTimings } from "@/components/dose-timeline/dose-timeline-types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = "onset" | "comeup" | "peak" | "offset" | "ended";

/** DoseLog with extra timing fields used only inside the notification engine */
interface NotifDose extends DoseLog {
  _timings: PhaseTimings;
  _elapsed: number;
}

// ─── State ─────────────────────────────────────────────────────────────────────

let intervalId: ReturnType<typeof setInterval> | null = null;
let doseUnsub: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;

/** Last known phase per substance key — used to detect phase transitions */
const lastPhase = new Map<string, Phase>();

/** Last notification sent timestamp per substance key (for cooldown) */
const lastNotificationSent = new Map<string, number>();

/** Notification count per substance per hour (for spam protection) */
const notificationCountPerHour = new Map<
  string,
  { count: number; windowStart: number }
>();

/**
 * Whether the engine has completed its initial "priming" pass.
 *
 * PRIMING: On the very first `checkAndUpdate` call after the module loads
 * (i.e. on every full page reload), we observe the current phase of every
 * active substance and store it in `lastPhase` WITHOUT sending any
 * notifications. Without this, the first check would see
 * `prevPhase = undefined` for every substance, treat that as a "phase
 * change" (undefined → current), and fire a notification for every active
 * dose on every page navigation — which is the spam the user reported.
 *
 * After priming, subsequent checks (interval, visibility, dose-store
 * subscription) compare against the primed `lastPhase` and only fire on
 * REAL phase changes.
 */
let hasPrimed = false;

/**
 * localStorage keys for persisting notification state across page reloads.
 *
 * On a static-export Next.js app, every full page reload re-evaluates the
 * JS module and wipes module-level state. Without persistence, the cooldown
 * timer resets on every navigation, so the user gets a notification every
 * time they browse to a new page even if they just got one seconds ago.
 *
 * `lastNotificationSent` is persisted to localStorage (not sessionStorage)
 * so the cooldown survives app close/reopen on mobile. We prune entries
 * older than 1 hour on load to prevent unbounded growth.
 */
const COOLDOWN_STORAGE_KEY = "drugucopia-timeline-cooldown";

/** Prune cooldown entries older than this (1 hour) on load. */
const COOLDOWN_MAX_AGE_MS = 60 * 60 * 1000;

/** Load persisted cooldown timestamps from localStorage. */
function loadCooldownState(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    let changed = false;
    for (const [key, ts] of Object.entries(parsed)) {
      if (typeof ts === "number" && now - ts < COOLDOWN_MAX_AGE_MS) {
        lastNotificationSent.set(key, ts);
      } else {
        changed = true; // stale entry, will be pruned on next save
      }
    }
    if (changed) persistCooldownState();
  } catch {
    // ignore parse errors
  }
}

/** Persist cooldown timestamps to localStorage. */
function persistCooldownState(): void {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, number> = {};
    const now = Date.now();
    for (const [key, ts] of lastNotificationSent) {
      if (now - ts < COOLDOWN_MAX_AGE_MS) {
        obj[key] = ts;
      }
    }
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore quota errors
  }
}

/** Track visibility state to pause notifications when app is backgrounded */
let isVisible = true;

/**
 * Timestamp when app was last hidden (for ignoring quick navigation transitions).
 *
 * Initialized to `Date.now()` rather than `0` so that the 2-second threshold
 * in the visibilitychange handler works correctly from the very first event.
 * With `0`, `Date.now() - 0` is ~1.7 trillion ms, which always exceeds the
 * threshold — meaning the "ignore quick transitions" guard never suppressed
 * spurious events during Next.js client-side navigation, causing notification
 * spam on every page change.
 */
let hiddenAt = Date.now();

/**
 * Previous `document.hidden` value, used to detect ACTUAL visibility state
 * transitions. The `visibilitychange` event can fire spuriously on some
 * platforms during Next.js client-side navigation WITHOUT `document.hidden`
 * actually changing. By comparing the previous and current values, we can
 * ignore those spurious events entirely.
 */
let prevDocumentHidden = false;

/**
 * Previous dose IDs — used by the dose-store subscription to detect actual
 * additions/removals instead of firing on every store update.
 *
 * NOTE: This used to be a `useRef` inside `startTimelineNotifications()`, but
 * that violated the Rules of Hooks (calling a hook inside a non-component
 * function) and threw React error #321 ("Invalid hook call. Hooks can only
 * be called inside of the body of a function component."), which crashed
 * the app on every launch and produced a remount loop. It is now a plain
 * module-level variable, which is the correct pattern for state that lives
 * outside React's render cycle.
 */
let prevDoseIds: string[] = [];

const PHASE_DISPLAY: Record<Phase, string> = {
  onset: "Onset",
  comeup: "Come-up",
  peak: "Peak",
  offset: "Offset",
  ended: "Ended",
};

const PHASE_EMOJI: Record<Phase, string> = {
  onset: "🔸",
  comeup: "📈",
  peak: "⚡",
  offset: "📉",
  ended: "✅",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getCurrentPhase(
  elapsedMins: number,
  timings: ReturnType<typeof calculatePhaseTimings>,
): Phase {
  if (elapsedMins >= timings.offsetEnd) return "ended";
  if (elapsedMins >= timings.peakEnd) return "offset";
  if (elapsedMins >= timings.comeupEnd) return "peak";
  if (elapsedMins >= timings.onsetEnd) return "comeup";
  return "onset";
}

/** Generate a stable notification ID from a substance name */
function substanceId(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 10000) + 1000; // 1000–10999 range
}

/** Safely parse duration string, handling non-string values */
function safeParseDurationToMinutes(val: unknown): number {
  if (typeof val === "string") return parseDurationToMinutes(val);
  if (typeof val === "number" && isFinite(val)) return val;
  return 0;
}

/** Check if we can send a notification for this substance (cooldown + spam protection) */
function canSendNotification(
  key: string,
  settings: ReturnType<typeof useTimelineNotificationStore.getState>["settings"],
): boolean {
  const now = Date.now();
  const cooldownMs = settings.notificationCooldownMinutes * 60_000;

  // Cooldown check
  const lastSent = lastNotificationSent.get(key);
  if (lastSent && now - lastSent < cooldownMs) {
    console.log(
      `[timeline-notif] Cooldown active for ${key} (${Math.round((cooldownMs - (now - lastSent)) / 1000)}s remaining)`,
    );
    return false;
  }

  // Spam protection: max 3 notifications per hour per substance
  const hourly = notificationCountPerHour.get(key);
  if (hourly) {
    if (now - hourly.windowStart < 60 * 60_000) {
      if (hourly.count >= 3) {
        console.warn(
          `[timeline-notif] SPAM PROTECTION: Max 3 notifications/hour reached for ${key}`,
        );
        return false;
      }
    } else {
      // Reset window
      notificationCountPerHour.set(key, { count: 0, windowStart: now });
    }
  } else {
    notificationCountPerHour.set(key, { count: 0, windowStart: now });
  }

  return true;
}

/** Record that a notification was sent for this substance */
function recordNotificationSent(key: string): void {
  const now = Date.now();
  lastNotificationSent.set(key, now);

  const hourly = notificationCountPerHour.get(key);
  if (hourly) {
    hourly.count += 1;
  }

  // Persist to localStorage so the cooldown survives page reloads.
  // Without this, navigating to a new page resets the cooldown and the
  // user gets another notification immediately.
  persistCooldownState();
}

// ─── Permission helper ─────────────────────────────────────────────────────────

let permissionEnsured = false;

async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionEnsured) return true;

  try {
    const current = await checkNotificationPermission().catch(() => "default" as any);

    if (current === "granted") {
      permissionEnsured = true;
      return true;
    }

    const result = await requestNotificationPermission().catch(() => "denied" as any);
    permissionEnsured = result === "granted";
    console.log("[timeline-notif] permission result:", result);
    return permissionEnsured;
  } catch (e) {
    console.warn("[timeline-notif] permission check/request failed:", e);
    return false;
  }
}

// ─── Notification dispatchers ──────────────────────────────────────────────────

async function sendOngoingNotification(
  id: number,
  title: string,
  body: string,
): Promise<void> {
  const hasPerm = await ensureNotificationPermission();
  if (!hasPerm) {
    console.warn("[timeline-notif] no permission — skipping notification", title);
    return;
  }

  // Stable per-substance tag so the OS / browser REPLACES the prior
  // notification instead of stacking a new one. Without this, every phase
  // check spawns a brand-new notification entry — which the user perceives
  // as "spam on every page navigation" because the buggy visibilitychange
  // handler was firing checkAndUpdate on every route change, and each
  // successful send created a fresh notification rather than updating the
  // existing one.
  const stableTag = `drugucopia-timeline-${id}`;

  // Use sendGenericNotification which handles both web and SW paths
  try {
    await sendGenericNotification(title, body, stableTag);
    console.log(
      "[timeline-notif] ✅ sent VISIBLE notification via sendGenericNotification:",
      title,
      body,
    );
  } catch (e) {
    console.warn("[timeline-notif] sendGenericNotification failed:", e);
  }
}

async function cancelOngoingNotification(id: number): Promise<void> {
  // Web: no way to programmatically close a notification by tag
  // Could use SW to close, but not widely supported
  console.log("[timeline-notif] cancelOngoingNotification (web no-op):", id);
}

// ─── Core ──────────────────────────────────────────────────────────────────────

async function checkAndUpdate(force = false): Promise<void> {
  try {
    // Read settings from store
    const settings = useTimelineNotificationStore.getState().settings;

    // Master toggle
    if (!settings.enabled) {
      console.log("[timeline-notif] disabled via settings — skipping");
      return;
    }

    const ds = useDoseStore.getState();
    if (!ds.isLoaded && typeof ds.initialize === "function") {
      try {
        ds.initialize();
      } catch {}
    }
    // RE-READ the state after initialize() — zustand's getState() returns
    // a snapshot, not a live reference. Without this re-read, `doses`
    // would still be the old empty array even after initialization set
    // the real doses, causing the priming logic to defer indefinitely.
    const doses = useDoseStore.getState().doses;

    // ── PRIMING ──────────────────────────────────────────────────────────
    // On the very first check after module load (i.e. after every full
    // page reload), we PRIME the `lastPhase` map with the current phase
    // of every active substance WITHOUT sending any notifications.
    //
    // Why: on a page reload, all module-level state resets. `lastPhase`
    // is empty, so `prevPhase = undefined` for every substance. Without
    // priming, `phaseChanged = (undefined !== currentPhase) = true`,
    // which fires a notification for EVERY active dose on EVERY page
    // navigation. This is the root cause of the "notification fires every
    // time you browse a page" spam.
    //
    // After priming, the first real check (interval, visibility, or dose
    // store subscription) compares against the primed phases and only
    // fires on ACTUAL phase changes.
    //
    // Note: `force=true` (manual force / new dose) bypasses priming —
    // those are explicit user actions that SHOULD send notifications.
    if (!hasPrimed && !force) {
      // If the dose store hasn't hydrated yet, DON'T prime — just return
      // and let the next check (delayed re-check, subscription, or
      // interval) try again. Priming against an empty dose list would set
      // `hasPrimed = true` with an empty `lastPhase`, and when the store
      // later hydrates, every active dose would appear as a "phase change"
      // (undefined → current) and fire a notification — the exact spam
      // we're trying to prevent.
      const freshState = useDoseStore.getState();
      if (!freshState.isLoaded || doses.length === 0) {
        console.log(
          "[timeline-notif] PRIMING deferred — dose store not yet hydrated (isLoaded=",
          freshState.isLoaded,
          "doses=",
          doses.length,
          ")",
        );
        return;
      }

      console.log(
        "[timeline-notif] PRIMING — observing current phases without sending notifications",
      );
      hasPrimed = true;

      const now0 = Date.now();
      for (const dose of doses) {
        if (!dose.duration) continue;
        const totalMins = safeParseDurationToMinutes(dose.duration.total);
        if (totalMins <= 0) continue;
        const doseTime = new Date(dose.timestamp).getTime();
        const elapsedMins = (now0 - doseTime) / 60_000;
        if (elapsedMins < 0) continue;
        const timings = calculatePhaseTimings(dose.duration);
        if (!timings || timings.totalDuration <= 0) continue;
        const phase = getCurrentPhase(elapsedMins, timings);
        const key = dose.substanceName.toLowerCase();
        lastPhase.set(key, phase);
        console.log(`[timeline-notif] PRIMED "${key}" → ${phase}`);
      }

      // Also restore the cooldown state from localStorage so the
      // cooldown survives page reloads.
      loadCooldownState();

      // Schedule a real check after a short delay. This gives the dose
      // store time to fully hydrate before we do the "real" first check.
      // If phases haven't changed during that time, no notification fires
      // (which is the correct behavior — the user just navigated, the
      // phase didn't actually change).
      setTimeout(() => {
        checkAndUpdate(false).catch(() => {});
      }, 2000);

      return;
    }

    console.log(
      "[timeline-notif] checkAndUpdate running — force=",
      force,
      "doses in store:",
      doses.length,
      "isLoaded:",
      ds.isLoaded,
      "hasPrimed:",
      hasPrimed,
    );

    // On force, clear lastPhase for substances we are about to evaluate
    if (force && doses.length > 0) {
      for (const d of doses) {
        if (d.duration) lastPhase.delete(d.substanceName.toLowerCase());
      }
    }

    const now = Date.now();

    // Group active (non-ended) doses by substance
    const substanceGroups = new Map<
      string,
      { name: string; doses: NotifDose[] }
    >();

    for (const dose of doses) {
      if (!dose.duration) continue;
      const totalMins = safeParseDurationToMinutes(dose.duration.total);
      if (totalMins <= 0) continue;

      const doseTime = new Date(dose.timestamp).getTime();
      const elapsedMins = (now - doseTime) / 60_000;
      if (elapsedMins < 0) continue;

      const timings = calculatePhaseTimings(dose.duration);
      if (!timings || timings.totalDuration <= 0) continue;
      const isEnded = elapsedMins >= timings.offsetEnd;

      const key = dose.substanceName.toLowerCase();
      if (!substanceGroups.has(key)) {
        substanceGroups.set(key, { name: dose.substanceName, doses: [] });
      }
      if (!isEnded) {
        substanceGroups.get(key)!.doses.push({ ...dose, _timings: timings, _elapsed: elapsedMins });
      }
    }

    const currentKeys = new Set<string>();

    // ── Send/update notifications for active substances ──
    for (const [key, { name, doses: groupDoses }] of substanceGroups) {
      if (groupDoses.length === 0) {
        // All doses ended — cancel notification
        const prevPhase = lastPhase.get(key);
        if (prevPhase && prevPhase !== "ended") {
          lastPhase.set(key, "ended");
          const id = substanceId(key);
          await cancelOngoingNotification(id);
        }
        continue;
      }

      currentKeys.add(key);

      // Calculate combined intensity and dominant phase
      let maxIntensity = 0;
      let dominantPhase: Phase = "onset";

      for (const d of groupDoses) {
        const timings = d._timings;
        const elapsedMins = d._elapsed;
        if (!timings || timings.totalDuration <= 0) continue;
        const progress = (elapsedMins / timings.totalDuration) * 100;
        const rawIntensity = intensityAt(progress, timings);
        const phase = getCurrentPhase(elapsedMins, timings);

        if (rawIntensity > maxIntensity) {
          maxIntensity = rawIntensity;
          dominantPhase = phase;
        }
      }

      const prevPhase = lastPhase.get(key);
      const phaseChanged = prevPhase !== dominantPhase;

      // Determine if we should send a notification
      const isRegularInterval = !force;
      const shouldSend =
        force ||
        (settings.showOnPhaseChangeOnly && phaseChanged) ||
        (!settings.showOnPhaseChangeOnly && isRegularInterval);

      // On foreground, always send if setting enabled (respects cooldown)
      const isForegroundEvent = force && settings.showOnForeground;

      // If not a phase change or force event, only send if reappearAfterSwipe is enabled
      // This controls the "reappear after swipe" behavior on regular intervals
      if (isRegularInterval && !phaseChanged && !settings.reappearAfterSwipe) {
        continue;
      }

      if (!shouldSend && !isForegroundEvent) {
        continue;
      }

      // Check cooldown and spam protection
      if (
        !canSendNotification(
          key,
          useTimelineNotificationStore.getState().settings,
        )
      ) {
        console.log(
          `[timeline-notif] Cooldown/spam protection active for ${key}`,
        );
        continue;
      }

      // Send notification
      const emoji = PHASE_EMOJI[dominantPhase];
      const display = PHASE_DISPLAY[dominantPhase];
      const title = `${emoji} ${name} — ${display}`;
      const body = `Intensity: ${Math.round(maxIntensity)}% — tap for details`;

      const id = substanceId(key);
      await sendOngoingNotification(id, title, body);
      recordNotificationSent(key);
      lastPhase.set(key, dominantPhase);
    }

    // Cancel notifications for substances that are no longer active
    for (const key of lastPhase.keys()) {
      if (!currentKeys.has(key)) {
        const prevPhase = lastPhase.get(key);
        if (prevPhase && prevPhase !== "ended") {
          lastPhase.set(key, "ended");
          const id = substanceId(key);
          await cancelOngoingNotification(id);
        }
      }
    }
  } catch (e) {
    console.error("[timeline-notif] checkAndUpdate error:", e);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** Start the timeline notification engine */
export function startTimelineNotifications(): (() => void) | void {
  if (typeof window === "undefined") return;

  console.log("[timeline-notif] Starting timeline notification engine");

  // Load persisted cooldown state
  loadCooldownState();

  // Subscribe to dose store changes to react to new/removed doses
  const unsubscribeDose = useDoseStore.subscribe((state) => {
    const currentDoseIds = (state.doses || []).map((d: any) => d.id).sort();
    const added = currentDoseIds.filter((id: string) => !prevDoseIds.includes(id));
    const removed = prevDoseIds.filter((id: string) => !currentDoseIds.includes(id));

    if (added.length > 0 || removed.length > 0) {
      console.log(
        `[timeline-notif] Dose store change detected — added: ${added.length}, removed: ${removed.length}`,
      );
      prevDoseIds = currentDoseIds;
      // Force a check to pick up new doses
      checkAndUpdate(true).catch(() => {});
    }
  });

  doseUnsub = unsubscribeDose;

  // Initial check (will prime and schedule real check)
  checkAndUpdate(false).catch(() => {});

  // Periodic check interval (respects settings.checkIntervalMinutes)
  const updateInterval = () => {
    const settings = useTimelineNotificationStore.getState().settings;
    const intervalMs = settings.checkIntervalMinutes * 60_000;

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      if (isVisible) {
        checkAndUpdate(false).catch(() => {});
      }
    }, intervalMs);
  };

  // Initial interval setup
  updateInterval();

  // Re-read settings when they change to adjust interval
  const unsubscribeSettings = useTimelineNotificationStore.subscribe((state) => {
    if (state.settings) updateInterval();
  });

  // Visibility change handler
  const handleVisibilityChange = () => {
    // Ignore spurious events where document.hidden didn't actually change
    if (document.hidden === prevDocumentHidden) {
      console.log("[timeline-notif] visibilitychange spurious (hidden unchanged), ignoring");
      return;
    }

    const now = Date.now();
    const wasHidden = prevDocumentHidden;

    prevDocumentHidden = document.hidden;

    if (document.hidden) {
      // App went to background
      hiddenAt = now;
      isVisible = false;
      console.log("[timeline-notif] App hidden — pausing interval checks");
    } else {
      // App came to foreground
      const hiddenDuration = now - hiddenAt;
      console.log(
        `[timeline-notif] App shown (was hidden ${Math.round(hiddenDuration / 1000)}s)`,
      );

      // Ignore very quick transitions (< 2s) which are likely Next.js
      // client-side navigation, not genuine background/foreground.
      if (wasHidden && hiddenDuration < 2000) {
        console.log("[timeline-notif] Quick transition ignored (<2s)");
        isVisible = true;
        return;
      }

      isVisible = true;
      // On genuine foreground, force a check if setting enabled
      const settings = useTimelineNotificationStore.getState().settings;
      if (settings.showOnForeground) {
        checkAndUpdate(true).catch(() => {});
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  visibilityHandler = handleVisibilityChange;

  // Return cleanup function
  return () => {
    console.log("[timeline-notif] Stopping timeline notification engine");
    if (intervalId) clearInterval(intervalId);
    if (doseUnsub) doseUnsub();
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
    }
    unsubscribeSettings();
  };
}

/** Force an immediate check (useful after logging a dose or from outside) */
export async function forceTimelineCheck(): Promise<void> {
  try {
    // Make sure permission is fresh
    await ensureNotificationPermission().catch(() => {});

    await checkAndUpdate(true);

    // Belt-and-suspenders: directly send visible notifications for every currently active dose
    // using the exact same mechanism as reminders. This is the most reliable popup path.
    try {
      const ds = useDoseStore.getState();
      const active = (ds.doses || []).filter((d: any) => d.duration);
      if (active.length > 0) {
        const { sendGenericNotification } = await import("./notification-bridge");
        for (const d of active.slice(0, 3)) {
          // limit to avoid spam
          const mins = Math.max(
            0,
            Math.round((Date.now() - new Date(d.timestamp).getTime()) / 60000),
          );
          // Use a stable per-substance tag so the direct force send
          // REPLACES the existing timeline notification rather than
          // stacking on top of it.
          const forceTag = `drugucopia-timeline-${substanceId(d.substanceName.toLowerCase())}`;
          await sendGenericNotification(
            d.substanceName,
            `🔸 Active dose (${mins}m ago) — timeline running`,
            forceTag,
          );
        }
        console.log(
          "[timeline-notif] ✅ direct visible notifications sent for",
          active.length,
          "active dose(s)",
        );
      }
    } catch (e) {
      console.warn("[timeline-notif] direct active visible send failed", e);
    }
  } catch (e) {
    console.warn("[timeline-notif] forceTimelineCheck failed", e);
  }
}