'use client'

import type { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Curated set of daisyUI themes exposed in the theme picker.
 *
 * Only dark themes are included — DaisyUI dark themes define highly
 * saturated base-100 colors that create a colored overlay on the milkdrop
 * WebGL background. An override in globals.css forces neutral dark
 * base-100/200/300 for all non-custom themes, so the theme's personality
 * comes through primary / secondary / accent only.
 *
 * `light` is kept registered (but not in the picker) so the `system`
 * virtual theme can resolve to a light theme via `prefers-color-scheme`.
 *
 * The `id` MUST match a theme registered in the `@plugin "daisyui"` block
 * in `src/app/globals.css`.
 */
export const AVAILABLE_THEMES = [
  { id: 'system', label: 'System', description: 'Match OS' },
  { id: 'dark', label: 'Drugucopia', description: 'Custom dark' },
  // ─── DaisyUI dark themes ───
  { id: 'dracula', label: 'Dracula', description: 'Classic dark' },
  { id: 'night', label: 'Night', description: 'Deep dark' },
  { id: 'black', label: 'Black', description: 'Pure black' },
  { id: 'dim', label: 'Dim', description: 'Subdued dark' },
  { id: 'sunset', label: 'Sunset', description: 'Warm dark' },
  { id: 'synthwave', label: 'Synthwave', description: 'Neon retro' },
  { id: 'halloween', label: 'Halloween', description: 'Spooky orange' },
  { id: 'aqua', label: 'Aqua', description: 'Cool cyan' },
  { id: 'forest', label: 'Forest', description: 'Deep green' },
  { id: 'luxury', label: 'Luxury', description: 'Gold & dark' },
  { id: 'business', label: 'Business', description: 'Professional' },
  { id: 'coffee', label: 'Coffee', description: 'Warm brown' },
] as const

export type ThemeId = (typeof AVAILABLE_THEMES)[number]['id']

/** Concrete theme ids (excludes the virtual `system` id). */
export const THEME_IDS = AVAILABLE_THEMES.filter((t) => t.id !== 'system').map(
  (t) => t.id,
)

/**
 * Themes that are visually "dark" — used to tell the milkdrop shader
 * whether to apply light-mode desaturation.  All registered themes
 * (except the hidden `light` fallback) are dark, but we also include
 * `light` here so that `system` resolving to light on an OS light
 * preference still works correctly.
 */
export const DARK_THEME_IDS = new Set<string>([
  'dark',
  'dracula',
  'night',
  'black',
  'dim',
  'sunset',
  'synthwave',
  'halloween',
  'aqua',
  'forest',
  'luxury',
  'business',
  'coffee',
])

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={THEME_IDS}
    >
      {children}
    </NextThemesProvider>
  )
}
