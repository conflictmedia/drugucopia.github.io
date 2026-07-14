'use client'

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import {
  Scale,
  Pill,
  Droplets,
  AlertTriangle,
  Info,
  Calculator,
  Shield,
  Syringe,
  Clock,
  Heart,
  Skull,
  Sun,
  Waves,
  Orbit,
  ArrowLeftRight,
  Copy,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  CalendarDays,
  Sparkles,
  Download,
  Upload,
  X,
  Timer,
  Cloud,
  CloudOff,
  Lock,
  CheckCircle2,
  Pencil,
  FileJson,
  FileText,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { useDoseStore } from '@/store/dose-store'
import { toast } from '@/hooks/use-toast'
import { dextromethorphan as dxm } from '@/lib/substances/dissociatives/dextromethorphan'
import { RedosePlanner } from '@/components/redose-planner'
import type { DoseLog } from '@/types'
import {
  plateaus,
  otcProducts,
  MAX_PLATEAU_MGKG,
  MIN_PLATEAU_MGKG,
  getPlateauSpectrumPercent,
  getPlateauStartPercent,
  getPlateauSpectrumColor,
  formatGrams,
  type Plateau,
  type OTCProduct,
  type CalculatedPlateau,
  type OTCConversion,
  type DxmSettings,
} from './dxm-calculator-logic'

// ─── Reusable Collapsible Section Component ─────────────────────────────────

function SectionToggle({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  icon: React.ElementType
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="card card-transparent mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full card-body flex-row items-center justify-between p-4 text-left hover:bg-base-200/20 transition-colors"
        aria-expanded={isOpen}
      >
        <h2 className="card-title text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </h2>
        {isOpen ? <ChevronUp className="h-4 w-4 text-neutral-content" /> : <ChevronDown className="h-4 w-4 text-neutral-content" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Page Component ────────────────────────────────────────────────────────

function DXMCalculatorContent() {
  const searchParams = useSearchParams()
  const addDose = useDoseStore(s => s.addDose)

  // ─── Inputs ──────────────────────────────────────────────────────────────

  // B1 — Persist calculator inputs across sessions.
  // Priority on first load: URL param (shared links win) → localStorage
  // (last-used values) → default. After that, every change writes back
  // to localStorage so a fresh visit / page reload restores the user's
  // last weight + unit + plateau without them having to re-type it.
  const DXM_SETTINGS_KEY = 'drugucopia-dxm-settings'

  type DxmSettings = { weight?: string; unit?: 'kg' | 'lbs'; plateau?: number }
  function loadDxmSettings(): DxmSettings {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem('drugucopia-dxm-settings')
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as DxmSettings
    } catch {
      /* ignore corrupt entry */
    }
    return {}
  }
  const savedDxm = loadDxmSettings()

  const [weight, setWeight] = useState<string>(() => {
    const url = searchParams.get('weight')
    if (url !== null) return url
    return savedDxm.weight ?? ''
  })
  const [unit, setUnit] = useState<'kg' | 'lbs'>(() => {
    const u = searchParams.get('unit')
    if (u === 'kg' || u === 'lbs') return u
    return savedDxm.unit ?? 'lbs'
  })
  const [selectedPlateauIdx, setSelectedPlateauIdx] = useState<number>(() => {
    const v = searchParams.get('plateau')
    const n = v ? parseInt(v, 10) : NaN
    if (!isNaN(n) && n >= 0 && n < plateaus.length) return n
    if (typeof savedDxm.plateau === 'number' && savedDxm.plateau >= 0 && savedDxm.plateau < plateaus.length) {
      return savedDxm.plateau
    }
    return 0
  })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pharmacology: false,
    harmReduction: false,
    otcRef: false,
    emergency: false,
  })
  const [copied, setCopied] = useState(false)
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)

  // B1 — Save inputs to localStorage whenever they change so the next
  // visit restores them. Skip the very first render (initial values
  // already came from localStorage) to avoid a redundant write.
  useEffect(() => {
    try {
      localStorage.setItem(
        'drugucopia-dxm-settings',
        JSON.stringify({ weight, unit, plateau: selectedPlateauIdx }),
      )
    } catch {
      /* ignore quota errors */
    }
  }, [weight, unit, selectedPlateauIdx])

  // Sync URL when inputs change.
  // IMPORTANT: use window.history.replaceState — NOT router.replace().
  // router.replace() in Next 16 App Router triggers an RSC fetch on every
  // call, even when only query params changed. Since the calculator
  // updates the URL on every keystroke, that produced a flood of 304
  // Not Modified responses in the network tab. replaceState updates the
  // address bar (for shareable links) without any server round-trip.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    if (weight) params.set('weight', weight)
    if (unit !== 'lbs') params.set('unit', unit)
    if (selectedPlateauIdx !== 0) params.set('plateau', String(selectedPlateauIdx))

    const query = params.toString()
    // Preserve the current pathname (incl. trailing slash from trailingSlash: true)
    // so we don't trigger a redirect-to-add-trailing-slash on reload.
    const currentPath = window.location.pathname
    const newUrl = query ? `${currentPath}?${query}` : currentPath
    window.history.replaceState(null, '', newUrl)
  }, [weight, unit, selectedPlateauIdx])

  // ─── Derived values ──────────────────────────────────────────────────────

  const weightKg = useMemo(() => {
    const w = parseFloat(weight)
    if (isNaN(w) || w <= 0) return 0
    return unit === 'lbs' ? w / 2.20462 : w
  }, [weight, unit])

  const hasValidWeight = weightKg > 0

  const calculatedDoses = useMemo(() => {
    if (weightKg <= 0) return null
    return plateaus.map((p) => ({
      ...p,
      minDose: Math.round(p.rangeMin * weightKg),
      maxDose: Math.round(p.rangeMax * weightKg),
    }))
  }, [weightKg])

  const otcConversions = useMemo(() => {
    if (!calculatedDoses) return null
    return calculatedDoses.map((dose) =>
      otcProducts.map((product) => ({
        ...product,
        minUnits: Math.ceil(dose.minDose / product.dxmPerUnit),
        maxUnits: Math.ceil(dose.maxDose / product.dxmPerUnit),
      }))
    )
  }, [calculatedDoses])

  const activePlateau = useMemo(() => {
    if (!calculatedDoses) return null
    return calculatedDoses[selectedPlateauIdx]
  }, [calculatedDoses, selectedPlateauIdx])

  const activeOtcConversions = useMemo(() => {
    if (!otcConversions) return null
    return otcConversions[selectedPlateauIdx]
  }, [otcConversions, selectedPlateauIdx])

  const overdoseThresholdMg = useMemo(() => Math.round(MAX_PLATEAU_MGKG * weightKg), [weightKg])

  // ─── Warnings / validation ───────────────────────────────────────────────
  const inputWarnings = useMemo(() => {
    const warnings: string[] = []
    if (hasValidWeight && weightKg > 250) {
      warnings.push('Weight seems unusually high — please double-check your unit (kg vs lbs).')
    }
    if (hasValidWeight && weightKg < 25) {
      warnings.push('Weight seems unusually low — DXM dosing for children or very low body weight should be medically supervised.')
    }
    return warnings
  }, [hasValidWeight, weightKg])

  // ─── Handlers ────────────────────────────────────────────────────────────
  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleReset = useCallback(() => {
    setWeight('')
    setUnit('lbs')
    setSelectedPlateauIdx(0)
    setCopied(false)
  }, [])

  const handleCopyResult = useCallback(() => {
    if (!calculatedDoses) return
    const lines = calculatedDoses.map((p) => `${p.name}: ${p.minDose}–${p.maxDose} mg DXM`)
    const header = `DXM Plateau Doses (${unit === 'lbs' ? `${weight} lbs` : `${weight} kg`} / ${weightKg.toFixed(1)} kg)`
    const text = [header, ...lines].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [calculatedDoses, weightKg, weight, unit])

  const handleLogDose = useCallback(() => {
    if (!activePlateau || activePlateau.maxDose <= 0) return
    // Ensure store is loaded from localStorage before appending a new dose
    useDoseStore.getState().initialize()
    const now = new Date().toISOString()
    const duration = dxm.routeData?.oral?.duration ?? null
    const midpointDose = Math.round((activePlateau.minDose + activePlateau.maxDose) / 2)
    const notes = [
      'Calculated via DXM Dose Calculator.',
      `Body weight: ${unit === 'lbs' ? `${weight} lbs` : `${weight} kg`} (${weightKg.toFixed(1)} kg).`,
      `Plateau: ${activePlateau.name} (${activePlateau.rangeMin}–${activePlateau.rangeMax} mg/kg).`,
      `Computed range: ${activePlateau.minDose}–${activePlateau.maxDose} mg. Logged midpoint (${midpointDose} mg).`,
    ].join(' ')

    const newLog: DoseLog = {
      id: `dose_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      substanceId: dxm.id,
      substanceName: dxm.name,
      categories: dxm.categories,
      amount: midpointDose,
      unit: 'mg',
      route: 'oral',
      timestamp: now,
      duration,
      notes: notes || null,
      mood: null,
      setting: null,
      intensity: null,
      createdAt: now,
      updatedAt: now,
    }

    useDoseStore.getState().addDose(newLog)
    toast({
      title: 'Dose logged',
      description: `${midpointDose} mg DXM (${activePlateau.name}) logged.`,
    })
  }, [activePlateau, weightKg, weight, unit, addDose])

  const weightPresets = unit === 'lbs' ? [120, 150, 180, 200, 220] : [55, 68, 82, 90, 100]

  return (
    <div className="min-h-screen px-4 pt-8 pb-8 lg:px-8 max-w-5xl mx-auto max-md:safe-area-pb-min">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 glow-cyan">
            <Calculator className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">DXM Dose Calculator</h1>
            <p className="text-sm text-neutral-content">
              Dextromethorphan recreational dose calculator based on body weight (mg/kg)
            </p>
          </div>
        </div>
        <div className="alert alert-warning text-xs mt-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            This calculator is for <strong>harm reduction purposes only</strong>. DXM carries serious risks
            at high doses and has dangerous drug interactions — especially with MAOIs, SSRIs, SNRIs, and
            alcohol. Always research thoroughly, start low, and use a trip sitter.
          </span>
        </div>
      </header>

      {/* ─── Step Guide ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { step: '1', text: 'Enter your body weight (lbs or kg)' },
          { step: '2', text: 'Review the four plateau dose ranges' },
          { step: '3', text: 'Check OTC product equivalents and harm reduction' },
        ].map((item) => (
          <div
            key={item.step}
            className="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 border border-base-300/50"
          >
            <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-bold">
              {item.step}
            </div>
            <span className="text-sm text-neutral-content">{item.text}</span>
          </div>
        ))}
      </div>

      {/* ─── Weight Input ────────────────────────────────────────────────── */}
      <section className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5" />
            Body Weight
          </h2>

          <label className="mb-1.5 block text-xs font-medium text-neutral-content text-center">
            Your body weight
          </label>
          <div className="flex gap-3 items-end max-w-md mx-auto mb-4">
            <div className="relative flex-1">
              <Input
                type="number"
                min="1"
                step="0.1"
                placeholder={unit === 'lbs' ? 'e.g. 150' : 'e.g. 68'}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-base-200 border-base-300/50 text-lg h-12 font-mono"
              />
            </div>
            <div className="flex rounded-lg border border-base-300 overflow-hidden h-12">
              <button
                onClick={() => setUnit('lbs')}
                className={`px-4 text-sm font-medium transition-colors ${unit === 'lbs'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-neutral-content hover:bg-base-300'
                  }`}
              >
                lbs
              </button>
              <button
                onClick={() => setUnit('kg')}
                className={`px-4 text-sm font-medium transition-colors ${unit === 'kg'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-neutral-content hover:bg-base-300'
                  }`}
              >
                kg
              </button>
            </div>
          </div>

          {/* Weight presets */}
          <div className="flex flex-wrap gap-2 mb-2 justify-center">
            {weightPresets.map((w) => (
              <button
                key={w}
                onClick={() => setWeight(String(w))}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors min-h-[36px] ${parseFloat(weight) === w
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                  }`}
              >
                {w} {unit}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {hasValidWeight && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-neutral-content mt-2 font-mono text-center"
              >
                {unit === 'lbs' ? `${weight} lbs ≈ ${weightKg.toFixed(1)} kg` : `${weight} kg`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── Validation Warnings ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {inputWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="alert alert-warning text-xs mb-6"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <ul className="list-disc list-inside space-y-1">
              {inputWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hero Result Card ─────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {calculatedDoses && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="card card-transparent border-cyan-500/30 glow-cyan mb-6"
            aria-live="polite"
          >
            <div className="card-body">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <h2 className="card-title text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Your Plateau Doses
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handleCopyResult} className="h-8 px-3 text-xs">
                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogDose} className="h-8 px-3 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Log dose
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsPlanDialogOpen(true)} className="h-8 px-3 text-xs">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    Plan redoses
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReset} className="h-8 px-3 text-xs">
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap mb-4">
                <span className="text-sm text-neutral-content">
                  {unit === 'lbs' ? `${weight} lbs` : `${weight} kg`} ({weightKg.toFixed(1)} kg)
                </span>
                <ArrowLeftRight className="h-4 w-4 text-cyan-400" />
                <span className="text-3xl font-bold font-mono text-cyan-400">
                  {calculatedDoses[0].minDose}–{calculatedDoses[3].maxDose}
                </span>
                <span className="text-sm text-neutral-content">mg DXM total range</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {calculatedDoses.map((p, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={`${p.color} ${p.bgColor} border-current/30 text-xs px-2 py-1`}
                  >
                    <span className="mr-1">{p.emoji}</span> {p.name.replace(' Plateau', '')}: {p.minDose}–{p.maxDose} mg
                  </Badge>
                ))}
              </div>

              {/* Recommendation box */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 mb-3">
                <p className="text-sm text-neutral-content leading-relaxed">
                  <strong className="text-cyan-400">First time?</strong> Stay within the First Plateau
                  (<span className="font-mono font-semibold text-base-content">
                    {calculatedDoses[0].minDose}–{calculatedDoses[0].maxDose} mg
                  </span>) to assess your individual sensitivity and CYP2D6 metabolism. Never exceed the
                  Second Plateau without prior experience and a trip sitter present.
                </p>
              </div>

              {/* Overdose warning */}
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400 flex items-start gap-2">
                <Skull className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Above Fourth Plateau ({'>'}{overdoseThresholdMg} mg / {'>'}{MAX_PLATEAU_MGKG} mg/kg) carries
                  severe risk of psychosis, seizures, serotonin syndrome, respiratory depression, and
                  potentially fatal outcomes. This territory provides no redeeming recreational value.
                </span>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Dose Spectrum Bar ────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {calculatedDoses && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-6"
          >
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Dose Spectrum
            </h2>
            <div className="relative rounded-xl overflow-hidden border border-base-300 h-10">
              {plateaus.map((p, i) => (
                <div
                  key={i}
                  className={`absolute top-0 h-full ${getPlateauSpectrumColor(p)} ${p.borderColor} border-r flex items-center justify-center text-[10px] font-medium ${p.color} transition-all duration-300`}
                  style={{
                    left: `${getPlateauStartPercent(p)}%`,
                    width: `${getPlateauSpectrumPercent(p)}%`,
                  }}
                  title={`${p.name}: ${p.rangeMin}–${p.rangeMax} mg/kg`}
                >
                  <span className="hidden sm:inline truncate px-1">{p.name.replace(' Plateau', '')}</span>
                </div>
              ))}
              {/* Active plateau marker (highlights selected tier's start) */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 transition-all duration-300"
                style={{ left: `${getPlateauStartPercent(plateaus[selectedPlateauIdx])}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-content mt-1 px-1">
              <span>{MIN_PLATEAU_MGKG} mg/kg</span>
              <span>{MAX_PLATEAU_MGKG} mg/kg</span>
            </div>
            <p className="text-xs text-neutral-content mt-2 text-center">
              Currently viewing <span className="font-semibold text-base-content">{activePlateau?.name}</span>{' '}
              ({activePlateau?.minDose}–{activePlateau?.maxDose} mg DXM)
            </p>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Plateau Detail (selector + active card) ───────────────────────── */}
      <AnimatePresence initial={false}>
        {calculatedDoses && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="mb-6"
          >
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Plateau Details
            </h2>

            {/* Plateau selector tabs */}
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {calculatedDoses.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPlateauIdx(i)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors min-h-[36px] ${selectedPlateauIdx === i
                    ? `${p.borderColor} ${p.bgColor} ${p.color}`
                    : 'border-base-300 bg-base-200/50 text-neutral-content hover:bg-base-300'
                    }`}
              >
                <p.icon className="h-3.5 w-3.5" />
                {p.name.replace(' Plateau', '')}
              </button>
            ))}
            </div>

            {/* Active plateau detail card */}
            {activePlateau && (
              <motion.div
                key={selectedPlateauIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`card card-transparent card-lift border ${activePlateau.borderColor} ${activePlateau.glowClass}`}
              >
                <div className="card-body">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <activePlateau.icon className={`h-5 w-5 ${activePlateau.color}`} aria-hidden="true" />
                        <span className={`text-xl font-bold ${activePlateau.color}`}>{activePlateau.name}</span>
                        <Badge
                          variant="outline"
                          className={`${activePlateau.color} ${activePlateau.bgColor} border-current/30 text-xs`}
                        >
                          {activePlateau.subtitle}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-content leading-relaxed">{activePlateau.description}</p>
                    </div>
                    <div className="text-right shrink-0 bg-base-200/40 rounded-xl p-3 border border-base-300/30">
                      <div className={`text-2xl font-bold font-mono ${activePlateau.color}`}>
                        {activePlateau.minDose}
                      </div>
                      <div className="text-xs text-neutral-content">to</div>
                      <div className={`text-2xl font-bold font-mono ${activePlateau.color}`}>
                        {activePlateau.maxDose}
                      </div>
                      <div className="text-[10px] text-neutral-content uppercase tracking-wider mt-0.5">
                        mg DXM
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 text-xs text-neutral-content">
                    <Clock className="h-3 w-3" />
                    <span>Duration: <span className="font-medium text-base-content">{activePlateau.duration}</span></span>
                    <span className="text-neutral-content/50">|</span>
                    <span>
                      Range: <span className="font-mono">{activePlateau.rangeMin}–{activePlateau.rangeMax} mg/kg</span>
                    </span>
                  </div>

                  <Separator className="my-2" />

                  {/* Effects */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {activePlateau.effects.map((effect, i) => (
                      <span
                        key={i}
                        className={`badge badge-outline text-xs ${activePlateau.color} ${activePlateau.bgColor}`}
                      >
                        {effect}
                      </span>
                    ))}
                  </div>

                  {/* OTC Product Conversion */}
                  {activeOtcConversions && (
                    <div className="mt-1 rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3">
                      <p className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-1.5">
                        <Syringe className="h-3.5 w-3.5" />
                        OTC Product Equivalent
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeOtcConversions.map((product, pi) => (
                          <div
                            key={pi}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200/50 border border-base-300/50"
                          >
                            <span className="text-xs text-neutral-content truncate mr-2">{product.name}</span>
                            <span className={`text-xs font-mono font-medium ${activePlateau.color} whitespace-nowrap`}>
                              {product.minUnits}–{product.maxUnits} {product.unitLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                      {activeOtcConversions.some((p) => p.warning) && (
                        <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-yellow-400 leading-relaxed">
                            {activeOtcConversions.find((p) => p.warning)?.warning}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Compact Plateau Reference Grid ───────────────────────────────── */}
      <AnimatePresence initial={false}>
        {calculatedDoses && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="mb-6"
          >
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Pill className="h-4 w-4" />
              All Plateaus
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {calculatedDoses.map((p, idx) => {
                const isActive = selectedPlateauIdx === idx
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedPlateauIdx(idx)}
                    className={`text-left card card-transparent p-3 border transition-all ${isActive ? `${p.borderColor} ${p.glowClass}` : 'border-base-300/50 opacity-70 hover:opacity-100'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold text-sm ${p.color}`}>
                        {p.emoji} {p.name.replace(' Plateau', '')}
                      </span>
                      <span className="text-xs text-neutral-content">{p.rangeMin}–{p.rangeMax} mg/kg</span>
                    </div>
                    <div className="text-xs text-neutral-content mb-2">{p.subtitle}</div>
                    <div className="text-xs font-mono text-base-content">
                      {formatGrams(p.minDose)}–{formatGrams(p.maxDose)} mg DXM
                    </div>
                  </button>
                )
              })}
              <div className="card card-transparent p-3 border border-red-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-red-400 flex items-center gap-1.5">
                    <Skull className="h-3.5 w-3.5" />
                    Overdose
                  </span>
                  <span className="text-xs text-neutral-content">{MAX_PLATEAU_MGKG} mg/kg</span>
                </div>
                <div className="text-xs text-red-400">Dangerous / Potentially Fatal</div>
                <div className="text-xs font-mono text-base-content mt-1">
                  {'>'}{formatGrams(MAX_PLATEAU_MGKG * weightKg)} mg DXM
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Collapsible Pharmacological Notes ────────────────────────────── */}
      <SectionToggle
        title="Important Pharmacological Notes"
        icon={Info}
        isOpen={expandedSections.pharmacology}
        onToggle={() => toggleSection('pharmacology')}
      >
        <div className="space-y-3 text-sm text-neutral-content leading-relaxed">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
            <Info className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-cyan-400 mb-1">DXM vs. Dextrorphan Metabolism</p>
              <p className="text-xs leading-relaxed">
                DXM is metabolized by CYP2D6 into dextrorphan (DXO), which has much higher affinity for NMDA
                receptors. ~5&ndash;10% of Caucasians are CYP2D6 poor metabolizers &mdash; they convert less DXM to DXO,
                experiencing less dissociation but more serotonin effects. Ultra-rapid metabolizers may experience
                unexpectedly intense dissociation. Consider starting at the lowest dose if metabolism is unknown.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-400 mb-1">Serotonin Syndrome Risk</p>
              <p className="text-xs leading-relaxed">
                DXM is a serotonin reuptake inhibitor. Combining with SSRIs, SNRIs, MAOIs, tricyclics,
                tramadol, or other serotonergic drugs can cause serotonin syndrome — a potentially fatal
                condition with symptoms including hyperthermia, rigidity, confusion, and autonomic instability.
                Never combine DXM with antidepressants or other serotonergic drugs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-orange-400 mb-1">Plateau Dosage Individual Variability</p>
              <p className="text-xs leading-relaxed">
                The mg/kg ranges are population averages. Individual sensitivity varies enormously due to
                CYP2D6 genotype, body composition, tolerance, and stomach contents. Some users report
                Third Plateau effects at Second Plateau doses, and vice versa. Always treat calculated
                ranges as rough guides, not guarantees. Start significantly lower than calculated when
                trying a new batch or if you have limited experience.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-400 mb-1">Delsym / Polistirex Warning</p>
              <p className="text-xs leading-relaxed">
                Delsym (and generic equivalents) contains DXM polistirex, an extended-release formulation.
                Effects last 8–12 hours but feel weaker per mg. Do NOT redose early or double-dose to
                compensate — the delayed peak can lead to accidental overdose. Wait the full duration
                before considering redosing. The calculator treats all products as immediate-release HBr
                unless you specifically select a polistirex product.
              </p>
            </div>
          </div>
        </div>
      </SectionToggle>

      {/* ─── Collapsible Harm Reduction Guidelines ─────────────────────────── */}
      <SectionToggle
        title="Harm Reduction Guidelines"
        icon={Shield}
        isOpen={expandedSections.harmReduction}
        onToggle={() => toggleSection('harmReduction')}
      >
        <ul className="space-y-3">
          {[
            'Always start with a dose well below the calculated equivalent when trying a new DXM product. Individual sensitivity varies enormously, and the margin of safety narrows at higher plateaus. A test dose of 25–50% of the calculated amount is recommended.',
            'Never mix DXM (especially higher plateaus) with other CNS depressants including alcohol, benzodiazepines, opioids, or gabapentinoids. The combination significantly increases the risk of respiratory depression, which can be fatal.',
            'If using DXM regularly, track your usage carefully. Tolerance builds rapidly, and the margin of safety narrows as doses increase. Consider setting a maximum weekly total and enforcing breaks of at least 2–4 weeks between uses.',
            'Stay hydrated and maintain adequate nutrition. DXM suppresses appetite and can contribute to dehydration, especially at higher plateaus. These effects compound with extended use.',
            'Store DXM products securely and clearly labeled. Because recreational doses are much smaller by weight than therapeutic doses, accidental overdose is easier. A digital milligram scale (0.001g precision) is strongly recommended for powder/gelcap products.',
            'Be aware of the legal status of DXM in your jurisdiction. DXM is regulated or restricted in several countries and US states. Possession of large quantities may carry additional legal risk.',
            'If you experience signs of excessive NMDA antagonism — extreme dissociation, inability to move, slow or shallow breathing, confusion, or loss of consciousness — seek emergency medical care immediately. Naloxone is NOT effective for DXM overdose as it does not act on opioid receptors.',
            'Plan for withdrawal if using regularly. Tapering gradually over 2–4 weeks is preferred over abrupt cessation. Consider consulting a medical professional for a tapering schedule, especially if using high doses or polistirex formulations.',
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
      </SectionToggle>

      {/* ─── Collapsible OTC Product Reference Table ─────────────────────── */}
      <SectionToggle
        title="OTC Product Equivalents"
        icon={Syringe}
        isOpen={expandedSections.otcRef}
        onToggle={() => toggleSection('otcRef')}
      >
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Product</th>
                <th>DXM per Unit</th>
                <th>Plateau 1<br />{calculatedDoses?.[0].minDose}–{calculatedDoses?.[0].maxDose} mg</th>
                <th>Plateau 2<br />{calculatedDoses?.[1].minDose}–{calculatedDoses?.[1].maxDose} mg</th>
                <th>Plateau 3<br />{calculatedDoses?.[2].minDose}–{calculatedDoses?.[2].maxDose} mg</th>
                <th>Plateau 4<br />{calculatedDoses?.[3].minDose}–{calculatedDoses?.[3].maxDose} mg</th>
              </tr>
            </thead>
            <tbody>
              {otcProducts.map((product, i) => (
                <tr key={i}>
                  <td>
                    <span className="font-medium">{product.name}</span>
                    {product.warning && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        <span className="text-[10px] text-yellow-400">⚠</span>
                      </span>
                    )}
                  </td>
                  <td className="font-mono">{product.dxmPerUnit} mg/{product.unitLabel}</td>
                  {calculatedDoses?.map((p, pi) => (
                    <td key={pi} className="font-mono text-xs">
                      {Math.ceil(p.minDose / product.dxmPerUnit)}–{Math.ceil(p.maxDose / product.dxmPerUnit)} {product.unitLabel}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="text-red-400">
                <td className="font-semibold">
                  <Skull className="inline h-3 w-3 mr-1" />
                  Overdose
                </td>
                <td className="font-mono">{'>'}{MAX_PLATEAU_MGKG} mg/kg</td>
                {calculatedDoses?.map((p, pi) => (
                  <td key={pi} className="font-mono text-xs">
                    {'>'}{Math.ceil(MAX_PLATEAU_MGKG * weightKg / otcProducts[pi]?.dxmPerUnit || 0)} {otcProducts[pi]?.unitLabel}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-content mt-3">
          Table assumes {unit === 'lbs' ? `${weight} lbs (${weightKg.toFixed(1)} kg)` : `${weight} kg`} body weight. Doses rounded up to nearest whole unit.
          {'\n'}⚠ = product-specific warning (see below).
        </p>
      </SectionToggle>

      {/* ─── Collapsible Emergency Resources ──────────────────────────────── */}
      <SectionToggle
        title="Emergency Resources"
        icon={Heart}
        isOpen={expandedSections.emergency}
        onToggle={() => toggleSection('emergency')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </SectionToggle>

      {/* ─── Redose Planner ──────────────────────────────────────────────── */}
      <RedosePlanner
        open={isPlanDialogOpen}
        onOpenChange={setIsPlanDialogOpen}
        substance={dxm}
        baseAmount={activePlateau ? Math.round((activePlateau.minDose + activePlateau.maxDose) / 2) : 0}
        baseUnit="mg"
        route="oral"
        duration={dxm.routeData?.oral?.duration ?? null}
        notes={`Calculated via DXM Dose Calculator. Body weight: ${unit === 'lbs' ? `${weight} lbs` : `${weight} kg`} (${weightKg.toFixed(1)} kg). Plateau: ${activePlateau?.name} (${activePlateau?.rangeMin}–${activePlateau?.rangeMax} mg/kg).`}
        logInitialDose={true}
      />

      <footer className="text-center py-6 text-xs text-neutral-content/50 space-y-1">
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
      </footer>
    </div>
  )
}

export default function DXMCalculatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen px-4 py-8 lg:px-8 max-w-5xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <Calculator className="h-10 w-10 text-cyan-400 animate-pulse mx-auto mb-3" />
            <p className="text-sm text-neutral-content">Loading calculator...</p>
          </div>
        </div>
      }
    >
      <DXMCalculatorContent />
    </Suspense>
  )
}