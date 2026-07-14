/**
 * Kratom Extract Calculator Logic
 * 
 * Pure functions for converting between kratom leaf powder and extract doses.
 * No React dependencies - just TypeScript math and types.
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Approximate mitragynine content of raw kratom leaf powder (%) */
export const DEFAULT_MITRAGYNINE_PCT = 1.5
export const MAX_SAFE_LEAF_DOSE = 12

// ─── Types ────────────────────────────────────────────────────────────────────

export type InputMode = 'percent' | 'ratio'

export interface DoseTier {
  name: string
  subtitle: string
  emoji: string
  rangeMin: number
  rangeMax: number
  color: string
  bgColor: string
  borderColor: string
  glowClass: string
  description: string
  effects: string[]
  duration: string
}

export interface PresetExtract {
  label: string
  value: number
  mode: InputMode
}

export interface KratomSettings {
  inputMode?: InputMode
  extractValue?: string
  leafDose?: string
  extractAmountInput?: string
  calcDirection?: 'leaf-to-extract' | 'extract-to-leaf'
  extractUnit?: 'g' | 'mg'
  isEnhanced?: boolean
  leafBaseline?: number
}

// ─── Dose Tier Definitions (grams, oral, leaf powder) ────────────────────────

export const doseTiers: DoseTier[] = [
  {
    name: 'Threshold',
    subtitle: 'Minimal Effects',
    emoji: '🌿',
    rangeMin: 1,
    rangeMax: 2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    glowClass: 'glow-green',
    description:
      'At this level, users may notice very subtle stimulation and a slight increase in alertness. Physical sensations are minimal. Some individuals report mild anxiety relief, though effects can be inconsistent. This range is often used by those sensitive to kratom or microdosing for functional purposes throughout the day.',
    effects: ['Mild stimulation', 'Slight alertness', 'Minimal physical sensation', 'Possible mild anxiety relief'],
    duration: '1 – 2 hours',
  },
  {
    name: 'Light',
    subtitle: 'Gentle Stimulation',
    emoji: '⚡',
    rangeMin: 2,
    rangeMax: 4,
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/30',
    glowClass: 'glow-green',
    description:
      'Light doses produce a noticeable but gentle stimulant effect, often described as similar to caffeine but smoother and longer-lasting. Users commonly experience improved focus, sociability, and a mild sense of well-being. Physical discomfort may be mildly reduced. This range is popular for daytime use as it rarely impairs functioning.',
    effects: ['Noticeable stimulation', 'Improved focus', 'Enhanced sociability', 'Mild euphoria', 'Reduced discomfort'],
    duration: '2 – 3 hours',
  },
  {
    name: 'Common',
    subtitle: 'Balanced Effects',
    emoji: '🌟',
    rangeMin: 3,
    rangeMax: 6,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowClass: 'glow-amber',
    description:
      'This is the most commonly reported range, offering a blend of mild stimulation and relaxation that shifts depending on the strain. Users often describe a sense of calm, warmth, and contentment with reduced anxiety and physical tension. At the higher end, sedation begins to overtake stimulation. This range provides the most balanced experience.',
    effects: ['Calm contentment', 'Reduced anxiety', 'Physical relaxation', 'Mild euphoria', 'Warmth', 'Strain-dependent stimulation or sedation'],
    duration: '3 – 5 hours',
  },
  {
    name: 'Strong',
    subtitle: 'Sedation & Analgesia',
    emoji: '🌊',
    rangeMin: 6,
    rangeMax: 8,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    glowClass: 'glow-amber',
    description:
      'Strong doses produce significant opioid-like effects including pronounced analgesia, heavy sedation, and euphoria. Stimulation fades entirely at this level. Users may experience "the wobbles" — nausea and difficulty focusing the eyes. Cognitive impairment becomes noticeable. This range should only be used by experienced individuals with established tolerance.',
    effects: ['Strong analgesia', 'Heavy sedation', 'Euphoria', 'Possible nausea ("wobbles")', 'Cognitive impairment', 'Relaxation'],
    duration: '4 – 6 hours',
  },
  {
    name: 'Heavy',
    subtitle: 'Deep Sedation',
    emoji: '💤',
    rangeMin: 8,
    rangeMax: 12,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    glowClass: 'glow-red',
    description:
      'Heavy doses produce profound sedation, near-total pain relief, and intense euphoria that can border on delirium at the upper end. Motor coordination is significantly impaired, and users often feel compelled to lie down. The risk of nausea, vomiting, and respiratory depression increases substantially. This range carries meaningful overdose risk and should be approached with extreme caution.',
    effects: ['Profound sedation', 'Intense euphoria', 'Near-total analgesia', 'Motor impairment', 'High nausea risk', 'Respiratory depression risk'],
    duration: '5 – 8 hours',
  },
]

// ─── Preset Extract Strengths ────────────────────────────────────────────────

