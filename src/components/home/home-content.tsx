'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback, memo, useDeferredValue } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Search,
  X,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Clock,
  Droplets,
  FlaskConical,
  History,
  Shield,
  Scale,
  Route,
  ArrowLeft,
  Info,
  CheckCircle,
  MinusCircle,
  XCircle,
  Activity,
  Shuffle,
  Plus,
  Syringe,
  Github,
  Send,
  PenLine,
  CalendarDays,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import { DoseLoggerModal } from '@/components/dose-logger-modal'
import { DoseHistory } from '@/components/dose-history'
import { DoseStats } from '@/components/dose-stats'
import { IntensityTimelineChart } from '@/components/intensity-timeline-chart'
import { ActiveReminders } from '@/components/active-reminders'
import { ReminderSettings } from '@/components/reminder-settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  substances,
  type Substance,
  type SubstanceCategory,
  type RouteDosageDuration,
} from '@/lib/substances/index'
import { categories } from '@/lib/categories'
import {
  categoryColors,
  categoryDotColors,
  categoryGlowClasses,
  categoryIcons,
  GITHUB_FEEDBACK_URL,
  GITHUB_INFO_CHANGE_URL,
  GITHUB_MAIN_URL,
  GITHUB_NEW_SUBSTANCE_URL,
  riskLevelColors,
  routeDangerColors,
} from './home-constants'
import {
  CategoryBadges,
  CategoryIcon,
  getPrimaryCategory,
  getRouteIcon,
  getSubstanceCategories,
  substanceBelongsToCategory,
} from './home-utils'
import { useUIStore } from '@/store/ui-store'

// ─── MEMOIZED SUBSTANCE CARD ────────────────────────────────────────────────
interface SubstanceCardProps {
  substance: Substance
  onSelect: (s: Substance) => void
}

