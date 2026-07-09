/**
 * Analytics computation utilities for the /analytics dashboard.
 *
 * Pure functions over DoseLog[] — no React, no store coupling.
 * All chart-shaped outputs are designed to be fed straight into Recharts.
 */

import { DoseLog } from '@/types'
import { format, subDays, startOfDay, endOfDay, isWithinInterval, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInCalendarDays, parseISO } from 'date-fns'

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Returns a Date object guaranteed valid (defaults to epoch on bad input). */
function safeDate(s: string): Date {
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date(0) : d
}

/** Substances that are well-known to build tolerance quickly (in days). */
const TOLERANCE_HALF_LIVES_DAYS: Record<string, number> = {
  // Stimulants — tolerance builds fast
  amphetamine: 3,
  methamphetamine: 2,
  mdma: 14, // MDMA tolerance is famously long-lived
  mda: 10,
  methylphenidate: 3,
  cocaine: 1,
  nicotine: 1,
  caffeine: 7,
  // Depressants — GABA tolerance is dangerous, builds ~weekly
  alcohol: 7,
  phenibut: 7,
  gabapentin: 7,
  pregabalin: 7,
  'diazepam': 14,
  'alprazolam': 7,
  'clonazepam': 14,
  'lorazepam': 7,
  // Opioids
  kratom: 3,
  morphine: 3,
  oxycodone: 3,
  heroin: 2,
  fentanyl: 2,
  // Dissociatives
  dextromethorphan: 3,
  ketamine: 3,
  // Cannabinoids
  cannabis: 7,
  thc: 7,
  // Hallucinogens — classic psychs have very fast tolerance
  lsd: 4,
  psilocybin: 4,
  'psilocin': 4,
  mescaline: 5,
  dmt: 1,
}

/** Fallback half-life (in days) when substance is not in the table. */
const DEFAULT_TOLERANCE_HALF_LIFE_DAYS = 7

/**
 * Resolve a substance's tolerance half-life (days).
 * Case-insensitive name + alias lookup.
 */
export function toleranceHalfLifeDays(substanceName: string): number {
  const lower = substanceName.toLowerCase().trim()
  // Direct match
  if (lower in TOLERANCE_HALF_LIVES_DAYS) return TOLERANCE_HALF_LIVES_DAYS[lower]
  // Substring match — e.g. "Cannabis (Sativa)" → cannabis
  for (const [key, val] of Object.entries(TOLERANCE_HALF_LIVES_DAYS)) {
    if (lower.includes(key)) return val
  }
  return DEFAULT_TOLERANCE_HALF_LIFE_DAYS
}

// ─── Time-series shapes ─────────────────────────────────────────────────────

export interface DailyCountPoint {
  date: string // ISO yyyy-MM-dd
  label: string // display label e.g. "Jul 9"
  count: number
  uniqueSubstances: number
}

export interface WeeklyCountPoint {
  weekStart: string
  label: string
  count: number
}

export interface MonthlyCountPoint {
  monthStart: string
  label: string
  count: number
}

export interface SubstanceBreakdownSlice {
  name: string
  value: number // dose count
  categories: string[]
}

export interface CategoryBreakdownSlice {
  name: string
  value: number
}

// ─── Time-series builders ───────────────────────────────────────────────────

/**
 * Daily dose counts for the last N days.
 * Days with zero doses still appear with count: 0 (no gaps in the chart).
 */
export function dailyCounts(doses: DoseLog[], days: number): DailyCountPoint[] {
  const now = new Date()
  const start = startOfDay(subDays(now, days - 1))
  const end = endOfDay(now)
  const range = eachDayOfInterval({ start, end })

  // Bucket doses by date string
  const bucket = new Map<string, { count: number; subs: Set<string> }>()
  for (const d of range) {
    bucket.set(format(d, 'yyyy-MM-dd'), { count: 0, subs: new Set() })
  }
  for (const dose of doses) {
    const d = safeDate(dose.timestamp)
    if (!isWithinInterval(d, { start, end })) continue
    const key = format(d, 'yyyy-MM-dd')
    const b = bucket.get(key)
    if (!b) continue
    b.count += 1
    b.subs.add(dose.substanceName)
  }

  return range.map(d => {
    const key = format(d, 'yyyy-MM-dd')
    const b = bucket.get(key)!
    return {
      date: key,
      label: format(d, 'MMM d'),
      count: b.count,
      uniqueSubstances: b.subs.size,
    }
  })
}

