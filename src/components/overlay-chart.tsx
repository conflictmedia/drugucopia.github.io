'use client'

import { useState, useEffect, useMemo, useLayoutEffect } from 'react'
import { format } from 'date-fns'
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
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity, Timer, Clock, Loader2,
} from 'lucide-react'
import { useReminderStore } from '@/store/reminder-store'
import { formatDoseAmount } from '@/lib/utils'
import {
  parseDurationToMinutes,
  combinedIntensityAt,
  scaledIntensityAt,
  combineGroupsForOverlay,
  groupSameDoseCombos,
  getPhaseBandRanges,
} from '@/components/dose-timeline/dose-timeline-utils'
import {
  phaseColors,
  phaseIcons,
  ROUTE_PALETTE,
  PHASE_BANDS,
  NOW_INDICATOR,
} from '@/components/dose-timeline/dose-timeline-constants'
import type {
  SubstanceGroup,
  RouteGroup,
  PhaseName,
  OverlayDoseSeries,
  OverlayChartConfig,
  ComboDose,
} from '@/components/dose-timeline/dose-timeline-types'
import type { TimelineDisplaySettings } from '@/store/timeline-display-store'

// Generate a stable random color for a substance based on its key
function getSubstanceColor(substanceKey: string): string {
  // Simple hash function to generate consistent colors
  let hash = 0
  for (let i = 0; i < substanceKey.length; i++) {
    hash = substanceKey.charCodeAt(i) + ((hash << 5) - hash)
  }
  // Generate HSL color with good saturation and lightness for visibility
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

export interface OverlayChartProps {
  groups: SubstanceGroup[]
  getCategoryColor: (cats: string[]) => string
  nowTs: number
  windowHours: number | null
  displaySettings: TimelineDisplaySettings
}

export function OverlayChart({
  groups,
  getCategoryColor,
  nowTs,
  windowHours,
  displaySettings,
}: OverlayChartProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Collect all visible routes from all groups
  const allVisibleRoutes = useMemo(() => {
    const routes: RouteGroup[] = []
    for (const group of groups) {
      for (const rg of group.routes) {
        routes.push(rg)
      }
    }
    return routes
  }, [groups])

  const sampleCount = isMobile ? 40 : 120

  const windowOverride = useMemo(() => {
    if (windowHours === null) return null
    const endMs = nowTs
    const startMs = endMs - windowHours * 60 * 60 * 1000
    return { startMs, endMs }
  }, [windowHours, nowTs])

  // Build combined overlay config
  const overlayConfig = useMemo(
    () => combineGroupsForOverlay(
      groups,
      allVisibleRoutes,
      sampleCount,
      windowOverride,
      displaySettings.redoseCombining,
      displaySettings.substanceHeight
    ),
    [groups, allVisibleRoutes, sampleCount, windowOverride, displaySettings.redoseCombining, displaySettings.substanceHeight]
  )

  // Check if any dose is active
  const allActive = groups.some(group =>
    group.routes.some(rg => rg.doses.some(d => (nowTs - d.doseTime.getTime()) / 60_000 < d.timings.offsetEnd))
  )
  const allEnded = groups.every(group =>
    group.routes.every(rg => rg.doses.every(d => (nowTs - d.doseTime.getTime()) / 60_000 >= d.timings.offsetEnd))
  )

  // Combined intensity right now
  const currentCombinedIntensity = useMemo(() => {
    if (!allActive) return null
    const activeDoses = groups.flatMap(g => g.routes.flatMap(rg => rg.doses)).filter(d => {
      const elapsed = (nowTs - d.doseTime.getTime()) / 60_000
      return elapsed >= 0 && elapsed < d.timings.offsetEnd
    })
    if (activeDoses.length === 0) return null
    const intensities = activeDoses.map(d => scaledIntensityAt(d, nowTs))
    const combined = combinedIntensityAt(intensities)
    return Math.round(Math.min(100, combined))
  }, [groups, allActive, nowTs])

  // Night bands
  const nightBands = useMemo(() => {
    const bands: Array<{ startMs: number; endMs: number }> = []
    const start = new Date(overlayConfig.windowStartMs)
    const end = new Date(overlayConfig.windowEndMs)
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    while (cursor.getTime() < end.getTime()) {
      const nightStart = new Date(cursor)
      nightStart.setHours(22, 0, 0, 0)
      const nightEnd = new Date(cursor)
      nightEnd.setDate(nightEnd.getDate() + 1)
      nightEnd.setHours(6, 0, 0, 0)
      const ms1 = Math.max(nightStart.getTime(), overlayConfig.windowStartMs)
      const ms2 = Math.min(nightEnd.getTime(), overlayConfig.windowEndMs)
      if (ms1 < ms2) {
        bands.push({ startMs: ms1, endMs: ms2 })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return bands
  }, [overlayConfig.windowStartMs, overlayConfig.windowEndMs])

  // Create a stable color map for each substance
  const substanceColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of groups) {
      map.set(group.key, getSubstanceColor(group.key))
    }
    return map
  }, [groups])

  // Substance toggle for overlay mode
  const [hiddenSubstances, setHiddenSubstances] = useState<Set<string>>(new Set())
  const visibleOverlaySeries = overlayConfig.series.filter(s => !hiddenSubstances.has(s.substanceKey))

  const WINDOW_OPTIONS = [
    { hours: 1, label: '1h' },
    { hours: 4, label: '4h' },
    { hours: 12, label: '12h' },
    { hours: 24, label: '24h' },
    { hours: null, label: 'All' },
  ] as const

  return (
    <div className="space-y-4">
      {/* Top toolbar: substance toggles + window zoom selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Substance toggle chips */}
        {groups.length > 1 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {groups.map(g => {
              const hidden = hiddenSubstances.has(g.key)
              const color = substanceColorMap.get(g.key) ?? getCategoryColor(g.categories)
              return (
                <button
                  key={g.key}
                  onClick={() => setHiddenSubstances(prev => {
                    const next = new Set(prev)
                    if (next.has(g.key)) next.delete(g.key)
                    else next.add(g.key)
                    return next
                  })}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${hidden ? 'opacity-30 border-base-300 line-through' : 'opacity-90 hover:opacity-100'}`}
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
        ) : (
          <div />
        )}

        {/* Window zoom selector */}
        <div className="flex items-center gap-0.5 bg-base-200 rounded-lg p-0.5 shrink-0">
          {WINDOW_OPTIONS.map(opt => {
            const isActive = windowHours === opt.hours
            return (
              <button
                key={opt.label}
                onClick={() => {}}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${isActive
                  ? 'bg-primary text-primary-content'
                  : 'text-neutral-content hover:text-base-content hover:bg-base-300/50'
                  }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Single overlay chart card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">All Substances (Overlay)</h3>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {displaySettings.displayMode === 'normalized' ? 'Normalized' : 'Overlay'}
              </Badge>
              {allActive && currentCombinedIntensity !== null && (
                <Badge variant="outline" className="text-xs font-mono">
                  <Activity className="h-3 w-3 mr-1 text-purple-400" />
                  {currentCombinedIntensity}%
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {allActive && (
                <span className="text-xs text-neutral-content flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Active
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
        </CardHeader>

        <CardContent className="pt-0">
          {/* Chart container */}
          <div className="relative">
            {/* Dose start markers */}
            {mounted && visibleOverlaySeries.map(s => {
              const doseStartMs = s.dose.doseTime.getTime()
              if (doseStartMs < overlayConfig.windowStartMs || doseStartMs > overlayConfig.windowEndMs) return null
              const pct = ((doseStartMs - overlayConfig.windowStartMs) / (overlayConfig.windowEndMs - overlayConfig.windowStartMs)) * 100
              const comboLabel = s.comboInfo
                ? `${s.comboInfo.combinedAmount} · ${s.comboInfo.routes.join(' + ')}`
                : `${s.substanceName} ${formatDoseAmount(s.dose.amount, s.dose.unit).amount}${formatDoseAmount(s.dose.amount, s.dose.unit).unit}`
              return (
                <div
                  key={`dose-marker-${s.dataKey}`}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: `calc(20px + ${pct / 100} * (100% - 28px))`,
                    bottom: 0,
                    transform: 'translateX(-50%)',
                  }}
                  title={`${comboLabel} · ${format(new Date(doseStartMs), 'h:mm a')}`}
                >
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: `5px solid ${s.palette.stroke}`,
                      opacity: 0.8,
                    }}
                  />
                </div>
              )
            })}

            <div
              style={{ width: '100%', height: isMobile ? 200 : 280 }}
              tabIndex={0}
              role="application"
              aria-label="Intensity timeline overlay chart. Use arrow keys to navigate, Escape to clear."
              onKeyDown={(e) => {
                const svg = e.currentTarget.querySelector('svg.recharts-surface')
                if (!svg) return
                const rect = svg.getBoundingClientRect()
                const currentX = (svg as any).__cursorX ?? rect.width / 2
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  const step = rect.width * 0.03
                  const nextX = Math.max(0, Math.min(rect.width, currentX + (e.key === 'ArrowRight' ? step : -step)))
                  ;(svg as any).__cursorX = nextX
                  const mouseEvent = new MouseEvent('mousemove', {
                    bubbles: true,
                    clientX: rect.left + nextX,
                    clientY: rect.top + rect.height / 2,
                  })
                  svg.dispatchEvent(mouseEvent)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  svg.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
                  ;(svg as any).__cursorX = undefined
                }
              }}
              onMouseMove={(e) => {
                const svg = e.currentTarget.querySelector('svg.recharts-surface')
                if (!svg) return
                const rect = svg.getBoundingClientRect()
                const x = e.clientX - rect.left
                ;(svg as any).__cursorX = x

                const snapThresholdPx = rect.width * 0.03
                let nearestDoseX: number | null = null
                let nearestDist = Infinity
                for (const s of visibleOverlaySeries) {
                  const doseStartMs = s.dose.doseTime.getTime()
                  if (doseStartMs < overlayConfig.windowStartMs || doseStartMs > overlayConfig.windowEndMs) continue
                  const dosePct = (doseStartMs - overlayConfig.windowStartMs) / (overlayConfig.windowEndMs - overlayConfig.windowStartMs)
                  const doseX = dosePct * rect.width
                  const dist = Math.abs(doseX - x)
                  if (dist < nearestDist) {
                    nearestDist = dist
                    nearestDoseX = doseX
                  }
                }
                if (nearestDoseX !== null && nearestDist < snapThresholdPx && Math.abs(nearestDoseX - x) > 1) {
                  svg.dispatchEvent(new MouseEvent('mousemove', {
                    bubbles: true,
                    clientX: rect.left + nearestDoseX,
                    clientY: e.clientY,
                  }))
                }
              }}
            >
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overlayConfig.data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
                    <defs>
                      {visibleOverlaySeries.map((s, i) => {
                        const substanceColor = substanceColorMap.get(s.substanceKey) ?? s.substanceColor;
                        return (
                          <linearGradient key={`grad-${s.substanceKey}-${i}`} id={`grad-${s.substanceKey}-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={substanceColor} stopOpacity={displaySettings.opacity * 0.3} />
                            <stop offset="100%" stopColor={substanceColor} stopOpacity={displaySettings.opacity * 0.02} />
                          </linearGradient>
                        )
                      })}
                      <linearGradient id={`bg-grad-overlay`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
                      </linearGradient>
                    </defs>

                    <rect x={0} y={0} width="100%" height="100%" fill="url(#bg-grad-overlay)" fillOpacity={0.5} />

                    {/* Night-hour background bands */}
                    {displaySettings.showNightBands && nightBands.map((nb, i) => (
                      <ReferenceArea
                        key={`night-${i}`}
                        x1={nb.startMs}
                        x2={nb.endMs}
                        strokeOpacity={0}
                        fill="#1e293b"
                        fillOpacity={0.15}
                      />
                    ))}

                    {displaySettings.showGridLines && (
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    )}

                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={[overlayConfig.windowStartMs, overlayConfig.windowEndMs]}
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
                      label={{ value: 'Intensity', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'currentColor', opacity: 0.6, dy: 20 }}
                    />
                    <Tooltip
                      content={<OverlayTooltip series={visibleOverlaySeries} windowStartMs={overlayConfig.windowStartMs} windowEndMs={overlayConfig.windowEndMs} nowTs={nowTs} />}
                      cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />

                    {/* Now indicator */}
                    {displaySettings.showNowIndicator && nowTs >= overlayConfig.windowStartMs && nowTs <= overlayConfig.windowEndMs && (
                      <ReferenceLine
                        x={nowTs}
                        stroke={NOW_INDICATOR.color}
                        strokeWidth={NOW_INDICATOR.strokeWidth}
                        strokeDasharray={NOW_INDICATOR.dashArray}
                        label={(props: { viewBox?: { x?: number; y?: number } }) => {
                          const cx = props.viewBox?.x ?? 0
                          const cy = 4
                          return (
                            <g>
                              <text
                                x={cx}
                                y={cy - 6}
                                textAnchor="middle"
                                fontSize={8}
                                fill={NOW_INDICATOR.color}
                                opacity={0.8}
                              >
                                NOW
                              </text>
                              <circle cx={cx} cy={cy} r={NOW_INDICATOR.dotRadius} fill={NOW_INDICATOR.color}>
                                <animate
                                  attributeName="opacity"
                                  values="1;0.3;1"
                                  dur={`${NOW_INDICATOR.pulseDurationMs}ms`}
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="r"
                                  values={`${NOW_INDICATOR.dotRadius};${NOW_INDICATOR.dotRadius * 0.7};${NOW_INDICATOR.dotRadius}`}
                                  dur={`${NOW_INDICATOR.pulseDurationMs}ms`}
                                  repeatCount="indefinite"
                                />
                              </circle>
                            </g>
                          )
                        }}
                      />
                    )}

                    {/* Area series */}
                    {visibleOverlaySeries.map((s, i) => {
                      // Use substance-specific color from our color map
                      const substanceColor = substanceColorMap.get(s.substanceKey) ?? s.substanceColor;
                      return (
                        <Area
                          key={s.dataKey}
                          type={displaySettings.curveStyle === 'smooth' ? 'monotone' : 'stepAfter'}
                          dataKey={s.dataKey}
                          stroke={substanceColor}
                          strokeWidth={1.5}
                          fillOpacity={displaySettings.opacity * 0.3}
                          fill={`url(#grad-${s.substanceKey}-${i})`}
                          isAnimationActive={false}
                        />
                      )
                    })}

                    {/* Projected next dose */}
                    {(() => {
                      const reminderSchedules = useReminderStore.getState().schedules
                      for (const group of groups) {
                        const schedule = reminderSchedules.find(
                          s => s.enabled && s.substanceName.toLowerCase() === group.substanceName.toLowerCase(),
                        )
                        if (schedule) {
                          const lastDose = group.routes.flatMap(rg => rg.doses).reduce((latest, d) =>
                            d.doseTime.getTime() > latest.doseTime.getTime() ? d : latest,
                            group.routes[0].doses[0])
                          const nextDoseTs = lastDose.doseTime.getTime() + schedule.intervalMinutes * 60_000
                          if (nextDoseTs > nowTs && nextDoseTs <= overlayConfig.windowEndMs) {
                            const projectedSeries = visibleOverlaySeries.find(
                              s => s.substanceKey === group.key && !s.comboInfo
                            )
                            if (projectedSeries) {
                              return (
                                <ReferenceLine
                                  key={`projected-${group.key}`}
                                  x={nextDoseTs}
                                  stroke={projectedSeries.palette.stroke}
                                  strokeWidth={1}
                                  strokeDasharray="5 5"
                                  strokeOpacity={0.5}
                                  label={{ position: 'top', offset: -10, fill: projectedSeries.palette.stroke, fontSize: 9, formatter: () => 'Next dose' }}
                                />
                              )
                            }
                          }
                        }
                      }
                      return null
                    })()}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-content" />
                </div>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

// ─── Overlay Tooltip ────────────────────────────────────────────────────────

interface OverlayTooltipProps {
  series: OverlayDoseSeries[]
  windowStartMs: number
  windowEndMs: number
  nowTs: number
}

function OverlayTooltip({ active, payload, label, series, windowStartMs, windowEndMs, nowTs }: OverlayTooltipProps & { active?: boolean; payload?: any[]; label?: any }) {
  if (!active || !payload || !payload.length) return null

  const payload0 = payload[0]
  const t = payload0.value
  const timestamp = windowStartMs + (t / 100) * (windowEndMs - windowStartMs)

  // Create a map of dataKey to substance info for proper naming
  const seriesMap = new Map(series.map(s => [s.dataKey, s]))

  return (
    <div className="bg-base-100 border border-base-300 rounded-lg p-3 shadow-lg min-w-[200px]">
      <p className="font-medium text-sm mb-1">{format(new Date(timestamp), 'h:mm a')}</p>
      {payload.map((entry, idx) => {
        const seriesInfo = seriesMap.get(entry.dataKey)
        const substanceName = seriesInfo?.substanceName ?? entry.name
        const doseInfo = seriesInfo?.comboInfo
        const displayName = doseInfo
          ? `${doseInfo.combinedAmount} (${doseInfo.routes.join(' + ')})`
          : substanceName
        return (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{displayName}: {entry.value?.toFixed(1) ?? 0}%</span>
          </div>
        )
      })}
    </div>
  )
}