export const presetPercents: PresetExtract[] = [
  { label: '10%', value: 10, mode: 'percent' },
  { label: '15%', value: 15, mode: 'percent' },
  { label: '20%', value: 20, mode: 'percent' },
  { label: '28%', value: 28, mode: 'percent' },
  { label: '45%', value: 45, mode: 'percent' },
  { label: '50%', value: 50, mode: 'percent' },
]

export const presetRatios: PresetExtract[] = [
  { label: '5×', value: 5, mode: 'ratio' },
  { label: '10×', value: 10, mode: 'ratio' },
  { label: '15×', value: 15, mode: 'ratio' },
  { label: '20×', value: 20, mode: 'ratio' },
  { label: '50×', value: 50, mode: 'ratio' },
]

export const LEAF_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const EXTRACT_PRESETS = [0.1, 0.25, 0.5, 1]

// ─── Conversion Helpers ──────────────────────────────────────────────────────

/** Convert mitragynine % to concentration ratio (extract:leaf). */
export function percentToRatio(percent: number, baseline: number): number {
  return percent / baseline
}

/** Convert concentration ratio to mitragynine %. */
export function ratioToPercent(ratio: number, baseline: number): number {
  return ratio * baseline
}

/** Get the concentration factor from either input mode. */
export function getConcentrationFactor(mode: InputMode, value: number, baseline: number): number {
  if (value <= 0) return 0
  return mode === 'percent' ? percentToRatio(value, baseline) : value
}

/** Convert leaf grams → extract grams. */
export function leafToExtract(leafGrams: number, concentrationFactor: number): number {
  if (concentrationFactor <= 0) return 0
  return leafGrams / concentrationFactor
}

/** Convert extract grams → leaf grams equivalent. */
export function extractToLeaf(extractGrams: number, concentrationFactor: number): number {
  return extractGrams * concentrationFactor
}

/** Format grams with appropriate precision. */
export function formatGrams(g: number): string {
  if (g >= 1) return g.toFixed(1)
  if (g >= 0.1) return g.toFixed(2)
  return g.toFixed(3)
}

/** Find the dose tier for a given leaf dose. */
export function classifyLeafDose(grams: number): DoseTier | null {
  for (let i = doseTiers.length - 1; i >= 0; i--) {
    if (grams >= doseTiers[i].rangeMin) return doseTiers[i]
  }
  return null
}

/** Get tier width as % of max safe dose for spectrum bar. */
export function getTierSpectrumPercent(tier: DoseTier): number {
  return ((tier.rangeMax - tier.rangeMin) / MAX_SAFE_LEAF_DOSE) * 100
}

/** Get tier start position as % of max safe dose. */
export function getTierStartPercent(tier: DoseTier): number {
  return (tier.rangeMin / MAX_SAFE_LEAF_DOSE) * 100
}

/** Get spectrum marker position (0-105%). */
export function getSpectrumPosition(grams: number): number {
  return Math.min((grams / MAX_SAFE_LEAF_DOSE) * 100, 105)
}

/** Get tier spectrum color with higher opacity for text readability. */
export function getTierSpectrumColor(tier: DoseTier): string {
  switch (tier.name) {
    case 'Threshold': return 'bg-emerald-500/50'
    case 'Light': return 'bg-lime-500/50'
    case 'Common': return 'bg-amber-500/50'
    case 'Strong': return 'bg-orange-500/50'
    case 'Heavy': return 'bg-red-500/50'
    default: return 'bg-base-300'
  }
}

// ─── Settings Persistence ────────────────────────────────────────────────────

const KRATOM_SETTINGS_KEY = 'drugucopia-kratom-settings'

export function loadKratomSettings(): KratomSettings {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KRATOM_SETTINGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as KratomSettings
  } catch {
    /* ignore corrupt entry */
  }
  return {}
}

/** Generate shareable URL query string. */
export function buildKratomUrl(
  inputMode: InputMode,
  extractValue: string,
  calcDirection: 'leaf-to-extract' | 'extract-to-leaf',
  leafDose: string,
  extractAmountInput: string,
  extractUnit: 'g' | 'mg',
  isEnhanced: boolean,
  leafBaseline: number
): string {
  const params = new URLSearchParams()
  if (inputMode !== 'percent') params.set('mode', inputMode)
  if (extractValue) params.set('strength', extractValue)
  if (calcDirection !== 'leaf-to-extract') params.set('direction', calcDirection)
  if (leafDose) params.set('leaf', leafDose)
  if (extractAmountInput) params.set('extract', extractAmountInput)
  if (extractUnit !== 'g') params.set('unit', extractUnit)
  if (isEnhanced) params.set('enhanced', 'true')
  if (leafBaseline !== DEFAULT_MITRAGYNINE_PCT) params.set('baseline', String(leafBaseline))
  return params.toString()
}