/**
 * Weekly dose counts for the last N weeks (Sunday-start).
 */
export function weeklyCounts(doses: DoseLog[], weeks: number): WeeklyCountPoint[] {
  const now = new Date()
  const start = startOfDay(subDays(now, (weeks - 1) * 7))
  const end = endOfDay(now)
  const weekStarts = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 })

  const bucket = new Map<string, number>()
  for (const w of weekStarts) bucket.set(format(w, 'yyyy-MM-dd'), 0)

  for (const dose of doses) {
    const d = safeDate(dose.timestamp)
    if (!isWithinInterval(d, { start, end })) continue
    // Find the week start that is the most recent Sunday on or before d
    const weekStart = startOfDay(subDays(d, d.getDay()))
    const key = format(weekStart, 'yyyy-MM-dd')
    const cur = bucket.get(key)
    if (cur !== undefined) bucket.set(key, cur + 1)
  }

  return weekStarts.map(w => ({
    weekStart: format(w, 'yyyy-MM-dd'),
    label: format(w, 'MMM d'),
    count: bucket.get(format(w, 'yyyy-MM-dd')) ?? 0,
  }))
}

/**
 * Monthly dose counts for the last N months.
 */
export function monthlyCounts(doses: DoseLog[], months: number): MonthlyCountPoint[] {
  const now = new Date()
  // Start from N-1 months ago at day 1
  const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  const end = endOfDay(now)
  const monthStarts = eachMonthOfInterval({ start: startMonth, end })

  const bucket = new Map<string, number>()
  for (const m of monthStarts) bucket.set(format(m, 'yyyy-MM-dd'), 0)

  for (const dose of doses) {
    const d = safeDate(dose.timestamp)
    if (!isWithinInterval(d, { start: startMonth, end })) continue
    const key = format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd')
    const cur = bucket.get(key)
    if (cur !== undefined) bucket.set(key, cur + 1)
  }

  return monthStarts.map(m => ({
    monthStart: format(m, 'yyyy-MM-dd'),
    label: format(m, 'MMM yy'),
    count: bucket.get(format(m, 'yyyy-MM-dd')) ?? 0,
  }))
}

// ─── Breakdowns ─────────────────────────────────────────────────────────────

/**
 * Substance breakdown — top substances by dose count.
 * Suitable for pie charts.
 */
export function substanceBreakdown(doses: DoseLog[]): SubstanceBreakdownSlice[] {
  const counts = new Map<string, { count: number; categories: Set<string> }>()
  for (const d of doses) {
    const key = d.substanceName
    if (!counts.has(key)) counts.set(key, { count: 0, categories: new Set() })
    const entry = counts.get(key)!
    entry.count += 1
    if (Array.isArray(d.categories)) {
      for (const c of d.categories) entry.categories.add(c)
    }
  }

  const arr = Array.from(counts.entries())
    .map(([name, { count, categories }]) => ({
      name,
      value: count,
      categories: Array.from(categories),
    }))
    .sort((a, b) => b.value - a.value)

  // Bundle the long tail into "Other" so the pie stays readable
  if (arr.length <= 8) return arr
  const head = arr.slice(0, 7)
  const tailTotal = arr.slice(7).reduce((s, x) => s + x.value, 0)
  return [...head, { name: 'Other', value: tailTotal, categories: [] }]
}

/**
 * Category breakdown — dose counts per psychoactive category.
 */
