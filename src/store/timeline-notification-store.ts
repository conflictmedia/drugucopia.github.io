import { create } from "zustand";

const SETTINGS_KEY = "drugucopia-timeline-notification-settings";

export interface TimelineNotificationSettings {
  enabled: boolean;
  reappearAfterSwipe: boolean;
  notificationCooldownMinutes: number;
  showOnPhaseChangeOnly: boolean;
  showOnForeground: boolean;
  checkIntervalMinutes: number;
}

const DEFAULT_SETTINGS: TimelineNotificationSettings = {
  enabled: true,
  reappearAfterSwipe: false,
  notificationCooldownMinutes: 5,
  showOnPhaseChangeOnly: true,
  showOnForeground: true,
  checkIntervalMinutes: 30,
};

function loadSettings(): TimelineNotificationSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notificationCooldownMinutes: Math.max(1, Math.min(60, parsed.notificationCooldownMinutes ?? 1)),
      checkIntervalMinutes: Math.max(15, Math.min(10080, parsed.checkIntervalMinutes ?? 30)),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: TimelineNotificationSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota errors */
  }
}

interface TimelineNotificationState {
  settings: TimelineNotificationSettings;
  isLoaded: boolean;
  initialize: () => (() => void) | void;
  updateSettings: (patch: Partial<TimelineNotificationSettings>) => void;
}

export const useTimelineNotificationStore = create<TimelineNotificationState>(
  (set, get) => ({
    settings: DEFAULT_SETTINGS,
    isLoaded: false,

    initialize: () => {
      if (get().isLoaded) return;

      const settings = loadSettings();
      set({ settings, isLoaded: true });

      // Cross-tab sync
      const onStorage = (e: StorageEvent) => {
        if (e.key === SETTINGS_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            set({
              settings: {
                ...DEFAULT_SETTINGS,
                ...parsed,
                notificationCooldownMinutes: Math.max(1, Math.min(60, parsed.notificationCooldownMinutes ?? 1)),
                checkIntervalMinutes: Math.max(15, Math.min(10080, parsed.checkIntervalMinutes ?? 30)),
              },
            });
          } catch {}
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },

    updateSettings: (patch) => {
      const next = { ...get().settings, ...patch };
      // Clamp cooldown to 1-60 minutes
      if (patch.notificationCooldownMinutes !== undefined) {
        next.notificationCooldownMinutes = Math.max(1, Math.min(60, patch.notificationCooldownMinutes));
      }
      // Clamp check interval to 15-10080 minutes (1 week)
      if (patch.checkIntervalMinutes !== undefined) {
        next.checkIntervalMinutes = Math.max(15, Math.min(10080, patch.checkIntervalMinutes));
      }
      persistSettings(next);
      set({ settings: next });
    },
  })
);