const SubstanceCard = memo(function SubstanceCard({ substance, onSelect }: SubstanceCardProps) {
  const primary = getPrimaryCategory(substance)
  const cats = getSubstanceCategories(substance)
  const hasRouteData = substance.routeData && Object.keys(substance.routeData).length > 1

  return (
    <div
      className={`card card-transparent cursor-pointer hover:border-primary/50 transition-all group card-lift ${primary ? categoryGlowClasses[primary] : ''}`}
      onClick={() => onSelect(substance)}
    >
      <div className="card-body p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {primary && (
              <div className={`p-2.5 rounded-xl shrink-0 transition-shadow duration-300 group-hover:shadow-lg ${categoryColors[primary]}`}>
                <CategoryIcon substance={substance} className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="card-title text-lg group-hover:text-primary transition-colors">
                {substance.name}
              </h3>
              <p className="text-xs text-neutral-content">{substance.class}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-neutral-content group-hover:text-primary transition-colors shrink-0" />
        </div>
        <p className="text-sm text-neutral-content line-clamp-3">{substance.description}</p>
        <div className="flex flex-wrap gap-1">
          {substance.commonNames.slice(0, 2).map((name, i) => (
            <span key={i} className="badge badge-outline text-neutral-content/70 text-xs max-w-[140px] text-left block overflow-hidden text-ellipsis whitespace-nowrap" title={name}>{name}</span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-wrap gap-1">
            {cats.slice(0, 2).map((cat) => {
              const info = categories.find((c) => c.id === cat)
              return (
                <span key={cat} className={`badge badge-outline text-xs ${categoryColors[cat] ?? ''}`}>
                  {info?.name ?? cat}
                </span>
              )
            })}
            {cats.length > 2 && (
              <span className="badge badge-outline text-xs text-neutral-content">+{cats.length - 2}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {hasRouteData && (
              <span className="badge badge-outline text-xs border-primary/30 text-primary/70">
                {Object.keys(substance.routeData!).length} routes
              </span>
            )}
            <span className={`badge badge-outline ${riskLevelColors[substance.riskLevel]}`}>
              {substance.riskLevel.replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── MEMOIZED MOBILE SUBSTANCE ROW ───────────────────────────────────────────
interface MobileSubstanceRowProps {
  substance: Substance
  onSelect: (s: Substance) => void
}

const MobileSubstanceRow = memo(function MobileSubstanceRow({ substance, onSelect }: MobileSubstanceRowProps) {
  const primary = getPrimaryCategory(substance)
  const cats = getSubstanceCategories(substance)

  return (
    <button
      onClick={() => onSelect(substance)}
      className="w-full text-left flex items-start gap-3 p-4 rounded-2xl border border-white/10 card-transparent hover:border-primary/40 active:scale-[0.99] transition-all card-lift"
    >
      {primary && (
        <div className={`p-2.5 rounded-xl shrink-0 ${categoryColors[primary]}`}>
          <CategoryIcon substance={substance} className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-semibold text-base leading-tight">{substance.name}</span>
          <ChevronRight className="h-4 w-4 text-neutral-content shrink-0 mt-0.5" />
        </div>
        <p className="text-xs text-neutral-content mb-2">{substance.class}</p>
        <p className="text-sm text-neutral-content line-clamp-3 mb-2 leading-relaxed">
          {substance.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {cats.slice(0, 2).map((cat) => {
            const info = categories.find((c) => c.id === cat)
            return (
              <span key={cat} className={`badge badge-outline text-xs ${categoryColors[cat]}`}>
                {info?.name ?? cat}
              </span>
            )
          })}
          {cats.length > 2 && (
            <span className="badge badge-outline text-xs">+{cats.length - 2}</span>
          )}
          <span className={`badge badge-outline text-xs ${riskLevelColors[substance.riskLevel]}`}>
            {substance.riskLevel.replace('-', ' ')}
          </span>
        </div>
      </div>
    </button>
  )
})

// ─── DOSAGE + DURATION PANEL ─────────────────────────────────────────────────
function DosageDurationPanel({
  substance,
  onRouteChange,
}: {
  substance: Substance
  onRouteChange?: (route: string | null) => void
}) {
  const hasRouteData = substance.routeData && Object.keys(substance.routeData).length > 0
  const initialRoute = hasRouteData ? Object.keys(substance.routeData!)[0] : null
  const [selectedRoute, setSelectedRoute] = useState<string | null>(initialRoute)
  const prevIdRef = useRef(substance.id)

  useEffect(() => {
    onRouteChange?.(selectedRoute)
  }, [selectedRoute])

  useEffect(() => {
    if (prevIdRef.current !== substance.id) {
      prevIdRef.current = substance.id
      setSelectedRoute(hasRouteData ? Object.keys(substance.routeData!)[0] : null)
    }
  }, [substance.id, hasRouteData, substance.routeData])

  const currentDosage = useMemo(() => {
    if (selectedRoute && substance.routeData?.[selectedRoute]) {
      return substance.routeData[selectedRoute].dosage ?? {}
    }
    return {}
  }, [selectedRoute, substance])

  const currentDuration = useMemo(() => {
    if (selectedRoute && substance.routeData?.[selectedRoute]) {
      return substance.routeData[selectedRoute].duration ?? {}
    }
    return {}
  }, [selectedRoute, substance])

  const currentNotes = useMemo(() => {
    if (selectedRoute && substance.routeData?.[selectedRoute]) {
      return substance.routeData[selectedRoute].notes
    }
    return null
  }, [selectedRoute, substance])

  return (
    <div className="space-y-4">
      {hasRouteData && (
        <div className="card border-primary/20 bg-primary/5 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-base flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              Route of Administration
            </h3>
            <p className="text-xs text-neutral-content">Dosage and duration vary significantly by route.</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 mt-2">
              {Object.keys(substance.routeData!).map((route) => {
                const isSelected = selectedRoute === route
                const dangerClass = routeDangerColors[route] || ''
                return (
                  <button
                    key={route}
                    onClick={() => setSelectedRoute(route)}
                    className={`
                      btn btn-sm ${isSelected ? 'btn-primary' : `btn-ghost border border-base-300 hover:bg-base-200 ${dangerClass}`}
                    `}
                  >
                    <span>{getRouteIcon(route)}</span>
                    {route}
                    {(route === 'Intravenous' || route === 'Smoking') && !isSelected && (
                      <span className="text-orange-400 text-xs">⚠</span>
                    )}
                  </button>
                )
              })}
            </div>
            {currentNotes && (
              <div className="alert mt-3">
                <Info className="h-4 w-4 shrink-0" />
                <span className="text-xs leading-relaxed">{currentNotes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card card-transparent">
          <div className="card-body">
            <h3 className="card-title text-base flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Dosage
              {selectedRoute && hasRouteData && (
                <span className="badge badge-outline ml-auto text-xs font-normal">
                  {getRouteIcon(selectedRoute)} {selectedRoute}
                </span>
              )}
            </h3>
            <div className="space-y-1">
              {Object.entries(currentDosage).map(([level, amount]) => {
                const levelColors: Record<string, string> = {
                  threshold: 'text-blue-400 bg-blue-500/10',
                  light: 'text-green-400 bg-green-500/10',
                  common: 'text-yellow-400 bg-yellow-500/10',
                  strong: 'text-orange-400 bg-orange-500/10',
                  heavy: 'text-red-400 bg-red-500/10',
                }
                return (
                  <div key={level} className="flex justify-between items-center py-2 border-b border-base-300 last:border-0">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${levelColors[level] || ''}`}>
                      {level}
                    </span>
                    <span className="badge badge-secondary font-mono text-xs">{amount as string}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card card-transparent">
          <div className="card-body">
            <h3 className="card-title text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration
              {selectedRoute && hasRouteData && (
                <span className="badge badge-outline ml-auto text-xs font-normal">
                  {getRouteIcon(selectedRoute)} {selectedRoute}
                </span>
              )}
            </h3>
            <div className="space-y-1">
              {Object.entries(currentDuration).map(([phase, time]) => {
                const phaseColors: Record<string, string> = {
                  onset: 'text-blue-400 bg-blue-500/10',
                  comeup: 'text-amber-400 bg-amber-500/10',
                  peak: 'text-purple-400 bg-purple-500/10',
                  offset: 'text-cyan-400 bg-cyan-500/10',
                  total: 'text-green-400 bg-green-500/10',
                }
                return (
                  <div key={phase} className="flex justify-between items-center py-2 border-b border-base-300 last:border-0">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${phaseColors[phase] || ''}`}>
                      {phase}
                    </span>
                    <span className="badge badge-secondary font-mono text-xs text-right max-w-[160px] whitespace-normal">
                      {time as string}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {!hasRouteData && (
        <p className="text-xs text-neutral-content text-center py-2 opacity-70">
          Route-specific data not available for this substance
        </p>
      )}

      {hasRouteData && Object.keys(substance.routeData!).length > 1 && (
        <div className="card card-transparent hidden sm:block">
          <div className="card-body">
            <h3 className="card-title text-base flex items-center gap-2">
              <Route className="h-4 w-4" />
              Routes comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Common dose</th>
                    <th>Onset</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(substance.routeData!) as [string, RouteDosageDuration][]).map(([route, data]) => (
                    <tr
                      key={route}
                      className={`cursor-pointer hover ${selectedRoute === route ? 'active' : ''}`}
                      onClick={() => setSelectedRoute(route)}
                    >
                      <td className="font-medium">
                        <span className="flex items-center gap-1">
                          <span>{getRouteIcon(route)}</span>
                          <span>{route}</span>
                          {selectedRoute === route && <span className="text-primary text-xs">●</span>}
                        </span>
                      </td>
                      <td className="font-mono text-neutral-content">{data.dosage.common}</td>
                      <td className="font-mono text-neutral-content">{data.duration.onset}</td>
                      <td className="font-mono text-neutral-content">{data.duration.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SUBSTANCE DETAIL VIEW ───────────────────────────────────────────────────
function SubstanceDetail({
  substance,
  onBack,
  onDoseLogged,
  onCategoryClick,
  router,
}: {
  substance: Substance
  onBack: () => void
  onDoseLogged: () => void
  onCategoryClick?: (category: SubstanceCategory) => void
  router: ReturnType<typeof useRouter>
}) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const primary = getPrimaryCategory(substance)
  const cats = getSubstanceCategories(substance)

  const handleRouteChange = useCallback((r: string | null) => setSelectedRoute(r), [])

  const firstRoute = substance.routeData ? Object.keys(substance.routeData)[0] : null
  const quickDuration = firstRoute ? substance.routeData![firstRoute]?.duration : null
  const quickDosage = firstRoute ? substance.routeData![firstRoute]?.dosage : null

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop header */}
      <header className="hidden md:flex sticky top-16 z-20 border-b border-white/8 bg-base-100/80 backdrop-blur-xl h-14 items-center gap-4 px-4 lg:px-6">
        <button className="btn btn-ghost btn-sm gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="divider divider-horizontal mx-1 h-6" />
        <h1 className="text-lg font-semibold">{substance.name}</h1>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <DoseLoggerModal
            preselectedSubstanceId={substance.id}
            preselectedSubstanceName={substance.name}
            preselectedCategory={getSubstanceCategories(substance)}
            preselectedRoute={selectedRoute || undefined}
            onLogCreated={onDoseLogged}
            trigger={
              <button className="btn btn-primary btn-sm gap-2">
                <Plus className="h-4 w-4" />
                Log Dose
              </button>
            }
          />
          <CategoryBadges substance={substance} />
          <span className={`badge badge-outline ${riskLevelColors[substance.riskLevel]}`}>
            {substance.riskLevel.replace('-', ' ')} risk
          </span>
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden sticky top-28 z-20 bg-base-100/80 backdrop-blur-xl border-b border-white/8">
        <div className="flex items-center gap-3 h-13 px-4">
          <button onClick={onBack} className="btn btn-ghost btn-sm btn-square">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold flex-1 truncate">{substance.name}</h1>
          <DoseLoggerModal
            preselectedSubstanceId={substance.id}
            preselectedSubstanceName={substance.name}
            preselectedCategory={getSubstanceCategories(substance)}
            preselectedRoute={selectedRoute || undefined}
            onLogCreated={onDoseLogged}
            trigger={
              <button className="btn btn-primary btn-sm gap-1.5">
                <Plus className="h-4 w-4" />
                Log
              </button>
            }
          />
        </div>
      </header>

      {/* Mobile content */}
      <div className="md:hidden flex-1 overflow-y-auto pb-8 px-4 pt-4">
        <div className="flex items-start gap-3 mb-4">
          {primary && (
            <div className={`p-3 rounded-xl shrink-0 ${categoryColors[primary]}`}>
              <CategoryIcon substance={substance} className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">{substance.name}</h2>
            <p className="text-xs text-neutral-content mt-0.5">{substance.class}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {cats.map((cat) => {
                const info = categories.find((c) => c.id === cat)
                return onCategoryClick ? (
                  <button
                    key={cat}
                    onClick={() => onCategoryClick(cat)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors hover:brightness-125 cursor-pointer ${categoryColors[cat]}`}
                  >
                    {info?.name ?? cat}
                    <ChevronRight className="h-2.5 w-2.5 opacity-50" />
                  </button>
                ) : (
                  <span key={cat} className={`badge badge-outline text-xs ${categoryColors[cat]}`}>
                    {info?.name ?? cat}
                  </span>
                )
              })}
              <span className={`badge badge-outline text-xs ${riskLevelColors[substance.riskLevel]}`}>
                {substance.riskLevel.replace('-', ' ')} risk
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-neutral-content leading-relaxed mb-4">{substance.description}</p>

        {quickDuration && (
          <div className="flex gap-2 px-2 py-3 overflow-x-auto scrollbar-none mb-4">
            {quickDuration.onset && (
              <div className="flex-shrink-0 flex flex-col items-center bg-base-200 rounded-xl px-4 py-2 min-w-[72px]">
                <span className="text-[10px] text-neutral-content uppercase tracking-wide">Onset</span>
                <span className="text-sm font-medium mt-0.5">{quickDuration.onset}</span>
              </div>
            )}
            {quickDuration.peak && (
              <div className="flex-shrink-0 flex flex-col items-center bg-base-200 rounded-xl px-4 py-2 min-w-[72px]">
                <span className="text-[10px] text-neutral-content uppercase tracking-wide">Peak</span>
                <span className="text-sm font-medium mt-0.5">{quickDuration.peak}</span>
              </div>
            )}
            {quickDuration.total && (
              <div className="flex-shrink-0 flex flex-col items-center bg-base-200 rounded-xl px-4 py-2 min-w-[72px]">
                <span className="text-[10px] text-neutral-content uppercase tracking-wide">Total</span>
                <span className="text-sm font-medium mt-0.5">{quickDuration.total}</span>
              </div>
            )}
            {quickDosage?.common && (
              <div className="flex-shrink-0 flex flex-col items-center bg-base-200 rounded-xl px-4 py-2 min-w-[72px]">
                <span className="text-[10px] text-neutral-content uppercase tracking-wide">Common</span>
                <span className="text-sm font-medium mt-0.5 font-mono">{quickDosage.common}</span>
              </div>
            )}
            <div className="flex-shrink-0 flex flex-col items-center bg-base-200 rounded-xl px-4 py-2 min-w-[72px]">
              <span className="text-[10px] text-neutral-content uppercase tracking-wide">Routes</span>
              <span className="text-sm font-medium mt-0.5">
                {substance.routeData ? Object.keys(substance.routeData).length : '—'}
              </span>
            </div>
          </div>
        )}

        <Tabs defaultValue="effects" className="w-full">
          <div className="sticky top-0 z-20 bg-base-100/80 backdrop-blur-sm border-b border-white/8 -mx-4 px-4">
            <TabsList className="w-full h-auto p-0 bg-transparent rounded-none flex overflow-x-auto scrollbar-none justify-start gap-0">
              {['effects', 'dosage', 'harm', 'info', 'interactions'].map((tab) => {
                const labels: Record<string, string> = {
                  effects: 'Effects',
                  dosage: 'Dosage',
                  harm: 'Harm reduction',
                  info: 'Info',
                  interactions: 'Interactions',
                }
                return (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="flex-shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-base-content data-[state=active]:bg-transparent px-4 h-11 text-sm font-medium text-neutral-content data-[state=active]:text-base-content"
                  >
                    {labels[tab]}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <TabsContent value="effects" className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-green-500 uppercase tracking-wide mb-2">Positive</p>
              <ul className="space-y-2">
                {substance.effects.positive.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="divider my-2" />
            <div>
              <p className="text-xs font-medium text-yellow-500 uppercase tracking-wide mb-2">Neutral</p>
              <ul className="space-y-2">
                {substance.effects.neutral.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <MinusCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="divider my-2" />
            <div>
              <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-2">Negative</p>
              <ul className="space-y-2">
                {substance.effects.negative.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="dosage" className="mt-4">
            <DosageDurationPanel substance={substance} onRouteChange={handleRouteChange} />
          </TabsContent>

          <TabsContent value="harm" className="mt-4">
            <ul className="space-y-3">
              {substance.harmReduction.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-sm leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="info" className="mt-4 space-y-4">
            {substance.history && (
              <div className="card card-transparent">
                <div className="card-body">
                  <h3 className="card-title text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    History
                  </h3>
                  <p className="text-sm text-neutral-content leading-relaxed">{substance.history}</p>
                </div>
              </div>
            )}
            <div className="card card-transparent">
              <div className="card-body space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Scale className="h-4 w-4 text-neutral-content shrink-0" />
                  <div>
                    <span className="text-neutral-content">Legality: </span>
                    <span>{substance.legality}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FlaskConical className="h-4 w-4 text-neutral-content shrink-0" />
                  <div>
                    <span className="text-neutral-content">Formula: </span>
                    <span className="font-mono">{substance.chemistry.formula}</span>
                  </div>
                </div>
              </div>
            </div>
            {substance.psychonautWikiUrl && (
              <a
                href={substance.psychonautWikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm w-full gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Detailed Info on PsychonautWiki
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="btn btn-outline btn-primary btn-sm w-full gap-2">
                  <Github className="h-4 w-4" />
                  Contribute on GitHub
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => window.open(GITHUB_INFO_CHANGE_URL, '_blank')}>
                  <PenLine className="mr-2 h-4 w-4" />Submit info change
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(GITHUB_NEW_SUBSTANCE_URL, '_blank')}>
                  <Send className="mr-2 h-4 w-4" />Submit new substance
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.open(GITHUB_FEEDBACK_URL, '_blank')}>
                  <AlertTriangle className="mr-2 h-4 w-4" />Report issue
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.open(GITHUB_MAIN_URL, '_blank')}>
                  <Github className="mr-2 h-4 w-4" />Repo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsContent>

          <TabsContent value="interactions" className="mt-4 space-y-4">
            {(substance.interactions.dangerous || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Dangerous
                </p>
                <div className="flex flex-wrap gap-2">
                  {(substance.interactions.dangerous || []).map((interaction, i) => (
                    <span key={i} className="badge badge-outline border-red-500/30 text-red-400">
                      {interaction}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(substance.interactions.unsafe || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-orange-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Unsafe
                </p>
                <div className="flex flex-wrap gap-2">
                  {(substance.interactions.unsafe || []).map((interaction, i) => (
                    <span key={i} className="badge badge-outline border-orange-500/30 text-orange-400">
                      {interaction}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(substance.interactions.uncertain || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-yellow-400 mb-2 flex items-center gap-1">
                  <Info className="h-3 w-3" />Uncertain
                </p>
                <div className="flex flex-wrap gap-2">
                  {(substance.interactions.uncertain || []).map((interaction, i) => (
                    <span key={i} className="badge badge-outline border-yellow-500/30 text-yellow-400">
                      {interaction}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(substance.interactions.crossTolerances || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1">
                  <Activity className="h-3 w-3" />Cross-tolerances
                </p>
                <div className="flex flex-wrap gap-2">
                  {(substance.interactions.crossTolerances || []).map((interaction, i) => (
                    <span key={i} className="badge badge-outline border-blue-500/30 text-blue-400">
                      {interaction}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop layout */}
      <main className="hidden md:block container mx-auto py-6 lg:py-10 scroll-mt-28">
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card card-transparent">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  {primary && (
                    <div className={`p-2 rounded-lg ${categoryColors[primary]}`}>
                      <CategoryIcon substance={substance} className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h2 className="card-title text-2xl">{substance.name}</h2>
                    <p className="text-xs text-neutral-content line-clamp-2">{substance.commonNames.join(' • ')}</p>
                  </div>
                </div>
                <p className="text-neutral-content leading-relaxed">{substance.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="btn btn-secondary btn-sm w-full sm:w-auto">
                        <Github className="h-4 w-4" />Contribute on GitHub
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => window.open(GITHUB_INFO_CHANGE_URL, '_blank')}>
                        <PenLine className="mr-2 h-4 w-4" />Submit info change
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(GITHUB_NEW_SUBSTANCE_URL, '_blank')}>
                        <Send className="mr-2 h-4 w-4" />Submit new substance
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.open(GITHUB_FEEDBACK_URL, '_blank')}>
                        <AlertTriangle className="mr-2 h-4 w-4" />Report issue
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.open(GITHUB_MAIN_URL, '_blank')}>
                        <Github className="mr-2 h-4 w-4" />Repo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div className="card card-transparent">
              <Tabs defaultValue="dosage">
                <div className="card-body p-4 pb-0">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dosage" className="gap-1.5">
                      <Droplets className="h-4 w-4" />Dosage & Routes
                    </TabsTrigger>
                    <TabsTrigger value="effects" className="gap-1.5">
                      <Sparkles className="h-4 w-4" />Effects
                    </TabsTrigger>
                    <TabsTrigger value="harm" className="gap-1.5">
                      <Shield className="h-4 w-4" />Harm Reduction
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="card-body pt-4">
                  <TabsContent value="dosage" className="mt-0">
                    <DosageDurationPanel substance={substance} onRouteChange={handleRouteChange} />
                  </TabsContent>
                  <TabsContent value="effects" className="mt-0">
                    <Tabs defaultValue="positive" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="positive" className="text-green-500 data-[state=active]:bg-green-500/20">Positive</TabsTrigger>
                        <TabsTrigger value="neutral" className="text-yellow-500 data-[state=active]:bg-yellow-500/20">Neutral</TabsTrigger>
                        <TabsTrigger value="negative" className="text-red-500 data-[state=active]:bg-red-500/20">Negative</TabsTrigger>
                      </TabsList>
                      <TabsContent value="positive" className="mt-4">
                        <ul className="space-y-2">
                          {substance.effects.positive.map((e, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      </TabsContent>
                      <TabsContent value="neutral" className="mt-4">
                        <ul className="space-y-2">
                          {substance.effects.neutral.map((e, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <MinusCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" /><span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      </TabsContent>
                      <TabsContent value="negative" className="mt-4">
                        <ul className="space-y-2">
                          {substance.effects.negative.map((e, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /><span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                  <TabsContent value="harm" className="mt-0">
                    <ul className="space-y-3">
                      {substance.harmReduction.map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                          <span className="text-sm leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card card-transparent">
              <div className="card-body">
                <h3 className="card-title text-lg">Quick Info</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {primary && <CategoryIcon substance={substance} className="h-4 w-4 text-neutral-content mt-0.5" />}
                    <div>
                      <p className="text-sm text-neutral-content">{cats.length > 1 ? 'Categories' : 'Category'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cats.map((cat) => {
                          const info = categories.find((c) => c.id === cat)
                          return onCategoryClick ? (
                            <button
                              key={cat}
                              onClick={() => onCategoryClick(cat)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors hover:brightness-125 cursor-pointer ${categoryColors[cat] ?? ''}`}
                            >
                              {info?.name ?? cat}
                              <ChevronRight className="h-2.5 w-2.5 opacity-50" />
                            </button>
                          ) : (
                            <span key={cat} className={`badge badge-outline text-xs ${categoryColors[cat] ?? ''}`}>
                              {info?.name ?? cat}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-4 w-4 text-neutral-content" />
                    <div>
                      <p className="text-sm text-neutral-content">Class</p>
                      <p className="font-medium">{substance.class}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Route className="h-4 w-4 text-neutral-content mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-content">Routes</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {substance.routeData && Object.keys(substance.routeData).map((route) => (
                          <span key={route} className="text-xs bg-base-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <span>{getRouteIcon(route)}</span><span>{route}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Scale className="h-4 w-4 text-neutral-content" />
                    <div>
                      <p className="text-sm text-neutral-content">Legality</p>
                      <p className="font-medium text-sm">{substance.legality}</p>
                    </div>
                  </div>
                  {substance.psychonautWikiUrl && (
                    <a
                      href={substance.psychonautWikiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm gap-2 w-full"
                    >
                      <BookOpen className="h-4 w-4" />
                      Detailed Info on PsychonautWiki
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="card card-transparent">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h3 className="card-title text-lg">Interactions</h3>
                  <button
                    className="btn btn-outline btn-primary btn-sm gap-1.5 text-xs"
                    onClick={() => router.push(`/interactions?substances=${substance.id}`)}
                  >
                    <Shuffle className="h-3 w-3" />Full Checker
                  </button>
                </div>
                <div className="space-y-3">
                  {substance.interactions.dangerous.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />Dangerous
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {substance.interactions.dangerous.map((interaction, i) => (
                          <span key={i} className="badge badge-outline border-red-500/30 text-red-400">
                            {interaction}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {substance.interactions.unsafe.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-orange-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />Unsafe
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {substance.interactions.unsafe.map((interaction, i) => (
                          <span key={i} className="badge badge-outline border-orange-500/30 text-orange-400">
                            {interaction}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {substance.interactions.uncertain.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-yellow-400 mb-2 flex items-center gap-1">
                        <Info className="h-3 w-3" />Uncertain
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {substance.interactions.uncertain.map((interaction, i) => (
                          <span key={i} className="badge badge-outline border-yellow-500/30 text-yellow-400">
                            {interaction}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {substance.interactions.crossTolerances.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1">
                        <Activity className="h-3 w-3" />Cross-tolerances
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {substance.interactions.crossTolerances.map((interaction, i) => (
                          <span key={i} className="badge badge-outline border-blue-500/30 text-blue-400">
                            {interaction}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {substance.history && (
              <div className="card card-transparent">
                <div className="card-body">
                  <h3 className="card-title flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" />History
                  </h3>
                  <p className="text-sm text-neutral-content leading-relaxed">{substance.history}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [selectedCategory, setSelectedCategory] = useState<SubstanceCategory | 'all'>('all')
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const lastProcessedSubstanceRef = useRef<string | null>(null)
  const deferredQuery = useDeferredValue(searchQuery)

  // UI store for modal control
  const { doseLoggerOpen, doseLoggerPreselect, closeDoseLogger } = useUIStore()

  // Listen for search events from Header
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent).detail
      setSearchQuery(query)
    }
    window.addEventListener('drugucopia:search', handler)
    return () => window.removeEventListener('drugucopia:search', handler)
  }, [])

  // Listen for dose-log events from Header
  useEffect(() => {
    const handler = () => {
      router.push(`${pathname}?view=dose-log`)
    }
    window.addEventListener('drugucopia:dose-log', handler)
    return () => window.removeEventListener('drugucopia:dose-log', handler)
  }, [pathname, router])

  // Handle URL query parameters
  useEffect(() => {
    const substanceId = searchParams.get('substance')
    if (substanceId) {
      if (substanceId !== lastProcessedSubstanceRef.current) {
        const found = substances.find((s) => s.id === substanceId)
        if (found) {
          setSelectedSubstance(found)
          lastProcessedSubstanceRef.current = substanceId
        }
      }
    } else {
      if (selectedSubstance) setSelectedSubstance(null)
      lastProcessedSubstanceRef.current = null
    }
  }, [searchParams, selectedSubstance])

  const handleBackFromDetail = useCallback(() => {
    const viewParam = searchParams.get('view')
    if (viewParam) {
      router.push(`${pathname}?view=${viewParam}`)
    } else {
      router.push(pathname)
    }
  }, [searchParams, router, pathname])

  const handleCategoryClickFromDetail = useCallback((category: SubstanceCategory) => {
    setSelectedSubstance(null)
    lastProcessedSubstanceRef.current = null
    setSelectedCategory(category)
    router.push(pathname)
  }, [router, pathname])

  const [visibleCount, setVisibleCount] = useState(() => {
    // Start with fewer cards on mobile — fewer DOM nodes + fewer card backgrounds
    // to paint on first scroll. "Show More" still loads the rest on demand.
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 12
    return 24
  })

  useEffect(() => {
    setVisibleCount(typeof window !== 'undefined' && window.innerWidth < 768 ? 12 : 24)
  }, [selectedCategory, deferredQuery])

  const filteredSubstances = useMemo(() => {
    let result = substances
    if (selectedCategory !== 'all') {
      result = result.filter((s) => substanceBelongsToCategory(s, selectedCategory))
    }
    if (deferredQuery) {
      const q = deferredQuery.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.commonNames.some((n) => n.toLowerCase().includes(q))
      )
    }
    return result
  }, [selectedCategory, deferredQuery])

  const visibleSubstances = useMemo(() => {
    return filteredSubstances.slice(0, visibleCount)
  }, [filteredSubstances, visibleCount])

  const handleDoseLogged = useCallback(() => { }, [])

  const handleSelectSubstance = useCallback((substance: Substance) => {
    setSelectedSubstance(substance)
    lastProcessedSubstanceRef.current = substance.id
    const viewParam = searchParams.get('view')
    router.push(
      viewParam
        ? `${pathname}?substance=${substance.id}&view=${viewParam}`
        : `${pathname}?substance=${substance.id}`
    )
  }, [searchParams, router, pathname])

  const handleCategoryChange = useCallback((cat: SubstanceCategory | 'all') => {
    setSelectedCategory(cat)
    if (searchParams.toString()) router.push(pathname)
  }, [searchParams, router, pathname])

  useEffect(() => {
    if (selectedSubstance) window.scrollTo(0, 0)
  }, [selectedSubstance])

  // ── Substance detail ──
  if (selectedSubstance) {
    return (
      <SubstanceDetail
        substance={selectedSubstance}
        onBack={handleBackFromDetail}
        onDoseLogged={handleDoseLogged}
        onCategoryClick={handleCategoryClickFromDetail}
        router={router}
      />
    )
  }

  const viewParam = searchParams.get('view')
  const showDoseLog = viewParam === 'dose-log' || viewParam === 'timeline' || viewParam === 'history'

  // ── List view ──
  return (
    <div className="container mx-auto py-6 lg:py-10 px-4 lg:px-6">
      {/* DoseLoggerModal rendered at root level */}
      <DoseLoggerModal
        open={doseLoggerOpen}
        onOpenChange={(open) => !open && closeDoseLogger()}
        preselectedSubstanceId={doseLoggerPreselect?.substanceId}
        preselectedSubstanceName={doseLoggerPreselect?.substanceName}
        preselectedCategory={doseLoggerPreselect?.category}
        preselectedRoute={doseLoggerPreselect?.route}
        onLogCreated={handleDoseLogged}
      />

      {showDoseLog ? (
        <div className="space-y-6 max-w-5xl mx-auto">
          <ActiveReminders />
          <IntensityTimelineChart />
          <ReminderSettings />
          <DoseStats />
          <DoseHistory />
        </div>
      ) : (
        <>
          {selectedCategory !== 'all' && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${categoryColors[selectedCategory]}`}>
                  {(() => {
                    const Icon = categoryIcons[selectedCategory]
                    return <Icon className="h-5 w-5" />
                  })()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {categories.find((c) => c.id === selectedCategory)?.name}
                  </h2>
                  <p className="text-neutral-content text-sm">
                    {categories.find((c) => c.id === selectedCategory)?.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedCategory === 'all' && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">All Substances</h2>
              <p className="text-neutral-content">Browse the complete documentation of psychoactive substances</p>
            </div>
          )}

          {/* Category chips (mobile) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none md:hidden -mx-4 px-4 mb-4">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${selectedCategory === 'all'
                ? 'bg-base-content text-base-100 border-base-content'
                : 'bg-base-200 text-neutral-content border-base-300'
                }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id
              const dotColor = categoryDotColors[cat.id]
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${isActive
                    ? 'bg-base-content text-base-100 border-base-content'
                    : 'bg-base-200 text-neutral-content border-base-300'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  {cat.name}
                </button>
              )
            })}
          </div>

          {/* Category chips (desktop) */}
          <div className="hidden md:flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`btn btn-sm ${selectedCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`}
              >
                <span className={`w-2 h-2 rounded-full mr-1 ${categoryDotColors[cat.id]}`} />
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSubstances.map((substance) => (
              <SubstanceCard
                key={substance.id}
                substance={substance}
                onSelect={handleSelectSubstance}
              />
            ))}
          </div>

          {filteredSubstances.length > visibleCount && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setVisibleCount((prev) => prev + (typeof window !== 'undefined' && window.innerWidth < 768 ? 12 : 24))}
                className="btn btn-outline gap-2"
              >
                Show More Substances ({filteredSubstances.length - visibleCount} remaining)
              </button>
            </div>
          )}

          {filteredSubstances.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-neutral-content mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No substances found</h3>
              <p className="text-neutral-content">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