export function categoryBreakdown(doses: DoseLog[]): CategoryBreakdownSlice[] {
  const counts = new Map<string, number>()
  for (const d of doses) {
    if (!Array.isArray(d.categories)) continue
    for (const c of d.categories) {
      counts.set(c, (counts.get(c) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// ─── Tolerance estimation ───────────────────────────────────────────────────

export interface ToleranceEstimate {
  substanceName: string
  /** 0–1 — estimated current tolerance level (1 = full tolerance) */
  currentLevel: number
  /** Estimated days until tolerance returns to baseline (≤5% level) */
  daysToBaseline: number
  /** Last dose timestamp (ISO) */
  lastDose: string | null
  /** Days since last dose */
  daysSinceLast: number
  /** Total doses in the last 30 days */
  dosesLast30Days: number
  /** Short qualitative description for UI display */
  level: 'low' | 'moderate' | 'high' | 'very-high' | 'baseline'
  /** Explanation string for tooltip */
  explanation: string
}

/**
 * Estimate per-substance tolerance using an exponential decay model.
 *
 * Each dose adds a unit of tolerance (capped at 1.0); between doses,
 * tolerance decays exponentially with the substance's half-life.
 *
 * This is a *heuristic* — not a pharmacokinetic model. It's intended for
 * harm-reduction awareness, not dosing decisions.
 */
export function estimateTolerance(doses: DoseLog[]): ToleranceEstimate[] {
  const now = Date.now()
  const bySubstance = new Map<string, DoseLog[]>()

  for (const d of doses) {
    const key = d.substanceName
    if (!bySubstance.has(key)) bySubstance.set(key, [])
    bySubstance.get(key)!.push(d)
  }

  const out: ToleranceEstimate[] = []

  for (const [name, subsDoses] of bySubstance) {
    // Only consider doses from the last ~90 days for tolerance modeling
    const cutoff = now - 90 * 24 * 60 * 60 * 1000
    const recent = subsDoses
      .map(d => ({ d, ts: safeDate(d.timestamp).getTime() }))
      .filter(x => x.ts >= cutoff)
      .sort((a, b) => a.ts - b.ts)

    if (recent.length === 0) continue

    const halfLifeDays = toleranceHalfLifeDays(name)
    const decayPerDay = Math.log(2) / halfLifeDays

    // Step forward in time, applying each dose as a +1.0 unit (capped at 1.0)
    // and decaying between doses.
    let level = 0
    let prevTs = recent[0].ts
    for (const { ts } of recent) {
      const elapsedDays = (ts - prevTs) / (1000 * 60 * 60 * 24)
      level *= Math.exp(-decayPerDay * elapsedDays)
      level = Math.min(1, level + 1.0)
      prevTs = ts
    }

    // Decay from last dose to now
    const lastTs = recent[recent.length - 1].ts
    const daysSinceLast = Math.max(0, (now - lastTs) / (1000 * 60 * 60 * 24))
    level *= Math.exp(-decayPerDay * daysSinceLast)

    // Days until tolerance drops below 5% (≈4.32 half-lives)
    const targetLevel = 0.05
    const daysToBaseline = level > targetLevel
      ? Math.log(level / targetLevel) / decayPerDay
      : 0

    // Classify
    let levelLabel: ToleranceEstimate['level']
    if (level < 0.05) levelLabel = 'baseline'
    else if (level < 0.3) levelLabel = 'low'
    else if (level < 0.6) levelLabel = 'moderate'
    else if (level < 0.85) levelLabel = 'high'
    else levelLabel = 'very-high'

    const dosesLast30Days = subsDoses.filter(
      d => safeDate(d.timestamp).getTime() >= now - 30 * 24 * 60 * 60 * 1000,
    ).length

    out.push({
      substanceName: name,
      currentLevel: Math.round(level * 100) / 100,
      daysToBaseline: Math.ceil(daysToBaseline),
      lastDose: new Date(lastTs).toISOString(),
      daysSinceLast: Math.floor(daysSinceLast),
      dosesLast30Days,
      level: levelLabel,
      explanation:
        `Modeled as exponential decay with a ${halfLifeDays}-day half-life. ` +
        `Based on ${recent.length} dose(s) in the last 90 days. ` +
        `This is a heuristic, not a pharmacokinetic model — for harm-reduction awareness only.`,
    })
  }

  // Sort: highest current tolerance first
  return out.sort((a, b) => b.currentLevel - a.currentLevel)
}

// ─── Streaks & usage patterns ───────────────────────────────────────────────

export interface StreakInsights {
  /** Current active-day streak (consecutive days with ≥1 dose, ending today or yesterday). */
  currentStreak: number
  /** Longest active-day streak on record. */
  longestStreak: number
  /** Current rest-day streak (consecutive days with 0 doses). */
  currentRestStreak: number
  /** Average doses per active day (last 30 days). */
  avgDosesPerActiveDay30d: number
  /** Most active day of week (0=Sun … 6=Sat) and its dose count. */
  mostActiveDayOfWeek: { day: number; label: string; count: number } | null
  /** Most active hour of day (0-23) and its dose count. */
  mostActiveHour: { hour: number; count: number } | null
  /** Total unique substances logged. */
  uniqueSubstances: number
  /** Total active days (days with ≥1 dose). */
  totalActiveDays: number
  /** Total rest days (in the range covered by the data). */
  totalRestDays: number
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Compute streak + usage-pattern insights from the dose log.
 */
export function computeStreakInsights(doses: DoseLog[]): StreakInsights {
  if (doses.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      currentRestStreak: 0,
      avgDosesPerActiveDay30d: 0,
      mostActiveDayOfWeek: null,
      mostActiveHour: null,
      uniqueSubstances: 0,
      totalActiveDays: 0,
      totalRestDays: 0,
    }
  }

  const now = new Date()
  const today = startOfDay(now)
  const sortedDates = doses
    .map(d => startOfDay(safeDate(d.timestamp)).getTime())
    .sort((a, b) => a - b)

  // Unique active days as a Set of timestamps
  const activeDaySet = new Set(sortedDates)
  const totalActiveDays = activeDaySet.size

  // Range covered = earliest active day → today
  const earliest = sortedDates[0]
  const totalDaysInRange = Math.max(1, differenceInCalendarDays(today, new Date(earliest)) + 1)
  const totalRestDays = Math.max(0, totalDaysInRange - totalActiveDays)

  // ── Current streak (ending today or yesterday) ──
  let currentStreak = 0
  let cursor = today.getTime()
  // Allow streak to "end yesterday" if today has no doses yet
  if (!activeDaySet.has(cursor)) {
    cursor = subDays(new Date(cursor), 1).getTime()
  }
  while (activeDaySet.has(cursor)) {
    currentStreak += 1
    cursor = subDays(new Date(cursor), 1).getTime()
  }

  // ── Current rest streak (consecutive zero-dose days ending today) ──
  let currentRestStreak = 0
  cursor = today.getTime()
  while (!activeDaySet.has(cursor) && cursor >= earliest) {
    currentRestStreak += 1
    cursor = subDays(new Date(cursor), 1).getTime()
  }

  // ── Longest streak ──
  let longestStreak = 0
  let run = 0
  let prevTs: number | null = null
  // Walk through sorted unique active-day timestamps
  const uniqueDays = Array.from(activeDaySet).sort((a, b) => a - b)
  for (const ts of uniqueDays) {
    if (prevTs !== null && ts - prevTs === 24 * 60 * 60 * 1000) {
      run += 1
    } else {
      run = 1
    }
    longestStreak = Math.max(longestStreak, run)
    prevTs = ts
  }

  // ── Avg doses per active day (last 30 days) ──
  const thirtyDaysAgo = subDays(now, 30).getTime()
  const recentDoses = doses.filter(d => safeDate(d.timestamp).getTime() >= thirtyDaysAgo)
  const recentActiveDays = new Set(recentDoses.map(d => startOfDay(safeDate(d.timestamp)).getTime()))
  const avgDosesPerActiveDay30d = recentActiveDays.size > 0
    ? Math.round((recentDoses.length / recentActiveDays.size) * 10) / 10
    : 0

  // ── Most active day of week ──
  const dowCounts = new Array(7).fill(0)
  for (const d of doses) {
    dowCounts[safeDate(d.timestamp).getDay()] += 1
  }
  let mostActiveDow: { day: number; label: string; count: number } | null = null
  for (let i = 0; i < 7; i++) {
    if (!mostActiveDow || dowCounts[i] > mostActiveDow.count) {
      mostActiveDow = { day: i, label: DAY_LABELS[i], count: dowCounts[i] }
    }
  }
  if (mostActiveDow && mostActiveDow.count === 0) mostActiveDow = null

  // ── Most active hour ──
  const hourCounts = new Array(24).fill(0)
  for (const d of doses) {
    hourCounts[safeDate(d.timestamp).getHours()] += 1
  }
  let mostActiveHour: { hour: number; count: number } | null = null
  for (let i = 0; i < 24; i++) {
    if (!mostActiveHour || hourCounts[i] > mostActiveHour.count) {
      mostActiveHour = { hour: i, count: hourCounts[i] }
    }
  }
  if (mostActiveHour && mostActiveHour.count === 0) mostActiveHour = null

  // ── Unique substances ──
  const uniqueSubstances = new Set(doses.map(d => d.substanceName)).size

  return {
    currentStreak,
    longestStreak,
    currentRestStreak,
    avgDosesPerActiveDay30d,
    mostActiveDayOfWeek: mostActiveDow,
    mostActiveHour,
    uniqueSubstances,
    totalActiveDays,
    totalRestDays,
  }
}

// ─── Intensity timeline (interactive, for /analytics) ───────────────────────

export interface IntensityTimelinePoint {
  /** ISO timestamp for this sample point */
  timestamp: string
  /** Display label e.g. "2:00 PM" */
  label: string
  /** 0–100 — combined intensity across all active doses at this time */
  intensity: number
  /** Per-substance breakdown at this point (for tooltips) */
  bySubstance: Record<string, number>
}

/**
 * Sample the combined intensity curve over a time window.
 *
 * For each dose, we compute the dose-relative intensity (0–100) using
 * the same model as the active-doses-timeline. We then sample the
 * combined curve at fixed intervals.
 *
 * Returns a flat array suitable for a Recharts line/area chart.
 */
export function computeIntensityTimeline(
  doses: DoseLog[],
  windowHours: number = 24,
  sampleIntervalMins: number = 15,
): IntensityTimelinePoint[] {
  // Lazy-load the timeline utils to avoid circular imports at module load time
  // (these are pure functions but they pull in a lot of code).
  const {
    parseDurationToMinutes,
    calculatePhaseTimings,
    calculateDoseScaledTimings,
    intensityAt,
  } = require('@/components/dose-timeline/dose-timeline-utils')
  const { classifyDose } = require('@/lib/dose-classification')
  const { substances } = require('@/lib/substances/index')

  const now = Date.now()
  const windowStart = now - windowHours * 60 * 60 * 1000

  // Build a name→substance lookup
  const substanceByName = new Map<string, any>()
  for (const s of substances) {
    substanceByName.set(s.name.toLowerCase(), s)
  }

  // Precompute each dose's intensity curve function (progress → 0-100)
  type Curve = {
    substanceName: string
    doseStartTs: number
    totalDurationMins: number
    timings: any
    doseHeight: number
  }
  const curves: Curve[] = []

  for (const d of doses) {
    if (!d.duration) continue
    const totalMins = parseDurationToMinutes(d.duration.total ?? '')
    if (totalMins <= 0) continue
    const doseStartTs = safeDate(d.timestamp).getTime()
    const doseEndTs = doseStartTs + totalMins * 60 * 1000
    // Skip doses that ended before the window start
    if (doseEndTs < windowStart) continue

    const substanceEntry = substanceByName.get(d.substanceName.toLowerCase())
    const classification = substanceEntry
      ? classifyDose(d.amount, d.unit, substanceEntry, d.route)
      : null
    const horizontalWeight = classification?.horizontalWeight ?? 0.5
    const doseHeight = classification?.heightRelativeToCommon ?? 1
    const timings = classification
      ? calculateDoseScaledTimings(d.duration, horizontalWeight)
      : calculatePhaseTimings(d.duration)

    curves.push({
      substanceName: d.substanceName,
      doseStartTs,
      totalDurationMins: timings.totalDuration,
      timings,
      doseHeight,
    })
  }

  // Sample the combined curve
  const points: IntensityTimelinePoint[] = []
  const sampleCount = Math.ceil((windowHours * 60) / sampleIntervalMins)
  for (let i = 0; i <= sampleCount; i++) {
    const ts = windowStart + i * sampleIntervalMins * 60 * 1000
    const bySubstance: Record<string, number> = {}
    let combined = 0
    for (const c of curves) {
      const elapsedMins = (ts - c.doseStartTs) / 60_000
      if (elapsedMins < 0 || elapsedMins > c.timings.totalDuration) continue
      const progress = (elapsedMins / c.timings.totalDuration) * 100
      const raw = intensityAt(progress, c.timings)
      // Scale by dose height — bigger doses rise above 100 visually
      const scaled = Math.min(100, raw * c.doseHeight)
      if (scaled > 0.5) {
        bySubstance[c.substanceName] = Math.max(bySubstance[c.substanceName] ?? 0, scaled)
        combined = Math.max(combined, scaled) // peak-hold, not sum (avoids runaway values)
      }
    }
    points.push({
      timestamp: new Date(ts).toISOString(),
      label: format(new Date(ts), windowHours <= 24 ? 'h:mm a' : 'MMM d HH:mm'),
      intensity: Math.round(combined),
      bySubstance,
    })
  }

  return points
}

// ─── Pie chart color palette ────────────────────────────────────────────────

/** Distinct, color-blind-friendly palette for pie/breakdown charts. */
export const ANALYTICS_PIE_COLORS = [
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ec4899', // pink
  '#3b82f6', // blue
  '#ef4444', // red
  '#84cc16', // lime
  '#8b5cf6', // violet
  '#14b8a6', // teal
]

export function pieColor(index: number): string {
  return ANALYTICS_PIE_COLORS[index % ANALYTICS_PIE_COLORS.length]
}
