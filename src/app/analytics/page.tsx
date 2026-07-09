'use client'

import React, { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts'
import { useDoseStore } from '@/store/dose-store'
import {
  dailyCounts,
  weeklyCounts,
  monthlyCounts,
  substanceBreakdown,
  categoryBreakdown,
  estimateTolerance,
  computeStreakInsights,
  pieColor,
} from '@/lib/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IntensityTimelineChart } from '@/components/intensity-timeline-chart'
import {
  Activity,
  Calendar,
  TrendingUp,
  Flame,
  Clock,
  Target,
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  Brain,
  Trophy,
  CalendarDays,
} from 'lucide-react'
import { format } from 'date-fns'

// ─── Range selector ────────────────────────────────────────────────────────

type RangeKey = '7d' | '30d' | '90d' | '1y'

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '1y', label: '1 year', days: 365 },
]

export default function AnalyticsPage() {
  const doses = useDoseStore(s => s.doses)
  const isLoaded = useDoseStore(s => s.isLoaded)
  const [range, setRange] = useState<RangeKey>('30d')

  const rangeDays = RANGE_OPTIONS.find(r => r.key === range)!.days

  // ── Compute all the things ──
  const daily = useMemo(() => dailyCounts(doses, Math.min(rangeDays, 90)), [doses, rangeDays])
  const weekly = useMemo(() => weeklyCounts(doses, Math.min(Math.ceil(rangeDays / 7), 52)), [doses, rangeDays])
  const monthly = useMemo(() => monthlyCounts(doses, Math.min(Math.ceil(rangeDays / 30), 12)), [doses, rangeDays])
  const subs = useMemo(() => substanceBreakdown(doses), [doses])
  const cats = useMemo(() => categoryBreakdown(doses), [doses])
  const tolerance = useMemo(() => estimateTolerance(doses), [doses])
  const streaks = useMemo(() => computeStreakInsights(doses), [doses])

  if (!isLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (doses.length === 0) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-3xl">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop container */}
      <div className="hidden md:block container mx-auto py-6 lg:py-10 px-4 lg:px-6 max-w-7xl">
        <AnalyticsHeader range={range} onRangeChange={setRange} />
        <div className="space-y-6">
          <StreakInsightsRow insights={streaks} />
          <IntensityTimelineChart />
          <UsageChartsRow daily={daily} weekly={weekly} monthly={monthly} range={range} />
          <BreakdownsRow substances={subs} categories={cats} />
          <ToleranceSection tolerance={tolerance} />
        </div>
      </div>

      {/* Mobile container */}
      <div className="md:hidden px-4 pt-4 pb-8 space-y-4">
        <AnalyticsHeader range={range} onRangeChange={setRange} compact />
        <StreakInsightsRow insights={streaks} compact />
        <IntensityTimelineChart />
        <UsageChartsRow daily={daily} weekly={weekly} monthly={monthly} range={range} compact />
        <BreakdownsRow substances={subs} categories={cats} compact />
        <ToleranceSection tolerance={tolerance} compact />
      </div>
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────────

function AnalyticsHeader({
  range,
  onRangeChange,
  compact,
}: {
  range: RangeKey
  onRangeChange: (r: RangeKey) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? 'mb-4' : 'mb-8'}>
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      </div>
      <p className={compact ? 'text-xs text-neutral-content mb-3' : 'text-sm text-neutral-content mb-4'}>
        Track usage patterns, tolerance, and streaks. Heuristics only — for harm-reduction awareness.
      </p>
      <div className="flex gap-1 bg-base-200 rounded-lg p-1 w-fit">
        {RANGE_OPTIONS.map(o => (
          <Button
            key={o.key}
            size="sm"
            variant={range === o.key ? 'default' : 'ghost'}
            className="h-8 px-3 text-xs"
            onClick={() => onRangeChange(o.key)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BarChart3 className="h-16 w-16 text-neutral-content opacity-30 mb-4" />
      <h2 className="text-xl font-semibold mb-2">No dose data yet</h2>
      <p className="text-sm text-neutral-content max-w-md">
        Log your first dose from the Substances page to unlock analytics:
        usage charts, tolerance estimation, and streak insights.
      </p>
    </div>
  )
}

// ─── Streak Insights Row ────────────────────────────────────────────────────

function StreakInsightsRow({
  insights,
  compact,
}: {
  insights: ReturnType<typeof computeStreakInsights>
  compact?: boolean
}) {
  const cards = [
    {
      icon: Flame,
      label: 'Current Streak',
      value: `${insights.currentStreak}d`,
      hint: insights.currentStreak === 0 ? 'No active day streak' : 'Active days in a row',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
    {
      icon: Trophy,
      label: 'Longest Streak',
      value: `${insights.longestStreak}d`,
      hint: 'Personal record',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Calendar,
      label: 'Rest Day Streak',
      value: `${insights.currentRestStreak}d`,
      hint: 'Days since last dose',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: Target,
      label: 'Avg / Active Day',
      value: `${insights.avgDosesPerActiveDay30d}`,
      hint: 'Last 30 days',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ]

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-neutral-content truncate">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
              <div className={`p-2 rounded-lg shrink-0 ${c.bg}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </div>
            <p className="text-[10px] text-neutral-content mt-1 truncate">{c.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Usage Charts Row ───────────────────────────────────────────────────────

function UsageChartsRow({
  daily,
  weekly,
  monthly,
  range,
  compact,
}: {
  daily: ReturnType<typeof dailyCounts>
  weekly: ReturnType<typeof weeklyCounts>
  monthly: ReturnType<typeof monthlyCounts>
  range: RangeKey
  compact?: boolean
}) {
  // Choose which series to highlight based on the selected range
  const showWeekly = range === '90d'
  const showMonthly = range === '1y'

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Daily Usage
          </CardTitle>
          <CardDescription>Doses logged per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: compact ? 180 : 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  stroke="currentColor"
                  interval={compact ? Math.floor(daily.length / 4) : 'preserveStartEnd'}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  stroke="currentColor"
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-base-100)',
                    border: '1px solid var(--color-base-300)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'currentColor' }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar
                  dataKey="count"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {showWeekly ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Weekly Usage
            </CardTitle>
            <CardDescription>Doses logged per week (Sunday-start)</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: compact ? 180 : 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} stroke="currentColor" />
                  <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} stroke="currentColor" width={28} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-base-100)', border: '1px solid var(--color-base-300)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'currentColor' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : showMonthly ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Monthly Usage
            </CardTitle>
            <CardDescription>Doses logged per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: compact ? 180 : 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} stroke="currentColor" />
                  <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} stroke="currentColor" width={28} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-base-100)', border: '1px solid var(--color-base-300)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'currentColor' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PatternInsightsCard />
      )}

      {/* Pattern insights card — show alongside when there's room */}
      {(showWeekly || showMonthly) && !compact && <PatternInsightsCard />}
    </div>
  )
}

// ─── Pattern insights ───────────────────────────────────────────────────────

function PatternInsightsCard() {
  const doses = useDoseStore(s => s.doses)
  const insights = useMemo(() => computeStreakInsights(doses), [doses])

  const items: { icon: React.ElementType; label: string; value: string; color: string }[] = []

  if (insights.mostActiveDayOfWeek) {
    items.push({
      icon: Calendar,
      label: 'Most active day',
      value: insights.mostActiveDayOfWeek.label,
      color: 'text-amber-400',
    })
  }

  if (insights.mostActiveHour) {
    const h = insights.mostActiveHour.hour
    const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
    items.push({
      icon: Clock,
      label: 'Most active hour',
      value: `${label} (${insights.mostActiveHour.count} doses)`,
      color: 'text-blue-400',
    })
  }

  items.push({
    icon: Activity,
    label: 'Active vs rest days',
    value: `${insights.totalActiveDays} active / ${insights.totalRestDays} rest`,
    color: 'text-emerald-400',
  })

  items.push({
    icon: Target,
    label: 'Unique substances',
    value: `${insights.uniqueSubstances}`,
    color: 'text-purple-400',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Usage Patterns
        </CardTitle>
        <CardDescription>Insights derived from your dose log</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-base-200 shrink-0">
              <it.icon className={`h-4 w-4 ${it.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-neutral-content">{it.label}</p>
              <p className={`text-sm font-medium ${it.color} truncate`}>{it.value}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Breakdowns Row ─────────────────────────────────────────────────────────

function BreakdownsRow({
  substances,
  categories,
  compact,
}: {
  substances: ReturnType<typeof substanceBreakdown>
  categories: ReturnType<typeof categoryBreakdown>
  compact?: boolean
}) {
  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" />
            Substance Breakdown
          </CardTitle>
          <CardDescription>Dose count by substance</CardDescription>
        </CardHeader>
        <CardContent>
          {substances.length === 0 ? (
            <p className="text-sm text-neutral-content py-8 text-center">No data</p>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div style={{ width: compact ? 160 : 200, height: compact ? 160 : 200 }} className="shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={substances}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="45%"
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {substances.map((_, i) => (
                        <Cell key={i} fill={pieColor(i)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--color-base-100)', border: '1px solid var(--color-base-300)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'currentColor' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 w-full space-y-1.5">
                {substances.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: pieColor(i) }} />
                    <span className="flex-1 truncate text-base-content/90">{s.name}</span>
                    <span className="font-mono text-neutral-content">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Category Breakdown
          </CardTitle>
          <CardDescription>Dose count by psychoactive category</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-neutral-content py-8 text-center">No data</p>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div style={{ width: compact ? 160 : 200, height: compact ? 160 : 200 }} className="shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="45%"
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {categories.map((_, i) => (
                        <Cell key={i} fill={pieColor(i + 3)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--color-base-100)', border: '1px solid var(--color-base-300)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'currentColor' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 w-full space-y-1.5">
                {categories.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: pieColor(i + 3) }} />
                    <span className="flex-1 truncate text-base-content/90 capitalize">{c.name}</span>
                    <span className="font-mono text-neutral-content">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tolerance Section ──────────────────────────────────────────────────────

const TOLERANCE_LEVELS: Record<string, { color: string; bg: string; label: string; hex: string }> = {
  baseline: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Baseline', hex: '#10b981' },
  low: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Low', hex: '#3b82f6' },
  moderate: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Moderate', hex: '#f59e0b' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/15', label: 'High', hex: '#f97316' },
  'very-high': { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Very High', hex: '#ef4444' },
}

function ToleranceSection({
  tolerance,
  compact,
}: {
  tolerance: ReturnType<typeof estimateTolerance>
  compact?: boolean
}) {
  if (tolerance.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Tolerance Estimation
        </CardTitle>
        <CardDescription>
          Heuristic model — exponential decay with substance-specific half-lives. For harm-reduction awareness only, not dosing guidance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {tolerance.map(t => {
            const lv = TOLERANCE_LEVELS[t.level]
            const pct = Math.round(t.currentLevel * 100)
            return (
              <div
                key={t.substanceName}
                className="rounded-lg border border-base-300/60 bg-base-200/40 p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{t.substanceName}</p>
                    <p className="text-xs text-neutral-content mt-0.5">
                      {t.dosesLast30Days} dose(s) in last 30d · last {t.daysSinceLast}d ago
                    </p>
                  </div>
                  <span className={`badge badge-outline text-xs ${lv.color} ${lv.bg} border-current/30 shrink-0`}>
                    {lv.label}
                  </span>
                </div>

                {/* Radial gauge */}
                <div className="flex items-center gap-3">
                  <div style={{ width: 64, height: 64 }} className="shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="65%"
                        outerRadius="100%"
                        data={[{ name: 'tol', value: pct, fill: lv.hex }]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar background={{ fill: 'rgba(255,255,255,0.06)' }} dataKey="value" cornerRadius={6} isAnimationActive={false} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${lv.color}`}>{pct}%</span>
                      <span className="text-xs text-neutral-content">current</span>
                    </div>
                    <p className="text-xs text-neutral-content mt-0.5">
                      {t.daysToBaseline > 0
                        ? `~${t.daysToBaseline}d to baseline`
                        : 'At baseline'}
                    </p>
                  </div>
                </div>

                <details className="mt-3 group">
                  <summary className="text-[10px] text-neutral-content cursor-pointer hover:text-base-content transition-colors list-none flex items-center gap-1">
                    <span className="inline-block transition-transform group-open:rotate-90">›</span>
                    How this is computed
                  </summary>
                  <p className="text-[10px] text-neutral-content mt-1.5 pl-3 leading-relaxed">
                    {t.explanation}
                  </p>
                </details>
              </div>
            )
          })}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-200/80 leading-relaxed">
            <strong className="font-semibold">Disclaimer:</strong> Tolerance varies enormously
            between individuals, routes of administration, and dose sizes. This model uses
            simplified exponential decay with default half-lives per substance class. Always
            start low and consult harm-reduction resources when adjusting doses after a break.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
