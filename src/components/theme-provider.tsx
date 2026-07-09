'use client'

import type { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Curated set of daisyUI themes exposed in the theme picker.
 *
 * `light` and `dark` are the project's custom Drugucopia themes (overridden
 * in globals.css). All others use daisyUI's built-in theme palettes.
 *
 * The `id` MUST match a theme registered in the `@plugin "daisyui"` block
 * in `src/app/globals.css`. `system` is a virtual id handled by next-themes
 * (resolves to light/dark based on prefers-color-scheme).
 */
export const AVAILABLE_THEMES = [
  { id: 'system', label: 'System', description: 'Match OS' },
  { id: 'light', label: 'Light', description: 'Drugucopia light' },
  { id: 'dark', label: 'Dark', description: 'Drugucopia dark' },
  { id: 'cupcake', label: 'Cupcake', description: 'Pastel pink' },
  { id: 'synthwave', label: 'Synthwave', description: 'Neon retro' },
  { id: 'dracula', label: 'Dracula', description: 'Classic dark' },
  { id: 'nord', label: 'Nord', description: 'Cool blue' },
  { id: 'emerald', label: 'Emerald', description: 'Light green' },
  { id: 'sunset', label: 'Sunset', description: 'Warm dark' },
  { id: 'coffee', label: 'Coffee', description: 'Warm brown' },
  { id: 'retro', label: 'Retro', description: 'Vintage' },
] as const

export type ThemeId = (typeof AVAILABLE_THEMES)[number]['id']

/** Concrete theme ids (excludes the virtual `system` id). */
export const THEME_IDS = AVAILABLE_THEMES.filter((t) => t.id !== 'system').map(
  (t) => t.id,
)

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
