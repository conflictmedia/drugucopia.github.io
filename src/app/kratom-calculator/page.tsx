'use client'

import React, { useState, useMemo } from 'react'
import {
  Leaf,
  Scale,
  Droplets,
  AlertTriangle,
  Info,
  Calculator,
  Shield,
  Clock,
  Heart,
  Skull,
  ArrowLeftRight,
  Beaker,
  FlaskConical,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Constants ──────────────────────────────────────────────────────────────

/** Approximate mitragynine content of raw kratom leaf powder (%) */
const BASE_MITRAGYNINE_PCT = 1.5

// ─── Types ──────────────────────────────────────────────────────────────────

type InputMode = 'percent' | 'ratio'

interface DoseTier {
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

interface PresetExtract {
  label: string
  value: number
  mode: InputMode
}

// ─── Dose Tier Definitions (grams, oral, leaf powder) ──────────────────────

const doseTiers: DoseTier[] = [
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
      'Strong doses produce significant opioid-like effects including pronounced analgesia, heavy sedation, and euphoria. Stimulation fades entirely at this level. Users may experience “the wobbles” — nausea and difficulty focusing the eyes. Cognitive impairment becomes noticeable. This range should only be used by experienced individuals with established tolerance.',
    effects: ['Strong analgesia', 'Heavy sedation', 'Euphoria', 'Possible nausea (“wobbles”)', 'Cognitive impairment', 'Relaxation'],
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

// ─── Preset Extract Strengths ──────────────────────────────────────────────

const presetPercents: PresetExtract[] = [
  { label: '10%', value: 10, mode: 'percent' },
  { label: '15%', value: 15, mode: 'percent' },
  { label: '20%', value: 20, mode: 'percent' },
  { label: '28%', value: 28, mode: 'percent' },
  { label: '45%', value: 45, mode: 'percent' },
  { label: '50%', value: 50, mode: 'percent' },
]

const presetRatios: PresetExtract[] = [
  { label: '5×', value: 5, mode: 'ratio' },
  { label: '10×', value: 10, mode: 'ratio' },
  { label: '15×', value: 15, mode: 'ratio' },
  { label: '20×', value: 20, mode: 'ratio' },
  { label: '50×', value: 50, mode: 'ratio' },
]

// ─── Conversion Helpers ────────────────────────────────────────────────────

function percentToRatio(percent: number): number {
  return percent / BASE_MITRAGYNINE_PCT
}

function ratioToPercent(ratio: number): number {
  return ratio * BASE_MITRAGYNINE_PCT
}

function getConcentrationFactor(mode: InputMode, value: number): number {
  if (value <= 0) return 0
  return mode === 'percent' ? percentToRatio(value) : value
}

function leafToExtract(leafGrams: number, concentrationFactor: number): number {
  if (concentrationFactor <= 0) return 0
  return leafGrams / concentrationFactor
}

function extractToLeaf(extractGrams: number, concentrationFactor: number): number {
  return extractGrams * concentrationFactor
}

function formatGrams(g: number): string {
  if (g >= 1) return g.toFixed(1)
  if (g >= 0.1) return g.toFixed(2)
  return g.toFixed(3)
}

// ─── Page Component ────────────────────────────────────────────────────────

export default function KratomCalculatorPage() {
  const [inputMode, setInputMode] = useState<InputMode>('percent')
  const [extractValue, setExtractValue] = useState<string>('')
  const [leafDose, setLeafDose] = useState<string>('')
  const [calcDirection, setCalcDirection] = useState<'leaf-to-extract' | 'extract-to-leaf'>('leaf-to-extract')

  const concentrationFactor = useMemo(() => {
    const v = parseFloat(extractValue)
    if (isNaN(v) || v <= 0) return 0
    return getConcentrationFactor(inputMode, v)
  }, [extractValue, inputMode])

  const leafGrams = useMemo(() => {
    const v = parseFloat(leafDose)
    return isNaN(v) || v <= 0 ? 0 : v
  }, [leafDose])

  // Leaf-to-Extract: compute extract equivalents per tier
  const tierResults = useMemo(() => {
    if (concentrationFactor <= 0) return null
    return doseTiers.map((t) => ({
      ...t,
      minExtract: leafToExtract(t.rangeMin, concentrationFactor),
      maxExtract: leafToExtract(t.rangeMax, concentrationFactor),
    }))
  }, [concentrationFactor])

  // Custom dose conversion (leaf-to-extract direction)
  const customResult = useMemo(() => {
    if (concentrationFactor <= 0 || leafGrams <= 0) return null
    return {
      extractDose: leafToExtract(leafGrams, concentrationFactor),
      leafDose: leafGrams,
    }
  }, [concentrationFactor, leafGrams])

  // Reverse: extract-to-leaf
  const [extractAmountInput, setExtractAmountInput] = useState<string>('')
  const extractAmountGrams = useMemo(() => {
    const v = parseFloat(extractAmountInput)
    return isNaN(v) || v <= 0 ? 0 : v
  }, [extractAmountInput])

  const reverseResult = useMemo(() => {
    if (concentrationFactor <= 0 || extractAmountGrams <= 0) return null
    return {
      leafEquivalent: extractToLeaf(extractAmountGrams, concentrationFactor),
      extractDose: extractAmountGrams,
    }
  }, [concentrationFactor, extractAmountGrams])

  // Dose tier for a given leaf amount
  const classifyLeafDose = (grams: number): DoseTier | null => {
    for (let i = doseTiers.length - 1; i >= 0; i--) {
      if (grams >= doseTiers[i].rangeMin) return doseTiers[i]
    }
    return null
  }


  // Active presets
  const activePresets = inputMode === 'percent' ? presetPercents : presetRatios

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8 max-w-5xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 glow-green">
            <Leaf className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Kratom Extract Dose Calculator</h1>
            <p className="text-sm text-neutral-content">
              Convert between kratom extract percentages/ratios and equivalent leaf powder doses
            </p>
          </div>
        </div>
        <div className="alert alert-warning text-xs mt-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            This calculator is for <strong>harm reduction purposes only</strong>. Kratom carries risks of
            dependence, withdrawal, and potentially serious adverse effects at high doses. Always start
            low and research thoroughly. Not medical advice.
          </span>
        </div>
      </div>

      {/* ─── Extract Strength Input ──────────────────────────────────── */}
      <div className="card card-transparent mb-8">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2 mb-4">
            <Beaker className="h-5 w-5" />
            Extract Strength
          </h2>

          {/* Mode Toggle */}
          <div className="mb-4 flex rounded-lg border border-base-300 overflow-hidden">
            <button
              onClick={() => setInputMode('percent')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                inputMode === 'percent'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-neutral-content hover:bg-base-300'
              }`}
            >
              Extract % (Mitragynine)
            </button>
            <button
              onClick={() => setInputMode('ratio')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                inputMode === 'ratio'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-neutral-content hover:bg-base-300'
              }`}
            >
              Extract Ratio (e.g. 10×)
            </button>
          </div>

          {/* Extract value input */}
          <div className="mb-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-neutral-content">
                {inputMode === 'percent' ? 'Mitragynine Content (%)' : 'Extract Ratio (x)'}
              </label>
              <Input
                type="number"
                min="0.1"
                step="1"
                placeholder={inputMode === 'percent' ? 'e.g. 20' : 'e.g. 10'}
                value={extractValue}
                onChange={(e) => setExtractValue(e.target.value)}
                className="bg-base-200 border-base-300/50 text-lg h-12 font-mono"
              />
            </div>
            <div className="pb-1 text-xs text-neutral-content">
              {inputMode === 'percent' ? '% mitragynine' : '× concentration'}
            </div>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {activePresets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setInputMode(p.mode)
                  setExtractValue(String(p.value))
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  parseFloat(extractValue) === p.value && inputMode === p.mode
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Conversion info */}
          <AnimatePresence>
            {concentrationFactor > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-content font-mono"
              >
                <span>
                  Concentration: <span className="font-semibold text-base-content">{concentrationFactor.toFixed(1)}×</span>
                </span>
                {inputMode === 'percent' && (
                  <span>
                    {'≈'} <span className="font-semibold text-base-content">{concentrationFactor.toFixed(1)}× extract</span>
                  </span>
                )}
                {inputMode === 'ratio' && (
                  <span>
                    {'≈'} <span className="font-semibold text-base-content">{ratioToPercent(parseFloat(extractValue)).toFixed(1)}% mitragynine</span>
                  </span>
                )}
                <span className="text-neutral-content/50">
                  (base leaf {'≈'} {BASE_MITRAGYNINE_PCT}% mitragynine)
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Calculator Direction Toggle ──────────────────────────────── */}
      <AnimatePresence>
        {concentrationFactor > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-6 flex items-center justify-center gap-3"
          >
            <button
              onClick={() => setCalcDirection('leaf-to-extract')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                calcDirection === 'leaf-to-extract'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
              }`}
            >
              <Leaf className="h-4 w-4" />
              Leaf → Extract
            </button>
            <ArrowLeftRight className="h-4 w-4 text-neutral-content" />
            <button
              onClick={() => setCalcDirection('extract-to-leaf')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                calcDirection === 'extract-to-leaf'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              Extract → Leaf
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Custom Dose Calculator ───────────────────────────────────── */}
      <AnimatePresence>
        {concentrationFactor > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="card card-transparent mb-8"
          >
            <div className="card-body">
              {calcDirection === 'leaf-to-extract' ? (
                <>
                  <h2 className="card-title text-base flex items-center gap-2 mb-4">
                    <Scale className="h-5 w-5" />
                    Leaf Powder Dose → Extract Equivalent
                  </h2>
                  <div className="flex gap-3 items-end mb-4">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-xs font-medium text-neutral-content">
                        Leaf Powder Dose (grams)
                      </label>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.5"
                        placeholder="e.g. 5"
                        value={leafDose}
                        onChange={(e) => setLeafDose(e.target.value)}
                        className="bg-base-200 border-base-300/50 text-lg h-12 font-mono"
                      />
                    </div>
                  </div>
                  {/* Quick-select leaf dose buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((g) => (
                      <button
                        key={g}
                        onClick={() => setLeafDose(String(g))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          leafGrams === g
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                        }`}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                  <AnimatePresence>
                    {customResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                      >
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm text-neutral-content">
                            {formatGrams(customResult.leafDose)}g leaf powder
                          </span>
                          <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                          <span className="text-xl font-bold font-mono text-emerald-400">
                            {formatGrams(customResult.extractDose)}g extract
                          </span>
                          <span className="text-xs text-neutral-content">
                            ({inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`})
                          </span>
                        </div>
                        {classifyLeafDose(customResult.leafDose) && (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className={`${classifyLeafDose(customResult.leafDose)!.color} ${classifyLeafDose(customResult.leafDose)!.bgColor} border-current/30 text-xs`}>
                              {classifyLeafDose(customResult.leafDose)!.emoji} {classifyLeafDose(customResult.leafDose)!.name}
                            </Badge>
                            <span className="text-xs text-neutral-content">{classifyLeafDose(customResult.leafDose)!.subtitle}</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <>
                  <h2 className="card-title text-base flex items-center gap-2 mb-4">
                    <FlaskConical className="h-5 w-5" />
                    Extract Amount → Leaf Powder Equivalent
                  </h2>
                  <div className="flex gap-3 items-end mb-4">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-xs font-medium text-neutral-content">
                        Extract Amount (grams)
                      </label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.1"
                        placeholder="e.g. 0.5"
                        value={extractAmountInput}
                        onChange={(e) => setExtractAmountInput(e.target.value)}
                        className="bg-base-200 border-base-300/50 text-lg h-12 font-mono"
                      />
                    </div>
                  </div>
                  <AnimatePresence>
                    {reverseResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                      >
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm text-neutral-content">
                            {formatGrams(reverseResult.extractDose)}g extract
                          </span>
                          <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                          <span className="text-xl font-bold font-mono text-emerald-400">
                            {formatGrams(reverseResult.leafEquivalent)}g leaf powder
                          </span>
                          <span className="text-xs text-neutral-content">equivalent</span>
                        </div>
                        {classifyLeafDose(reverseResult.leafEquivalent) && (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className={`${classifyLeafDose(reverseResult.leafEquivalent)!.color} ${classifyLeafDose(reverseResult.leafEquivalent)!.bgColor} border-current/30 text-xs`}>
                              {classifyLeafDose(reverseResult.leafEquivalent)!.emoji} {classifyLeafDose(reverseResult.leafEquivalent)!.name}
                            </Badge>
                            <span className="text-xs text-neutral-content">{classifyLeafDose(reverseResult.leafEquivalent)!.subtitle}</span>
                          </div>
                        )}
                        {reverseResult.leafEquivalent > 15 && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-400">
                            <Skull className="h-3.5 w-3.5 shrink-0" />
                            <span>This equivalent exceeds the heavy dose range. Exercise extreme caution.</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Dose Tier Cards ──────────────────────────────────────────── */}
      <AnimatePresence>
        {tierResults ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 mb-8"
          >
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Dose Tier Reference
            </h2>
            {tierResults.map((tier, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`card card-transparent card-lift ${tier.glowClass} border ${tier.borderColor}`}
              >
                <div className="card-body">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-lg">{tier.emoji}</span>
                        <span className={`text-lg font-bold ${tier.color}`}>{tier.name}</span>
                        <Badge
                          variant="outline"
                          className={`${tier.color} ${tier.bgColor} border-current/30 text-xs`}
                        >
                          {tier.subtitle}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-content mb-2 leading-relaxed">{tier.description}</p>
                    </div>
                    <div className="text-right shrink-0 bg-base-200/40 rounded-xl p-3 border border-base-300/30">
                      <div className={`text-2xl font-bold font-mono ${tier.color}`}>
                        {tier.rangeMin}g
                      </div>
                      <div className="text-xs text-neutral-content">to</div>
                      <div className={`text-2xl font-bold font-mono ${tier.color}`}>
                        {tier.rangeMax}g
                      </div>
                      <div className="text-[10px] text-neutral-content uppercase tracking-wider mt-0.5">
                        leaf powder
                      </div>
                    </div>
                  </div>

                  {/* Extract equivalents */}
                  <div className="mt-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-1.5">
                      <FlaskConical className="h-3.5 w-3.5" />
                      Extract Equivalent ({inputMode === 'percent' ? `${extractValue}% mitragynine` : `${extractValue}× ratio`})
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-semibold text-base-content">
                        {formatGrams(tier.minExtract)}g
                      </span>
                      <span className="text-neutral-content">to</span>
                      <span className="font-mono font-semibold text-base-content">
                        {formatGrams(tier.maxExtract)}g
                      </span>
                      <span className="text-xs text-neutral-content">extract</span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 text-xs text-neutral-content">
                    <Clock className="h-3 w-3" />
                    <span>Duration: <span className="font-medium text-base-content">{tier.duration}</span></span>
                    <span className="text-neutral-content/50">|</span>
                    <span className="font-mono">{tier.rangeMin}–{tier.rangeMax}g leaf</span>
                  </div>

                  <Separator className="my-2" />

                  {/* Effects */}
                  <div className="flex flex-wrap gap-1.5">
                    {tier.effects.map((effect, i) => (
                      <span
                        key={i}
                        className={`badge badge-outline text-xs ${tier.color} ${tier.bgColor}`}
                      >
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Overdose Warning */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="alert pulse-danger border border-red-500/30 bg-red-500/5"
            >
              <Skull className="h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold text-sm text-red-400">
                  Above Heavy Range (&gt;12g leaf / &gt;{formatGrams(leafToExtract(12, concentrationFactor))}g extract)
                </p>
                <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                  Doses exceeding 12g of equivalent leaf powder carry significant risk of respiratory depression,
                  seizures, liver toxicity, and potentially fatal outcomes. Extracts amplify these risks due to their
                  concentrated alkaloid content. Tolerance and individual sensitivity vary enormously. Seek emergency
                  medical attention if an overdose is suspected.
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ─── Empty State ─────────────────────────────────────────── */
          <div className="card card-transparent mb-8">
            <div className="card-body flex flex-col items-center py-16 text-center">
              <Scale className="h-12 w-12 text-neutral-content/30 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-content mb-1">Enter an extract strength to begin</h3>
              <p className="text-sm text-neutral-content/70 max-w-sm">
                Select or input your extract&apos;s mitragynine percentage or concentration ratio
                to see dose conversions for each tier.
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Pharmacological Notes ────────────────────────────────────── */}
      <div className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Important Pharmacological Notes
          </h2>
          <div className="space-y-3 text-sm text-neutral-content leading-relaxed">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-emerald-400 mb-1">Mitragynine vs. 7-Hydroxymitragynine</p>
                <p className="text-xs leading-relaxed">
                  Raw kratom leaf contains approximately 1–1.5% mitragynine by weight, which is the primary
                  alkaloid responsible for opioid receptor activity. 7-Hydroxymitragynine (7-OH), present in trace
                  amounts in raw leaf (~0.01%), is significantly more potent at mu-opioid receptors. Many commercial
                  extracts are enriched or spiked with 7-OH, which dramatically changes the potency and character
                  of effects beyond what the mitragynine percentage alone would suggest. Always check whether an
                  extract contains added 7-OH.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-400 mb-1">Bioavailability Differences</p>
                <p className="text-xs leading-relaxed">
                  Extracts may have different absorption profiles compared to raw leaf powder. The plant matrix in
                  whole leaf acts as a natural buffer, slowing absorption and moderating peak plasma concentrations.
                  Extracts, especially liquids and tinctures, can absorb much faster, leading to a sharper onset
                  and higher peak effects. This means the same equivalent dose of extract may feel subjectively
                  stronger than leaf powder, even after accounting for alkaloid concentration. Start significantly
                  lower than calculated.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-orange-400 mb-1">Full-Spectrum vs. Enhanced Extracts</p>
                <p className="text-xs leading-relaxed">
                  Full-spectrum extracts attempt to preserve the complete alkaloid profile of the leaf, which may
                  provide a more balanced experience. Enhanced or &ldquo;fortified&rdquo; extracts add isolated mitragynine
                  or 7-OH to boost potency beyond what the extraction process alone would yield. The calculations
                  in this tool assume standard extracts where the stated percentage reflects the total mitragynine
                  content. Enhanced products may be significantly more potent than labeled. Source verification
                  is critical.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-400 mb-1">Tolerance and Dependency</p>
                <p className="text-xs leading-relaxed">
                  Regular kratom use leads to rapid tolerance development, requiring escalating doses to achieve
                  the same effects. Extracts accelerate this process significantly due to their higher alkaloid
                  concentrations. Physical dependence can develop within weeks of daily use, and withdrawal
                  symptoms (anxiety, insomnia, muscle aches, irritability, diarrhea) can be severe. Using extracts
                  frequently dramatically increases dependency risk. Tolerance breaks of 2–4 weeks are recommended
                  between cycles of use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Harm Reduction Guidelines ────────────────────────────────── */}
      <div className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Harm Reduction Guidelines
          </h2>
          <ul className="space-y-3 mt-2">
            {[
              'Always start with a dose well below the calculated equivalent when trying a new extract. Individual sensitivity varies enormously, and extracts can absorb faster than raw leaf. A test dose of 25–50% of the calculated amount is recommended.',
              'Never mix kratom (especially extracts) with other CNS depressants including alcohol, benzodiazepines, opioids, or gabapentinoids. The combination significantly increases the risk of respiratory depression, which can be fatal.',
              'If using extracts regularly, track your usage carefully. Tolerance to extracts builds faster than to raw leaf powder, and the margin of safety narrows as doses increase. Consider setting a maximum weekly total.',
              'Stay hydrated and maintain adequate nutrition. Kratom suppresses appetite and can contribute to dehydration, especially at higher doses. These effects compound with extract use.',
              'Store extracts securely and clearly labeled. Because extract doses are much smaller by weight than leaf powder, accidental overdose is easier. A digital milligram scale (0.001g precision) is strongly recommended.',
              'Be aware of the legal status of kratom and its extracts in your jurisdiction. Kratom is regulated or banned in several countries and US states. Possession of concentrated extracts may carry additional legal risk.',
              'If you experience signs of excessive opioid effects — extreme drowsiness, slow or shallow breathing, confusion, or loss of consciousness — seek emergency medical care immediately. Naloxone may be partially effective for kratom overdose.',
              'Plan for withdrawal if using regularly. Tapering gradually over 2–4 weeks is preferred over abrupt cessation. Consider consulting a medical professional for a tapering schedule, especially if using concentrated extracts.',
            ].map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20"
              >
                <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                <span className="text-sm leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── Quick Reference Table ────────────────────────────────────── */}
      <div className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Quick Reference — Common Extract Equivalents
          </h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Leaf (g)</th>
                  <th>10% Extract</th>
                  <th>20% Extract</th>
                  <th>45% Extract</th>
                  <th>50% Extract</th>
                </tr>
              </thead>
              <tbody>
                {doseTiers.map((tier, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`font-semibold ${tier.color}`}>
                        {tier.emoji} {tier.name}
                      </span>
                    </td>
                    <td className="font-mono">{tier.rangeMin}–{tier.rangeMax}g</td>
                    <td className="font-mono text-xs">{formatGrams(tier.rangeMin / percentToRatio(10))}–{formatGrams(tier.rangeMax / percentToRatio(10))}g</td>
                    <td className="font-mono text-xs">{formatGrams(tier.rangeMin / percentToRatio(20))}–{formatGrams(tier.rangeMax / percentToRatio(20))}g</td>
                    <td className="font-mono text-xs">{formatGrams(tier.rangeMin / percentToRatio(45))}–{formatGrams(tier.rangeMax / percentToRatio(45))}g</td>
                    <td className="font-mono text-xs">{formatGrams(tier.rangeMin / percentToRatio(50))}–{formatGrams(tier.rangeMax / percentToRatio(50))}g</td>
                  </tr>
                ))}
                <tr className="text-red-400">
                  <td className="font-semibold">
                    <Skull className="inline h-3 w-3 mr-1" />
                    Danger
                  </td>
                  <td className="font-mono">&gt;12g</td>
                  <td className="font-mono text-xs">&gt;{formatGrams(12 / percentToRatio(10))}g</td>
                  <td className="font-mono text-xs">&gt;{formatGrams(12 / percentToRatio(20))}g</td>
                  <td className="font-mono text-xs">&gt;{formatGrams(12 / percentToRatio(45))}g</td>
                  <td className="font-mono text-xs">&gt;{formatGrams(12 / percentToRatio(50))}g</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-content mt-3">
            Leaf powder assumed to contain ~{BASE_MITRAGYNINE_PCT}% mitragynine. Actual content varies by strain, source, and age (typically 0.8–2.0%).
          </p>
        </div>
      </div>

      {/* ─── Emergency Resources ──────────────────────────────────────── */}
      <div className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            Emergency Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-xs font-medium text-red-400 mb-1">Poison Control (US)</p>
              <p className="text-lg font-bold font-mono text-base-content">1-800-222-1222</p>
              <p className="text-[10px] text-neutral-content mt-1">Available 24/7, free, confidential</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-xs font-medium text-red-400 mb-1">Emergency Services</p>
              <p className="text-lg font-bold font-mono text-base-content">911</p>
              <p className="text-[10px] text-neutral-content mt-1">Call immediately if someone is unresponsive or in distress</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer Disclaimer ────────────────────────────────────────── */}
      <div className="text-center py-6 text-xs text-neutral-content/50 space-y-1">
        <p>
          Information sourced from{' '}
          <a href="https://psychonautwiki.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-content">
            PsychonautWiki
          </a>
          ,{' '}
          <a href="https://erowid.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-content">
            Erowid
          </a>
          , and peer-reviewed pharmacological literature.
        </p>
        <p>This tool is intended for harm reduction and educational purposes only. It is not medical advice.</p>
      </div>
    </div>
  )
}
