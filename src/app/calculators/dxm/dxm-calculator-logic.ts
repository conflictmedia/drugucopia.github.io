/**
 * DXM Dose Calculator Logic
 * 
 * Pure functions for computing DXM plateau doses based on body weight.
 * No React dependencies - just TypeScript math and types.
 */

import React from 'react'
import { Sun, Waves, Orbit, AlertTriangle } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Upper bound of the Fourth Plateau in mg/kg (above this is overdose territory) */
export const MAX_PLATEAU_MGKG = 20
/** Lower bound of the First Plateau in mg/kg (used as spectrum origin) */
export const MIN_PLATEAU_MGKG = 1.5

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Plateau {
  icon: React.ElementType
  name: string
  subtitle: string
  emoji: string
  rangeMin: number
  rangeMax: number
  color: string
  bgColor: string
  borderColor: string
  glowClass: string
  spectrumColor: string
  description: string
  effects: string[]
  duration: string
}

export interface OTCProduct {
  name: string
  dxmPerUnit: number
  unitLabel: string
  warning?: string
}

export interface CalculatedPlateau {
  name: string
  subtitle: string
  emoji: string
  rangeMin: number
  rangeMax: number
  color: string
  bgColor: string
  borderColor: string
  glowClass: string
  spectrumColor: string
  description: string
  effects: string[]
  duration: string
  minDose: number
  maxDose: number
  icon: React.ElementType
}

export interface OTCConversion {
  name: string
  dxmPerUnit: number
  unitLabel: string
  warning?: string
  minUnits: number
  maxUnits: number
}

export interface DxmSettings {
  weight?: string
  unit?: 'kg' | 'lbs'
  plateau?: number
}

// ─── DXM Plateau Definitions (mg/kg) ────────────────────────────────────────

export const plateaus = [
  {
    name: 'First Plateau',
    subtitle: 'Mild Stimulation',
    icon: Sun,
    emoji: '☀️',
    rangeMin: 1.5,
    rangeMax: 2.5,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    glowClass: 'glow-green',
    spectrumColor: 'bg-green-500',
    description:
      'Mild stimulant-like effects emerge at this level. Users typically report slight mood elevation, a gentle increase in sociability, and a subtle sense of restlessness or energy. Music may sound slightly more engaging, and colors can appear marginally more vivid. The experience is often compared to a mild dose of a stimulant, and many users find this level functional for social settings without significant impairment.',
    effects: ['Mood elevation', 'Slight restlessness', 'Increased sociability', 'Mild stimulation', 'Music appreciation', 'Slight cognitive enhancement'],
    duration: '2 – 4 hours',
  },
  {
    name: 'Second Plateau',
    subtitle: 'Intoxication / Euphoria',
    icon: Waves,
    emoji: '🌊',
    rangeMin: 2.5,
    rangeMax: 7.5,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowClass: 'glow-cyan',
    spectrumColor: 'bg-cyan-500',
    description:
      'Euphoric intoxication with moderate dissociation begins to take hold. Noticeable changes in perception, thought patterns, and motor coordination become apparent. The experience is frequently described as dreamlike — reality feels slightly detached, and thought processes take on a wandering, associative quality. Music becomes profoundly enhanced, and many users report closed-eye visuals at the higher end of this range. Walking and fine motor skills become noticeably impaired.',
    effects: ['Euphoria', 'Moderate dissociation', 'Altered perception', 'Dreamlike state', 'Music enhancement', 'Closed-eye visuals', 'Impaired coordination'],
    duration: '3 – 6 hours',
  },
  {
    name: 'Third Plateau',
    subtitle: 'Strong Dissociation',
    icon: Orbit,
    emoji: '🪐',
    rangeMin: 7.5,
    rangeMax: 15,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glowClass: 'glow-purple',
    spectrumColor: 'bg-purple-500',
    description:
      'Intense dissociation and hallucination characterize this plateau. Users experience profound detachment from physical reality, vivid open-eye and closed-eye visual hallucinations, and difficulty forming coherent thoughts. Out-of-body sensations are commonly reported. Motor control becomes significantly impaired — walking or speaking clearly may be extremely difficult. Memory formation is often disrupted, leading to fragmented recollection of the experience. This level is not recommended for beginners and requires a safe environment with a trip sitter.',
    effects: ['Intense dissociation', 'Open-eye visuals', 'Out-of-body sensations', 'Severe motor impairment', 'Confusion', 'Memory disruption', 'Ego dissolution'],
    duration: '4 – 8 hours',
  },
  {
    name: 'Fourth Plateau',
    subtitle: 'Extreme Dissociation',
    icon: AlertTriangle,
    emoji: '⚠️',
    rangeMin: 15,
    rangeMax: 20,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    glowClass: 'glow-red',
    spectrumColor: 'bg-red-500',
    description:
      'Complete dissociation from mind and body. Users may enter near-anesthetic states with intense, overwhelming hallucinations. The boundary between self and environment dissolves entirely, often described as a "hole" experience similar to high-dose ketamine. Physical mobility is essentially nonexistent — users may be unable to move, speak, or respond to external stimuli. There is a significant risk of dangerous behavior, psychotic episodes, and severe psychological distress. Amnesia is common. This plateau is strongly discouraged due to the high probability of adverse outcomes.',
    effects: ['Complete dissociation', 'Overwhelming hallucinations', 'Near-anesthetic state', 'Total immobility', 'Amnesia', 'High risk of psychosis', 'Ego death'],
    duration: '5 – 10 hours',
  },
]

