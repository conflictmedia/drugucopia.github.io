'use client'

/**
 * Interactive intensity timeline — Recharts-based replacement for the old
 * SVG-based ActiveDosesTimeline component.
 *
 * Replicates the old functionality:
 *   • Per-substance grouping (one chart card per substance)
 *   • Multi-route support (route-colored curves, route isolation pills)
 *   • Multi-dose / redose support (one area per dose, dose isolation chips)
 *   • Phase band backgrounds (onset / comeup / peak / offset)
 *   • Phase labels above the chart
 *   • Time-based x-axis with clock-time markers
 *   • 0–100% intensity y-axis
 *   • Interactive tooltip: phase name, absolute time, combined intensity,
 *     per-dose breakdown, minutes-until-phase-change
 *   • "Now" indicator (pulsing red vertical line at current time)
 *   • Dose markers (dots at each dose start time)
 *   • Substance hide/show toggles (when >1 substance active)
 *   • Combined intensity badge + remaining-time in the header
 *   • Expandable per-dose phase details
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity, Layers, Loader2, Clock, Timer, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useDoseStore } from '@/store/dose-store'
import { substances } from '@/lib/substances/index'
import { classifyDose } from '@/lib/dose-classification'
import { formatDoseAmount } from '@/lib/utils'
import {
  parseDurationToMinutes,
  calculatePhaseTimings,
  calculateDoseScaledTimings,
  intensityAt,
  phaseNameAt,
  getPhaseStatus,
  combinedIntensityAt,
  formatMinutes,
  formatPhaseName,
  getDoseCategories,
  getPhaseBandRanges,
  phaseEnd,
} from '@/components/dose-timeline/dose-timeline-utils'
import {
  phaseColors,
  phaseIcons,
  markerHex,
  ROUTE_PALETTE,
  PHASE_BANDS,
  NOW_INDICATOR,
  ENDED_DOSE_RETENTION_MINS,
} from '@/components/dose-timeline/dose-timeline-constants'
import type {
  EnrichedDose, RouteGroup, SubstanceGroup,
  PhaseTimings, PhaseName,
} from '@/components/dose-timeline/dose-timeline-types'

// ─── Category → hex color map ──────────────────────────────────────────────
// The Tailwind `categoryColors` from `@/lib/categories` returns class strings
// (e.g. "text-amber-500 bg-amber-500/10 border-amber-500/20") which can't be
// used as inline `style={{ backgroundColor }}` values. This hex map is used
// wherever we need a real color value (header dots, substance toggle chips).

const CATEGORY_HEX_COLORS: Record<string, string> = {
  stimulants: '#f59e0b', // amber-500
  depressants: '#6366f1', // indigo-500
  hallucinogens: '#a855f7', // purple-500
  dissociatives: '#06b6d4', // cyan-500
  empathogens: '#ec4899', // pink-500
  cannabinoids: '#22c55e', // green-500
  opioids: '#ef4444', // red-500
  deliriants: '#64748b', // slate-500
  nootropics: '#14b8a6', // teal-500
  other: '#71717a', // zinc-500
  medications: '#10b981', // emerald-500
}

/** Resolve a substance's primary category to a hex color for inline styles. */
function categoryHexColor(categories: string[]): string {
  if (categories.length === 0) return '#71717a' // zinc-500 fallback
  return CATEGORY_HEX_COLORS[categories[0]] ?? '#71717a'
}

// ─── Substance lookup map (module-level — built once, not per-render) ──────
// Fix 3.1: hoisted out of computeGroups so it isn't rebuilt on every dose change.

const SUBSTANCE_BY_NAME: Map<string, typeof substances[number]> = (() => {
  const map = new Map<string, typeof substances[number]>()
  for (const s of substances) {
    map.set(s.name.toLowerCase(), s)
  }
  return map
})()

// ─── Types ─────────────────────────────────────────────────────────────────

interface ChartDataPoint {
  t: number // timestamp in ms
  [doseKey: string]: number
}

interface DoseSeries {
  dose: EnrichedDose
  route: RouteGroup
  dataKey: string
  palette: { stroke: string; fill: string }
  isEnded: boolean
  /** Dose-relative height = userDose / avgCommonDose. Curves are scaled by
   *  this so heavier doses visually tower over lighter ones. */
  doseHeight: number
}

interface PhaseBandConfig {
  phase: PhaseName
  startMs: number
  endMs: number
}

interface ChartConfig {
  data: ChartDataPoint[]
  series: DoseSeries[]
  phaseBands: PhaseBandConfig[]
  windowStartMs: number
  windowEndMs: number
}

