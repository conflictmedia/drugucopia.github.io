import {
  Brain,
  FlaskConical,
  Ghost,
  Heart,
  Leaf,
  Moon as MoonIcon,
  Pill,
  Shield,
  Sparkles,
  Split,
  Zap,
} from 'lucide-react'
import type React from 'react'
import type { SubstanceCategory } from '@/lib/substances/index'

export const categoryIcons: Record<SubstanceCategory, React.ElementType> = {
  stimulants: Zap,
  depressants: MoonIcon,
  hallucinogens: Sparkles,
  dissociatives: Split,
  empathogens: Heart,
  cannabinoids: Leaf,
  opioids: Pill,
  deliriants: Ghost,
  nootropics: Brain,
  other: FlaskConical,
  medications: Shield,
}

/**
 * Category semantic color mapping per DESIGN.md §1.3 Severity Ladder.
 * 
 * These are DAISYUI SEMANTIC TOKENS, not hardcoded colors.
 * Category badges use outline variant with semantic color tokens.
 * The actual color rendering depends on the active theme (13 themes in DESIGN.md §1.2).
 * 
 * Mapping follows DESIGN.md severity ladder:
 * - info (neutral/educational): stimulants, nootropics, other
 * - success (safe/confirmed): cannabinoids, medications  
 * - warning (caution): empathogens, dissociatives, hallucinogens
 * - error (dangerous): opioids, depressants, deliriants
 * 
 * This is the SINGLE SOURCE OF TRUTH for category colors — no hardcoded colors in components.
 */
export const categoryColors: Record<SubstanceCategory, string> = {
  // info - neutral educational
  stimulants: 'badge-info',
  nootropics: 'badge-info',
  other: 'badge-info',
  
  // success - safe/confirmed
  cannabinoids: 'badge-success',
  medications: 'badge-success',
  
  // warning - caution/attention
  empathogens: 'badge-warning',
  dissociatives: 'badge-warning',
  hallucinogens: 'badge-warning',
  
  // error - dangerous/destructive
  opioids: 'badge-error',
  depressants: 'badge-error',
  deliriants: 'badge-error',
}

/**
 * CSS variable names for category colors (for icon backgrounds, etc.)
 * These reference the DESIGN.md §1.4 semantic color tokens.
 */
export const categoryColorVar: Record<SubstanceCategory, string> = {
  stimulants: 'var(--color-category-stimulants)',
  depressants: 'var(--color-category-depressants)',
  hallucinogens: 'var(--color-category-hallucinogens)',
  dissociatives: 'var(--color-category-dissociatives)',
  empathogens: 'var(--color-category-empathogens)',
  cannabinoids: 'var(--color-category-cannabinoids)',
  opioids: 'var(--color-category-opioids)',
  deliriants: 'var(--color-category-deliriants)',
  nootropics: 'var(--color-category-nootropics)',
  other: 'var(--color-category-other)',
  medications: 'var(--color-category-medications)',
}

/**
 * Dot colors for category filter pills — use semantic badge color tokens.
 * These are used as inline style or className on a span.
 */
export const categoryDotColors: Record<SubstanceCategory, string> = {
  stimulants: 'badge-info',
  depressants: 'badge-error',
  hallucinogens: 'badge-warning',
  dissociatives: 'badge-warning',
  empathogens: 'badge-warning',
  cannabinoids: 'badge-success',
  opioids: 'badge-error',
  deliriants: 'badge-error',
  nootropics: 'badge-info',
  other: 'badge-info',
  medications: 'badge-success',
}

/**
 * DEPRECATED: glow classes use hardcoded colors.
 * Per DESIGN.md §6: "NO animation on non-interactive elements" and "NO layout animation".
 * These are kept for reference but should NOT be used in new code.
 * Use GPU-only transform/opacity transitions instead.
 */
export const categoryGlowClasses: Record<SubstanceCategory, string> = {
  stimulants: '',
  depressants: '',
  hallucinogens: '',
  dissociatives: '',
  empathogens: '',
  cannabinoids: '',
  opioids: '',
  deliriants: '',
  nootropics: '',
  other: '',
  medications: '',
}

/**
 * Risk level mapping to DESIGN.md severity ladder (§1.3):
 * - none → neutral (default)
 * - low → success (safe)
 * - moderate → warning (caution)
 * - high → warning (caution)
 * - very-high → error (dangerous)
 */
export const riskLevelColors: Record<'none' | 'low' | 'moderate' | 'high' | 'very-high', string> = {
  none: 'badge badge-outline',
  low: 'badge-success',
  moderate: 'badge-warning',
  high: 'badge-warning',
  'very-high': 'badge-error',
}

export const routeIconMap: Record<string, string> = {
  Oral: '💊',
  Sublingual: '👅',
  Inhalation: '💨',
  Insufflation: '👃',
  Intravenous: '💉',
  Intramuscular: '💉',
  Transdermal: '🩹',
  Rectal: '⬇️',
  Nasal: '👃',
  Smoking: '🔥',
  'Lemon Tek': '🍋',
  Tea: '🍵',
  Topical: '🤲',
}

export const routeDangerColors: Record<string, string> = {
  Intravenous: 'border-red-500/40 bg-red-500/5',
  Intramuscular: 'border-orange-500/40 bg-orange-500/5',
  Smoking: 'border-orange-500/30 bg-orange-500/5',
}

export const GITHUB_NEW_SUBSTANCE_URL =
  'https://github.com/drugucopia/substances/issues/new?template=new-substance-request.md'
export const GITHUB_INFO_CHANGE_URL =
  'https://github.com/drugucopia/substances/issues/new?template=change-substance-info.md'
export const GITHUB_FEEDBACK_URL = 'https://github.com/drugucopia/substances/issues/new'
export const GITHUB_MAIN_URL = 'https://github.com/drugucopia/drugucopia'

export type MobileTab = 'substances' | 'timeline' | 'log' | 'history'