// ─── OTC Product Conversions ─────────────────────────────────────────────────

export const otcProducts = [
  {
    name: 'Robocough Freebase tablets',
    dxmPerUnit: 40.92,
    unitLabel: 'tablets',
  },
  {
    name: 'Delsym (polisterix)',
    dxmPerUnit: 3,
    unitLabel: 'ml',
    warning:
      'Delsym contains DXM polistirex (extended-release). Effects last 8–12 hours but feel weaker per mg. Do NOT double-dose to compensate — wait the full duration before redosing.',
  },
  {
    name: 'Cough Gels (15mg)',
    dxmPerUnit: 15,
    unitLabel: 'gels',
  },
  {
    name: 'Robocough HBR tablets',
    dxmPerUnit: 30,
    unitLabel: 'tablets',
  },
  {
    name: 'Delsym tablets',
    dxmPerUnit: 15,
    unitLabel: 'tablets',
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getPlateauSpectrumPercent(p: typeof plateaus[0]): number {
  return ((p.rangeMax - p.rangeMin) / MAX_PLATEAU_MGKG) * 100
}

export function getPlateauStartPercent(p: typeof plateaus[0]): number {
  return (p.rangeMin / MAX_PLATEAU_MGKG) * 100
}

export function getPlateauSpectrumColor(p: typeof plateaus[0]): string {
  // More opaque, saturated colors for the spectrum bar so text is readable
  switch (p.name) {
    case 'First Plateau': return 'bg-green-500/50'
    case 'Second Plateau': return 'bg-cyan-500/50'
    case 'Third Plateau': return 'bg-purple-500/50'
    case 'Fourth Plateau': return 'bg-red-500/50'
    default: return 'bg-base-300'
  }
}

export function formatGrams(g: number): string {
  if (g >= 1) return g.toFixed(1)
  if (g >= 0.1) return g.toFixed(2)
  return g.toFixed(3)
}

// ─── Settings Persistence ────────────────────────────────────────────────

export const DXM_SETTINGS_KEY = 'drugucopia-dxm-settings'

export interface DxmSettings {
  weight?: string
  unit?: 'kg' | 'lbs'
  plateau?: number
}

export function loadDxmSettings(): DxmSettings {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(DXM_SETTINGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as DxmSettings
  } catch {
    /* ignore corrupt entry */
  }
  return {}
}

/** Generate shareable URL query string. */
export function buildDxmUrl(
  weight: string,
  unit: 'kg' | 'lbs',
  plateau: number
): string {
  const params = new URLSearchParams()
  if (weight) params.set('weight', weight)
  if (unit !== 'lbs') params.set('unit', unit)
  if (plateau !== 0) params.set('plateau', String(plateau))
  return params.toString()
}