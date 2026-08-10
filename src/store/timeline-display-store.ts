import { create } from "zustand";

const SETTINGS_KEY = "drugucopia-timeline-display-settings";

export type DisplayMode = "separate" | "overlay" | "normalized";
export type RedoseCombining = "individual" | "cumulative";
export type SubstanceHeight = "independent" | "normalized";
export type CurveStyle = "smooth" | "stepped";
export type OpacityValue = 0.4 | 0.6 | 0.8 | 1.0;

export interface TimelineDisplaySettings {
  displayMode: DisplayMode;
  redoseCombining: RedoseCombining;
  substanceHeight: SubstanceHeight;
  showPhaseBands: boolean;
  showNightBands: boolean;
  showNowIndicator: boolean;
  curveStyle: CurveStyle;
  opacity: OpacityValue;
  showGridLines: boolean;
}

const DEFAULT_SETTINGS: TimelineDisplaySettings = {
  displayMode: "separate",
  redoseCombining: "individual",
  substanceHeight: "independent",
  showPhaseBands: true,
  showNightBands: true,
  showNowIndicator: true,
  curveStyle: "smooth",
  opacity: 1.0,
  showGridLines: true,
};

function loadSettings(): TimelineDisplaySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      opacity: [0.4, 0.6, 0.8, 1.0].includes(parsed.opacity) ? parsed.opacity : 1.0,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: TimelineDisplaySettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota errors */
  }
}

interface TimelineDisplayState {
  settings: TimelineDisplaySettings;
  isLoaded: boolean;
  initialize: () => (() => void) | void;
  updateSettings: (patch: Partial<TimelineDisplaySettings>) => void;
  resetToDefaults: () => void;
}

export const useTimelineDisplayStore = create<TimelineDisplayState>(
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
                opacity: [0.4, 0.6, 0.8, 1.0].includes(parsed.opacity) ? parsed.opacity : 1.0,
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
      // Validate opacity
      if (patch.opacity !== undefined) {
        next.opacity = [0.4, 0.6, 0.8, 1.0].includes(patch.opacity) ? patch.opacity : 1.0;
      }
      // Validate displayMode
      if (patch.displayMode !== undefined) {
        next.displayMode = ["separate", "overlay", "normalized"].includes(patch.displayMode)
          ? patch.displayMode
          : "separate";
      }
      // Validate redoseCombining
      if (patch.redoseCombining !== undefined) {
        next.redoseCombining = ["individual", "cumulative"].includes(patch.redoseCombining)
          ? patch.redoseCombining
          : "individual";
      }
      // Validate substanceHeight
      if (patch.substanceHeight !== undefined) {
        next.substanceHeight = ["independent", "normalized"].includes(patch.substanceHeight)
          ? patch.substanceHeight
          : "independent";
      }
      // Validate curveStyle
      if (patch.curveStyle !== undefined) {
        next.curveStyle = ["smooth", "stepped"].includes(patch.curveStyle)
          ? patch.curveStyle
          : "smooth";
      }
      persistSettings(next);
      set({ settings: next });
    },

    resetToDefaults: () => {
      persistSettings(DEFAULT_SETTINGS);
      set({ settings: DEFAULT_SETTINGS });
    },
  })
);