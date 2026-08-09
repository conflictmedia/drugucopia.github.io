import { create } from "zustand";

export type TimelineStyle = "intensity" | "phase";

interface UIState {
  doseLoggerOpen: boolean;
  doseLoggerPreselect?: {
    substanceId?: string;
    substanceName?: string;
    category?: string | string[];
    route?: string;
  };
  openDoseLogger: (preselect?: UIState["doseLoggerPreselect"]) => void;
  closeDoseLogger: () => void;

  // Onboarding tour state
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  showOnboardingTour: () => void;
  hideOnboardingTour: () => void;

  // A1 — Favorite / pinned substances for one-tap logging.
  // Stored as a minimal denormalized snapshot so the chip row renders
  // without looking up the substance DB on every render. The user pins
  // from the dose logger; unpinning removes the entry.
  favoriteSubstances: FavoriteSubstance[];
  favoritesLoaded: boolean;
  initializeFavorites: () => void;
  toggleFavorite: (sub: FavoriteSubstance) => void;
  isFavorite: (idOrName: string) => boolean;

  // Timeline visualization style
  timelineStyle: TimelineStyle;
  timelineStyleLoaded: boolean;
  initializeTimelineStyle: () => void;
  setTimelineStyle: (style: TimelineStyle) => void;
}

export interface FavoriteSubstance {
  /** Either substances[].id or a custom slug like `custom-...` */
  id: string;
  /** Display name */
  name: string;
  /** Primary category for the chip color dot, optional */
  category?: string;
}

const FAVORITES_KEY = "drugucopia-favorite-substances";
const TIMELINE_STYLE_KEY = "drugucopia-timeline-style";

function loadFavorites(): FavoriteSubstance[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is FavoriteSubstance =>
          typeof s === "object" &&
          s !== null &&
          typeof s.id === "string" &&
          typeof s.name === "string",
      )
      .slice(0, 24); // sanity cap
  } catch {
    return [];
  }
}

function loadTimelineStyle(): TimelineStyle {
  if (typeof window === "undefined") return "intensity";
  try {
    const raw = localStorage.getItem(TIMELINE_STYLE_KEY);
    if (raw === "phase" || raw === "intensity") return raw;
    return "intensity";
  } catch {
    return "intensity";
  }
}

function persistFavorites(list: FavoriteSubstance[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
}

function persistTimelineStyle(style: TimelineStyle) {
  try {
    localStorage.setItem(TIMELINE_STYLE_KEY, style);
  } catch {
    /* ignore quota errors */
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  doseLoggerOpen: false,
  doseLoggerPreselect: undefined,

  openDoseLogger: (preselect) => {
    set({ doseLoggerOpen: true, doseLoggerPreselect: preselect });
  },

  closeDoseLogger: () => {
    set({ doseLoggerOpen: false, doseLoggerPreselect: undefined });
  },

  onboardingCompleted: false,
  setOnboardingCompleted: (completed) => {
    set({ onboardingCompleted: completed });
    if (completed) {
      localStorage.setItem('drugucopia-tour-complete', 'true');
    } else {
      localStorage.removeItem('drugucopia-tour-complete');
    }
  },
  showOnboardingTour: () => {
    set({ onboardingCompleted: false });
    localStorage.removeItem('drugucopia-tour-complete');
  },
  hideOnboardingTour: () => {
    set({ onboardingCompleted: true });
    localStorage.setItem('drugucopia-tour-complete', 'true');
  },

  // A1 — start empty on both server and client to avoid hydration
  // mismatches; loadFavorites runs inside initializeFavorites() which
  // fires from a useEffect on the client only.
  favoriteSubstances: [],
  favoritesLoaded: false,

  initializeFavorites: () => {
    if (get().favoritesLoaded) return;
    set({ favoriteSubstances: loadFavorites(), favoritesLoaded: true });
  },

  // Timeline visualization style — load from localStorage on client only
  timelineStyle: "intensity" as TimelineStyle,
  timelineStyleLoaded: false,

  initializeTimelineStyle: () => {
    if (get().timelineStyleLoaded) return;
    set({ timelineStyle: loadTimelineStyle(), timelineStyleLoaded: true });
  },

  toggleFavorite: (sub) => {
    const existing = get().favoriteSubstances;
    const key = sub.id.toLowerCase();
    const idx = existing.findIndex(
      (s) =>
        s.id.toLowerCase() === key ||
        s.name.toLowerCase() === sub.name.toLowerCase(),
    );
    let next: FavoriteSubstance[];
    if (idx >= 0) {
      next = existing.filter((_, i) => i !== idx);
    } else {
      next = [...existing, sub];
      // Enforce max 24 favorites
      if (next.length > 24) {
        next = next.slice(-24);
      }
    }
    persistFavorites(next);
    set({ favoriteSubstances: next });
  },

  isFavorite: (idOrName) => {
    const key = idOrName.toLowerCase();
    return get().favoriteSubstances.some(
      (s) => s.id.toLowerCase() === key || s.name.toLowerCase() === key,
    );
  },

  // Timeline visualization style
  setTimelineStyle: (style) => {
    set({ timelineStyle: style });
    persistTimelineStyle(style);
  },
}));
