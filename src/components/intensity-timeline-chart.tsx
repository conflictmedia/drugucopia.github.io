'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { useDoseStore } from '@/store/dose-store'
import { computeIntensityTimeline, type IntensityTimelinePoint } from '@/lib/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, Clock, Zap } from 'lucide-react'
import { format } from 'date-fns'

const WINDOW_OPTIONS = [
  { hours: 6, label: '6h', sampleMins: 5 },
  { hours: 12, label: '12h', sampleMins: 10 },
  { hours: 24, label: '24h', sampleMins: 15 },
  { hours: 48, label: '48h', sampleMins: 30 },
  { hours: 168, label: '7d', sampleMins: 60 },
] as const

/**
 * Interactive intensity timeline.
 *
 * Replaces the static active-doses-timeline on the analytics page.
 * Renders the combined 0–100 intensity curve over a selectable time
 * window, with a hover tooltip showing per-substance intensity breakdown.
 *
 * On mobile, the chart height is reduced and the sample interval is
 * bumped up to keep the DOM light and re-renders cheap.
 */
export function IntensityTimelineChart() {
  const doses = useDoseStore(s => s.doses)
  const isLoaded = useDoseStore(s => s.isLoaded)

  const [windowIdx, setWindowIdx] = useState(2) // default 24h
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Re-tick every 60 seconds so the "now" indicator and tail of the
  // curve stay current. (Cheaper than the 1-second reminder tick.)
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const opt = WINDOW_OPTIONS[windowIdx]

  const points: IntensityTimelinePoint[] = useMemo(() => {
    if (!isLoaded || doses.length === 0) return []
    // On mobile, double the sample interval to halve the DOM cost
    const sampleMins = isMobile ? opt.sampleMins * 2 : opt.sampleMins
    return computeIntensityTimeline(doses, opt.hours, sampleMins)
  }, [doses, isLoaded, opt.hours, opt.sampleMins, isMobile])

  // For multi-substance hover display, derive the list of substances
  // present anywhere in the window (so legend is stable)
  const substancesInWindow = useMemo(() => {
    const set = new Set<string>()
    for (const p of points) {
      for (const name of Object.keys(p.bySubstance)) set.add(name)
    }
    return Array.from(set).sort()
  }, [points])

  const hasData = points.length > 0 && points.some(p => p.intensity > 0)

  const now = new Date()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Intensity Timeline
            </CardTitle>
            <CardDescription className="mt-1">
              Combined psychoactive intensity over time, modeled from your dose log.
            </CardDescription>
          </div>
          {/* Window selector */}
          <div className="flex gap-1 bg-base-200 rounded-lg p-1">
            {WINDOW_OPTIONS.map((o, i) => (
              <Button
                key={o.label}
                size="sm"
                variant={i === windowIdx ? 'default' : 'ghost'}
                className="h-7 px-2.5 text-xs"
                onClick={() => setWindowIdx(i)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="h-10 w-10 text-neutral-content opacity-30 mb-3" />
            <p className="text-sm font-medium">No active dose data in this window</p>
            <p className="text-xs text-neutral-content mt-1">
              Log doses with duration info to see your intensity curve here.
            </p>
          </div>
        ) : (
          <>
            <div style={{ width: '100%', height: isMobile ? 220 : 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    stroke="currentColor"
                    interval={isMobile ? Math.floor(points.length / 4) : 'preserveStartEnd'}
                    minTickGap={16}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    stroke="currentColor"
                    width={32}
                  />
                  <Tooltip
                    content={<IntensityTooltip substances={substancesInWindow} />}
                    cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1 }}
                  />
                  <ReferenceLine
                    y={50}
                    stroke="rgba(255,255,255,0.15)"
                    strokeDasharray="4 4"
                    label={{ value: '50%', fontSize: 10, fill: 'currentColor', position: 'right' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="intensity"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#intensityGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Substances present in window */}
            {substancesInWindow.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-base-300/50">
                {substancesInWindow.map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-base-200 text-base-content/80"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-3 text-xs text-neutral-content">
              <Clock className="h-3 w-3" />
              <span>
                Showing last {opt.label}. Updated {format(now, 'h:mm a')}.
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Custom tooltip ─────────────────────────────────────────────────────────

function IntensityTooltip({
  active,
  payload,
  label,
  substances,
}: {
  active?: boolean
  payload?: Array<{ payload: IntensityTimelinePoint }>
  label?: string
  substances: string[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0].payload
  const present = substances.filter(s => (p.bySubstance[s] ?? 0) > 0)
  return (
    <div className="rounded-lg border border-base-300 bg-base-100/95 backdrop-blur-sm shadow-xl p-3 max-w-[260px]">
      <p className="text-xs font-semibold mb-1">{label}</p>
      <p className="text-sm font-mono text-purple-400">
        {p.intensity}% intensity
      </p>
      {present.length > 0 && (
        <div className="mt-2 pt-2 border-t border-base-300/50 space-y-0.5">
          {present.map(name => (
            <div key={name} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-neutral-content">{name}</span>
              <span className="font-mono">{Math.round(p.bySubstance[name])}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
