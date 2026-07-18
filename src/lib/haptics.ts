/**
 * Haptics wrapper using Web Vibration API
 * Falls back to no-op on unsupported platforms
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

interface HapticsModule {
  light: () => Promise<void>;
  medium: () => Promise<void>;
  heavy: () => Promise<void>;
  selection: () => Promise<void>;
  success: () => Promise<void>;
  warning: () => Promise<void>;
  error: () => Promise<void>;
  isAvailable: () => Promise<boolean>;
}

let hapticsModule: HapticsModule | null = null;
let initPromise: Promise<void> | null = null;

async function initHaptics(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (typeof window === 'undefined') return;

      // Check for Vibration API support
      const hasVibration = 'vibrate' in navigator;

      if (!hasVibration) {
        hapticsModule = createNoopModule();
        return;
      }

      hapticsModule = {
        light: () => vibratePattern([10]),
        medium: () => vibratePattern([20]),
        heavy: () => vibratePattern([40]),
        selection: () => vibratePattern([5]),
        success: () => vibratePattern([10, 30, 10]),
        warning: () => vibratePattern([30, 20, 30]),
        error: () => vibratePattern([50, 30, 50]),
        isAvailable: async () => true,
      };

      // Expose to window for PullToRefresh to use
      (window as any).__WEB_HAPTICS__ = hapticsModule;
    } catch (error) {
      console.warn('Failed to initialize Web haptics:', error);
      hapticsModule = createNoopModule();
    }
  })();

  return initPromise;
}

function vibratePattern(pattern: number[]): Promise<void> {
  return new Promise((resolve) => {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore errors
    }
    // Small delay to allow vibration to start
    setTimeout(resolve, Math.max(...pattern) + 10);
  });
}

function createNoopModule(): HapticsModule {
  const noop = async () => {};
  return {
    light: noop,
    medium: noop,
    heavy: noop,
    selection: noop,
    success: noop,
    warning: noop,
    error: noop,
    isAvailable: async () => false,
  };
}

export async function getHaptics(): Promise<HapticsModule> {
  if (!hapticsModule) {
    await initHaptics();
  }
  return hapticsModule!;
}

// Convenience functions
export async function hapticLight() {
  const h = await getHaptics();
  return h.light();
}

export async function hapticMedium() {
  const h = await getHaptics();
  return h.medium();
}

export async function hapticHeavy() {
  const h = await getHaptics();
  return h.heavy();
}

export async function hapticSelection() {
  const h = await getHaptics();
  return h.selection();
}

export async function hapticSuccess() {
  const h = await getHaptics();
  return h.success();
}

export async function hapticWarning() {
  const h = await getHaptics();
  return h.warning();
}

export async function hapticError() {
  const h = await getHaptics();
  return h.error();
}

// Initialize on import (client-side only)
if (typeof window !== 'undefined') {
  initHaptics();
}