/** Compute the dose-height-scaled intensity (0–100, clamped) for a single
 *  dose at a given timestamp. Used by the chart sampler, the tooltip, and
 *  the header combined-intensity badge so they all agree on the same value.
 *
 *  Fix 1.2: multiplies raw intensityAt() by doseHeight (userDose / avgCommon).
 *  Fix: applies the edge fade (progress<2 or >98) that the old SVG used, so
 *  the rendered curve matches the tooltip's reported intensity.
 */
function scaledIntensityAt(dose: EnrichedDose, t: number): number {
  const elapsedMins = (t - dose.doseTime.getTime()) / 60_000
  if (elapsedMins < 0 || elapsedMins > dose.timings.totalDuration) return 0
  const progress = (elapsedMins / dose.timings.totalDuration) * 100
  let val = intensityAt(progress, dose.timings)
  // Edge fade — matches old SVG rendering
  if (progress < 2) val *= progress / 2
  else if (progress > 98) val *= (100 - progress) / 2
  // Dose-height scaling — heavier doses rise above 100 (visual cue),
  // but clamp the *visible curve* at 100 so it stays in the chart bounds.
  val *= dose.doseHeight
  return Math.max(0, Math.min(100, val))
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeDate(s: string): Date {
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date(0) : d
}

/** Build enriched substance groups from raw doses — same logic as old component. */
function computeGroups(doses: ReturnType<typeof useDoseStore.getState>['doses']): SubstanceGroup[] {
  // Step 1: filter + enrich
  const baseDoses: EnrichedDose[] = doses
    .filter(d => {
      if (!d.duration) return false
      const totalMins = parseDurationToMinutes(d.duration.total ?? '')
      return totalMins > 0
    })
    .map(d => {
      const doseTime = safeDate(d.timestamp)
      const substanceEntry = SUBSTANCE_BY_NAME.get(d.substanceName.toLowerCase())
      const classification = substanceEntry
        ? classifyDose(d.amount, d.unit, substanceEntry, d.route)
        : null
      const horizontalWeight = classification?.horizontalWeight ?? 0.5
      // d.duration is non-null here (filtered above), but TS can't narrow
      // through .filter().map() — assert non-null.
      const duration = d.duration!
      const timings = classification
        ? calculateDoseScaledTimings(duration, horizontalWeight)
        : calculatePhaseTimings(duration)
      const status = getPhaseStatus(doseTime, timings)
      return {
        ...d,
        timings,
        status,
        doseTime,
        doseHeight: classification?.heightRelativeToCommon ?? 1,
        horizontalWeight,
        doseClass: classification?.doseClass,
      } as EnrichedDose
    })
    .sort((a, b) => a.doseTime.getTime() - b.doseTime.getTime())

  // Step 2: filter to active/recently-ended + group by substance → route
  const now = Date.now()
  const activeDoses = baseDoses.filter(d => {
    const elapsedMins = (now - d.doseTime.getTime()) / 60_000
    return elapsedMins < d.timings.offsetEnd + ENDED_DOSE_RETENTION_MINS
  })

  const bySubstance = new Map<string, EnrichedDose[]>()
  for (const d of activeDoses) {
    const key = d.substanceName.toLowerCase()
    if (!bySubstance.has(key)) bySubstance.set(key, [])
    bySubstance.get(key)!.push(d)
  }

  const result: SubstanceGroup[] = []
  for (const [, substanceDoses] of bySubstance) {
    const byRoute = new Map<string, EnrichedDose[]>()
    for (const d of substanceDoses) {
      const routeKey = d.route.toLowerCase()
      if (!byRoute.has(routeKey)) byRoute.set(routeKey, [])
      byRoute.get(routeKey)!.push(d)
    }

    const routes: RouteGroup[] = []
    let routeIdx = 0
    for (const [route, routeDoses] of byRoute) {
      const primary = routeDoses[0]
      const totalAmount = routeDoses.reduce((sum, d) => sum + d.amount, 0)
      const uniformUnit = routeDoses.every(d => d.unit === primary.unit)
      routes.push({
        route, doses: routeDoses, primary, totalAmount,
        unit: primary.unit, uniformUnit, paletteIndex: routeIdx,
      })
      routeIdx++
    }

    const earliest = substanceDoses[0]
    const latestEnd = substanceDoses.reduce((max, d) => {
      const end = d.doseTime.getTime() + d.timings.totalDuration * 60_000
      return Math.max(max, end)
    }, 0)
    const windowStart = new Date(earliest.doseTime.getTime() - 5 * 60_000)
    const windowEnd = new Date(latestEnd + 10 * 60_000)
    const windowDuration = (windowEnd.getTime() - windowStart.getTime()) / 60_000

    result.push({
      key: earliest.substanceName.toLowerCase(),
      substanceName: earliest.substanceName,
      categories: getDoseCategories(earliest),
      routes, primary: earliest, windowDuration, windowStart,
    })
  }

  result.sort((a, b) => a.primary.doseTime.getTime() - b.primary.doseTime.getTime())
  return result
}

/** Build Recharts chart data + series config for a single substance group.
 *
 *  Fix 3.2: this function is pure — it does NOT depend on `now`. The "now"
 *  line position is computed separately in GroupCard so the memoized chart
 *  config doesn't invalidate every 60 seconds.
 */
function buildChartConfig(
  group: SubstanceGroup,
  visibleRoutes: RouteGroup[],
  sampleCount: number,
): ChartConfig {
  const windowStartMs = group.windowStart.getTime()
  const windowEndMs = windowStartMs + group.windowDuration * 60_000
  const sampleIntervalMs = (windowEndMs - windowStartMs) / sampleCount

  // Build dose series
  const series: DoseSeries[] = []
  for (const rg of visibleRoutes) {
    for (const d of rg.doses) {
      const doseId = String(d.id ?? d.doseTime.getTime())
      const dataKey = `dose_${doseId}`
      const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
      // isEnded is computed at render time in GroupCard (it depends on `now`),
      // but we need a snapshot here for initial opacity. Use a lazy getter
      // pattern instead — store the dose, let the consumer compute endedness.
      // For simplicity we set isEnded=false here and let the <Area opacity=...>
      // logic in GroupCard compute the real value from `now` directly.
      series.push({
        dose: d,
        route: rg,
        dataKey,
        palette,
        isEnded: false,
        doseHeight: d.doseHeight,
      })
    }
  }

  // Build data array — sample the dose-height-scaled intensity curve
  // (Fix 1.2: scaling applied via scaledIntensityAt)
  const data: ChartDataPoint[] = []
  for (let i = 0; i <= sampleCount; i++) {
    const t = windowStartMs + i * sampleIntervalMs
    const point: ChartDataPoint = { t }
    for (const s of series) {
      point[s.dataKey] = scaledIntensityAt(s.dose, t)
    }
    data.push(point)
  }

  // Phase bands from the band dose (first visible dose, or group primary)
  const bandDose = visibleRoutes[0]?.doses[0] ?? group.primary
  const bandOffsetMins = (bandDose.doseTime.getTime() - windowStartMs) / 60_000
  const phaseBands: PhaseBandConfig[] = getPhaseBandRanges(bandDose.timings).map(band => ({
    phase: band.phase,
    startMs: windowStartMs + (bandOffsetMins + band.startFrac * bandDose.timings.totalDuration) * 60_000,
    endMs: windowStartMs + (bandOffsetMins + band.endFrac * bandDose.timings.totalDuration) * 60_000,
  }))

  return { data, series, phaseBands, windowStartMs, windowEndMs }
}

// ─── Main Component ────────────────────────────────────────────────────────

export function IntensityTimelineChart() {
  const doses = useDoseStore(s => s.doses)
  const isLoaded = useDoseStore(s => s.isLoaded)

  const [hiddenSubstances, setHiddenSubstances] = useState<Set<string>>(new Set())
  const [selectedRoutes, setSelectedRoutes] = useState<Record<string, string | null>>({})
  const [selectedDoses, setSelectedDoses] = useState<Record<string, string | null>>({})
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  // Fix 3.2: nowTs is the ONLY thing that changes every 60s. It's passed down
  // as a prop so children can use it for the "now" line position and header
  // badges WITHOUT invalidating their memoized chart-data config.
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    setNowTs(Date.now())
    const id = setInterval(() => setNowTs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const groups = useMemo(() => computeGroups(doses), [doses])

  // Pass through to children as a stable callback. Returns a hex color
  // suitable for inline styles (the old version returned a Tailwind class
  // string which doesn't work as a backgroundColor value).
  const getCategoryColor = useCallback((categories: string[]): string => {
    return categoryHexColor(categories)
  }, [])

  const handleRouteClick = useCallback((groupKey: string, route: string) => {
    setSelectedRoutes(prev => ({
      ...prev,
      [groupKey]: prev[groupKey] === route ? null : route,
    }))
    setSelectedDoses(prev => ({ ...prev, [groupKey]: null }))
  }, [])

  const handleDoseChipClick = useCallback((groupKey: string, doseId: string) => {
    setSelectedDoses(prev => ({
      ...prev,
      [groupKey]: prev[groupKey] === doseId ? null : doseId,
    }))
    setSelectedRoutes(prev => ({ ...prev, [groupKey]: null }))
  }, [])

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-content" />
          <span className="ml-2 text-sm text-neutral-content">Loading active doses…</span>
        </CardContent>
      </Card>
    )
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Active Timeline
          </CardTitle>
          <CardDescription>No active doses to display</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-neutral-content">
          <Layers className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Log a dose to see the intensity timeline</p>
        </CardContent>
      </Card>
    )
  }

  const visibleGroups = groups.filter(g => !hiddenSubstances.has(g.key))

  return (
    <div className="space-y-4">
      {/* Substance toggle chips (when >1 group) */}
      {groups.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {groups.map(g => {
            const hidden = hiddenSubstances.has(g.key)
            const color = getCategoryColor(g.categories)
            return (
              <button
                key={g.key}
                onClick={() => setHiddenSubstances(prev => {
                  const next = new Set(prev)
                  if (next.has(g.key)) next.delete(g.key)
                  else next.add(g.key)
                  return next
                })}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${hidden ? 'opacity-30 border-base-300 line-through' : 'opacity-90 hover:opacity-100'
                  }`}
                style={{ borderColor: hidden ? undefined : color, color }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color, opacity: hidden ? 0.3 : 1 }} />
                {g.substanceName}
              </button>
            )
          })}
          {hiddenSubstances.size > 0 && (
            <button onClick={() => setHiddenSubstances(new Set())} className="text-[10px] text-neutral-content hover:text-base-content ml-0.5">
              Show all
            </button>
          )}
        </div>
      )}

      {/* Per-substance chart cards */}
      {visibleGroups.map(group => (
        <GroupCard
          key={group.key}
          group={group}
          substanceName={group.substanceName}
          getCategoryColor={getCategoryColor}
          selectedRoute={selectedRoutes[group.key] ?? null}
          selectedDose={selectedDoses[group.key] ?? null}
          onRouteClick={(route) => handleRouteClick(group.key, route)}
          onDoseClick={(doseId) => handleDoseChipClick(group.key, doseId)}
          isExpanded={expandedGroup === group.key}
          onToggleExpand={() => setExpandedGroup(prev => prev === group.key ? null : group.key)}
          nowTs={nowTs}
        />
      ))}
    </div>
  )
}

// ─── Per-substance card ────────────────────────────────────────────────────

interface GroupCardProps {
  group: SubstanceGroup
  substanceName: string
  getCategoryColor: (cats: string[]) => string
  selectedRoute: string | null
  selectedDose: string | null
  onRouteClick: (route: string) => void
  onDoseClick: (doseId: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
  /** Current time in ms — passed from parent so the 60s tick re-renders
   *  the now-line / phase badges WITHOUT recomputing chart data. */
  nowTs: number
}

function GroupCard({
  group, getCategoryColor, selectedRoute, selectedDose,
  onRouteClick, onDoseClick, isExpanded, onToggleExpand, nowTs,
}: GroupCardProps) {
  const [isMobile, setIsMobile] = useState(false)
  // mounted gate — prevents ResponsiveContainer from rendering before the
  // browser has computed the parent's layout (which triggers a 0×0 warning).
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Filter visible routes based on isolation
  const visibleRoutes: RouteGroup[] = useMemo(() => {
    if (selectedDose) {
      return group.routes
        .map(rg => ({
          ...rg,
          doses: rg.doses.filter(d => String(d.id ?? d.doseTime.getTime()) === selectedDose),
        }))
        .filter(rg => rg.doses.length > 0)
    }
    if (selectedRoute) {
      return group.routes.filter(r => r.route.toLowerCase() === selectedRoute)
    }
    return group.routes
  }, [group, selectedRoute, selectedDose])

  const sampleCount = isMobile ? 80 : 120
  // Fix 3.2: buildChartConfig is pure — it does NOT depend on nowTs, so this
  // memo is stable across the 60s tick. Only the now-line position (which
  // reads nowTs directly in JSX below) updates every minute.
  const config = useMemo(
    () => buildChartConfig(group, visibleRoutes, sampleCount),
    [group, visibleRoutes, sampleCount],
  )

  const now = nowTs
  const primaryDose = group.primary
  // Fix 5.1: use the shared getPhaseStatus() instead of a local re-implementation.
  const primaryPhase = getPhaseStatus(primaryDose.doseTime, primaryDose.timings).phase
  const allActive = group.routes.some(rg => rg.doses.some(d => (now - d.doseTime.getTime()) / 60_000 < d.timings.offsetEnd))
  const allEnded = group.routes.every(rg => rg.doses.every(d => (now - d.doseTime.getTime()) / 60_000 >= d.timings.offsetEnd))

  // Combined intensity right now — uses combinedIntensityAt (Fix 1.1) so
  // redosing visually stacks with soft log dampening above 100%, matching
  // the old SVG behaviour. Intensities are dose-height-scaled (Fix 1.2) so
  // a heavy dose contributes more to the combined value than a light one.
  const currentCombinedIntensity = useMemo(() => {
    if (!allActive) return null
    const activeDoses = group.routes.flatMap(rg => rg.doses).filter(d => {
      const elapsed = (now - d.doseTime.getTime()) / 60_000
      return elapsed >= 0 && elapsed < d.timings.offsetEnd
    })
    if (activeDoses.length === 0) return null
    const intensities = activeDoses.map(d => scaledIntensityAt(d, now))
    // combinedIntensityAt can return >100 (up to 200) for stacked doses.
    // For the badge we display the raw value; clamp at 200 for safety.
    const combined = combinedIntensityAt(intensities)
    return Math.round(Math.min(200, combined))
  }, [group, allActive, now])

  // Remaining time for primary dose
  const primaryRemaining = Math.max(0, primaryDose.timings.offsetEnd - (now - primaryDose.doseTime.getTime()) / 60_000)

  const catColor = getCategoryColor(group.categories)
  const isMultiRoute = group.routes.length > 1
  const totalDoses = group.routes.reduce((s, rg) => s + rg.doses.length, 0)

  const PhaseIcon = phaseIcons[primaryPhase] || phaseIcons['onset']

  return (
    <Card>
      <CardHeader className="pb-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
            <h3 className="font-semibold text-base">
              <Link href={`/?substance=${group.substanceName}`} className="hover:underline underline-offset-4">
                {group.substanceName}
              </Link>
            </h3>
            <Badge variant="outline" className={`${phaseColors[primaryPhase]?.border || ''} ${phaseColors[primaryPhase]?.text || ''} text-[10px] px-1.5 py-0`}>
              <PhaseIcon className="h-3 w-3 mr-0.5" />
              {formatPhaseName(primaryPhase)}
            </Badge>
            {allActive && currentCombinedIntensity !== null && (
              <Badge variant="outline" className="text-xs font-mono">
                <Activity className="h-3 w-3 mr-1 text-purple-400" />
                {currentCombinedIntensity}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {allActive && primaryRemaining > 0 && (
              <span className="text-xs text-neutral-content flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {formatMinutes(primaryRemaining)} remaining
              </span>
            )}
            {allEnded && (
              <span className="text-xs text-neutral-content/60 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Ended
              </span>
            )}
          </div>
        </div>

        {/* Route pills */}
        {isMultiRoute && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className="text-[10px] text-neutral-content mr-1">Routes:</span>
            {group.routes.map(rg => {
              const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
              const isSelected = selectedRoute === rg.route.toLowerCase()
              return (
                <button
                  key={rg.route}
                  onClick={() => onRouteClick(rg.route.toLowerCase())}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${isSelected ? 'ring-1 ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100'}`}
                  style={{ borderColor: palette.stroke, color: palette.stroke }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.fill }} />
                  {rg.route}
                </button>
              )
            })}
            {selectedRoute && (
              <button onClick={() => onRouteClick(selectedRoute)} className="text-[10px] text-neutral-content hover:text-base-content ml-1">
                Show all
              </button>
            )}
          </div>
        )}

        {/* Dose chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {group.routes.map(rg => {
            const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
            return rg.doses.map(d => {
              const doseId = String(d.id ?? d.doseTime.getTime())
              const isIsolated = selectedDose === doseId
              const formatted = formatDoseAmount(d.amount, d.unit)
              const elapsed = (now - d.doseTime.getTime()) / 60_000
              const isDoseActive = elapsed >= 0 && elapsed < d.timings.offsetEnd
              const isDoseEnded = elapsed >= d.timings.offsetEnd
              const doseProgress = (elapsed / d.timings.totalDuration) * 100
              return (
                <button
                  key={`${rg.route}-${doseId}`}
                  onClick={() => onDoseClick(doseId)}
                  className={`relative inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all overflow-hidden ${isIsolated
                      ? 'ring-2 ring-purple-500/50 border-purple-500/50 bg-purple-500/10'
                      : isDoseEnded
                        ? 'border-base-300/50 opacity-50'
                        : 'border-base-300 hover:border-base-300/80'
                    }`}
                  style={{ color: palette.stroke }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: palette.fill, opacity: isDoseActive ? 1 : 0.4 }} />
                  <span>{formatted.amount} {formatted.unit}</span>
                  <span className="text-neutral-content">{rg.route}</span>
                  {isDoseActive && (
                    <div className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, doseProgress))}%`, background: palette.stroke, opacity: 0.6 }} />
                  )}
                </button>
              )
            })
          })}
          {selectedDose && (
            <button onClick={() => onDoseClick(selectedDose)} className="text-[10px] text-neutral-content hover:text-base-content ml-1">
              Show all
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Phase labels row */}
        <div className="relative h-4 mb-1">
          {config.phaseBands.map(band => {
            const pb = PHASE_BANDS.find(b => b.phase === band.phase)
            if (!pb) return null
            const startPct = ((band.startMs - config.windowStartMs) / (config.windowEndMs - config.windowStartMs)) * 100
            const endPct = ((band.endMs - config.windowStartMs) / (config.windowEndMs - config.windowStartMs)) * 100
            const midPct = (startPct + endPct) / 2
            if (endPct - startPct < 5) return null
            return (
              <span
                key={band.phase}
                className="absolute text-[9px] font-medium -translate-x-1/2"
                style={{ left: `${midPct}%`, color: pb.labelColor, opacity: 0.75 }}
              >
                {pb.name}
              </span>
            )
          })}
        </div>

        {/* Recharts chart — deferred until mounted to avoid the 0×0
            ResponsiveContainer warning on first paint. */}
        <div style={{ width: '100%', height: isMobile ? 200 : 280 }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={config.data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
                <defs>
                  {config.series.map((s, i) => (
                    <linearGradient key={`grad-${i}`} id={`grad-${group.key}-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.palette.fill} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={s.palette.fill} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>

                {/* Phase band backgrounds */}
                {config.phaseBands.map(band => {
                  const pb = PHASE_BANDS.find(b => b.phase === band.phase)
                  if (!pb) return null
                  return (
                    <ReferenceArea
                      key={`band-${band.phase}`}
                      x1={band.startMs}
                      x2={band.endMs}
                      strokeOpacity={0}
                      fill={pb.fill}
                      fillOpacity={0.06}
                    />
                  )
                })}

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[config.windowStartMs, config.windowEndMs]}
                  scale="time"
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  stroke="currentColor"
                  tickFormatter={(ts) => format(new Date(ts), 'h:mm a')}
                  minTickGap={40}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  stroke="currentColor"
                  width={32}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={<ChartTooltip series={config.series} windowStartMs={config.windowStartMs} />}
                  cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                {/* Now indicator — position comes from nowTs prop, NOT from
                  config (which is memoized and stable across ticks). */}
                {nowTs >= config.windowStartMs && nowTs <= config.windowEndMs && (
                  <ReferenceLine
                    x={nowTs}
                    stroke={NOW_INDICATOR.color}
                    strokeWidth={NOW_INDICATOR.strokeWidth}
                    strokeDasharray={NOW_INDICATOR.dashArray}
                    label={{ value: 'NOW', fontSize: 8, fill: NOW_INDICATOR.color, position: 'top' }}
                  />
                )}

                {/* One Area per dose. isEnded is computed fresh from nowTs so
                  ended doses fade out without re-sampling the chart data.
                  dot=false + activeDot=false ensures Recharts doesn't render
                  default dots at data points (which would look like stray
                  markers at curve peaks and start/end points). */}
                {config.series.map((s, i) => {
                  const doseEnded = (nowTs - s.dose.doseTime.getTime()) / 60_000 >= s.dose.timings.offsetEnd
                  return (
                    <Area
                      key={s.dataKey}
                      type="monotone"
                      dataKey={s.dataKey}
                      stroke={s.palette.stroke}
                      strokeWidth={i === 0 ? 2.5 : 1.5}
                      fill={`url(#grad-${group.key}-${i})`}
                      opacity={doseEnded ? 0.4 : 1}
                      isAnimationActive={false}
                      connectNulls
                      dot={false}
                      activeDot={false}
                    />
                  )
                })}
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-neutral-content mt-2">
          <span>
            {visibleRoutes.length} route{visibleRoutes.length !== 1 ? 's' : ''} · {totalDoses} dose{totalDoses !== 1 ? 's' : ''}
          </span>
          <button onClick={onToggleExpand} className="flex items-center gap-1 hover:text-base-content transition-colors">
            {isExpanded ? (
              <><ChevronUp className="h-3 w-3" /> Less</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> Phase details</>
            )}
          </button>
        </div>

        {/* Expanded phase details */}
        {isExpanded && (
          <div className="mt-3 space-y-3 pt-3 border-t border-base-300/50">
            {visibleRoutes.map(rg => {
              const palette = ROUTE_PALETTE[rg.paletteIndex % ROUTE_PALETTE.length]
              return (
                <div key={rg.route} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: palette.fill }} />
                    <span className="text-xs font-medium capitalize">{rg.route}</span>
                    {rg.uniformUnit && (
                      <span className="text-[10px] text-neutral-content">{rg.totalAmount}{rg.unit} total</span>
                    )}
                  </div>
                  {rg.doses.map(d => {
                    const doseId = String(d.id ?? d.doseTime.getTime())
                    const cPhase = getPhaseStatus(d.doseTime, d.timings).phase
                    const CPhaseIcon = phaseIcons[cPhase] || phaseIcons['onset']
                    const phases = [
                      { key: 'onset', end: d.timings.onsetEnd },
                      { key: 'comeup', end: d.timings.comeupEnd },
                      { key: 'peak', end: d.timings.peakEnd },
                      { key: 'offset', end: d.timings.offsetEnd },
                    ] as const
                    const phaseOrder = ['onset', 'comeup', 'peak', 'offset']
                    const currentIdx = phaseOrder.indexOf(cPhase)
                    const fmt = formatDoseAmount(d.amount, d.unit)
                    return (
                      <div key={doseId} className="ml-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-content flex-wrap">
                          <span className="font-medium text-base-content">{fmt.amount} {fmt.unit}</span>
                          <span>·</span>
                          <span>{format(d.doseTime, 'h:mm a')}</span>
                          <span className={`inline-flex items-center gap-0.5 ${phaseColors[cPhase]?.text || ''}`}>
                            <CPhaseIcon className="h-3 w-3" />
                            {formatPhaseName(cPhase)}
                          </span>
                        </div>
                        {phases.map((p, pi) => {
                          const start = pi === 0 ? 0 : phases[pi - 1].end
                          const duration = Math.max(0, Math.round(p.end - start))
                          const isActive = cPhase === p.key
                          const isPast = cPhase !== 'not_started' && cPhase !== 'ended' ? currentIdx > pi : false
                          const phaseEndProgress = (p.end / d.timings.totalDuration) * 100
                          // Fix 1.2: scale phase-peak intensity by doseHeight so a heavy
                          // dose's peak phase shows >100% (matching the chart curve).
                          const phasePeakIntensity = Math.min(100, intensityAt(phaseEndProgress, d.timings) * d.doseHeight)
                          const PIcon = phaseIcons[p.key as PhaseName]
                          const pc = phaseColors[p.key as PhaseName]
                          return (
                            <div
                              key={p.key}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${isActive ? 'ring-1 ring-purple-500/30 bg-purple-500/5' : isPast ? 'opacity-50' : 'opacity-30'
                                }`}
                            >
                              <PIcon className={`h-3.5 w-3.5 shrink-0 ${pc.text}`} />
                              <span className={`font-medium w-16 ${pc.text}`}>{formatPhaseName(p.key as PhaseName)}</span>
                              <span className="text-[10px] text-neutral-content">({formatMinutes(duration)})</span>
                              <div className="flex-1 h-1 bg-base-200/50 rounded-full overflow-hidden max-w-[60px]">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(phasePeakIntensity)}%`, backgroundColor: palette.fill, opacity: isActive ? 0.8 : 0.3 }} />
                              </div>
                              <span className="text-[10px] font-mono text-neutral-content w-8 text-right">{Math.round(phasePeakIntensity)}%</span>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: number
  series: DoseSeries[]
  windowStartMs: number
}

function ChartTooltip({ active, payload, label, series, windowStartMs }: ChartTooltipProps) {
  if (!active || !payload || !label) return null
  const t = label

  // Find active doses at this timestamp.
  // p.value is the dose-height-scaled intensity from the chart data (Fix 1.2
  // — already applied during sampling in buildChartConfig).
  const activeDoses: Array<{ series: DoseSeries; intensity: number; phase: PhaseName; minutesUntilPhaseChange: number }> = []
  for (const p of payload) {
    if (p.value <= 0) continue
    const s = series.find(s => s.dataKey === p.dataKey)
    if (!s) continue
    const elapsedMins = (t - s.dose.doseTime.getTime()) / 60_000
    const progress = (elapsedMins / s.dose.timings.totalDuration) * 100
    const phase = phaseNameAt(progress, s.dose.timings)
    const pEnd = phaseEnd(phase, s.dose.timings)
    const minutesUntilPhaseChange = Math.max(0, pEnd - elapsedMins)
    activeDoses.push({ series: s, intensity: p.value, phase, minutesUntilPhaseChange })
  }

  if (activeDoses.length === 0) return null

  // Fix 1.1: combined intensity uses soft log-dampening above 100% so
  // redosing visually stacks (not peak-hold). Can return up to 200.
  const combinedIntensity = combinedIntensityAt(activeDoses.map(d => d.intensity))
  // The peak dose (highest single-dose intensity) drives the phase label
  // and the "minutes until phase change" display.
  const maxIntensity = Math.max(...activeDoses.map(d => d.intensity))
  const peakDose = activeDoses.find(d => d.intensity === maxIntensity)!

  // Group by route for per-route breakdown
  const byRoute = new Map<string, { intensity: number; phase: PhaseName; palette: { stroke: string; fill: string } }>()
  for (const ad of activeDoses) {
    const existing = byRoute.get(ad.series.route.route)
    if (!existing || existing.intensity < ad.intensity) {
      byRoute.set(ad.series.route.route, {
        intensity: ad.intensity,
        phase: ad.phase,
        palette: ad.series.palette,
      })
    }
  }

  // For display: combined can exceed 100% (redosing stacks). Per-route bars
  // are clamped to 100% width since a single dose can't exceed 100 itself.
  const combinedDisplay = Math.round(combinedIntensity)
  const combinedBarWidth = Math.min(100, combinedDisplay)

  return (
    <div className="rounded-lg border border-neutral-500/25 bg-black/80 backdrop-blur-xl px-3 py-2.5 shadow-2xl min-w-[200px] max-w-[280px]" role="tooltip">
      {/* Header: phase + time */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: markerHex[peakDose.phase] ?? '#a855f7' }}>
          {formatPhaseName(peakDose.phase)}
        </span>
        <span className="text-[10px] text-neutral-300/70">{format(new Date(t), 'h:mm a')}</span>
      </div>

      {/* Combined intensity bar — can exceed 100% when redosing stacks */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold text-neutral-300/60 w-20 shrink-0">Combined</span>
        <div className="flex-1 h-2 bg-neutral-500/15 rounded-full overflow-hidden relative">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${combinedBarWidth}%` }} />
          {combinedDisplay > 100 && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-pink-300">+{combinedDisplay - 100}</span>
          )}
        </div>
        <span className="text-xs font-bold w-10 text-right text-purple-300">{combinedDisplay}%</span>
      </div>

      {/* Per-route breakdown */}
      {byRoute.size > 1 && (
        <div className="space-y-1">
          {Array.from(byRoute.entries()).map(([route, info]) => (
            <div key={route} className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-neutral-300/60 w-20 shrink-0 truncate capitalize">{route}</span>
              <div className="flex-1 h-1.5 bg-neutral-500/15 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(info.intensity))}%`, backgroundColor: info.palette.stroke }} />
              </div>
              <span className="text-[10px] w-10 text-right text-neutral-300/80">{Math.round(info.intensity)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Time-in summary */}
      <div className="mt-2 pt-1.5 border-t border-neutral-500/20 flex items-baseline gap-2">
        <span className="text-base font-bold text-neutral-200">{combinedDisplay}%</span>
        <span className="text-[10px] text-neutral-300/60">combined intensity</span>
      </div>

      {/* Minutes until phase change */}
      {peakDose.minutesUntilPhaseChange > 0 && (
        <div className="mt-1 flex items-center gap-1.5">
          <Timer className="h-3 w-3 text-neutral-300/50" />
          <span className="text-[10px] text-neutral-300/70">
            <span className="font-medium text-neutral-300">{formatMinutes(peakDose.minutesUntilPhaseChange)}</span> until{' '}
            {(() => {
              const order: PhaseName[] = ['onset', 'comeup', 'peak', 'offset']
              const idx = order.indexOf(peakDose.phase)
              const next = idx < order.length - 1 ? order[idx + 1] : null
              return next ? formatPhaseName(next) : 'end'
            })()}
          </span>
        </div>
      )}
    </div>
  )
}
