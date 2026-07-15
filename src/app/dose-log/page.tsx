'use client'

import { Suspense, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Activity,
  BellRing,
  BarChart3,
  Clock,
  History,
} from 'lucide-react'
import { useDoseStore } from '@/store/dose-store'
import { useReminderStore } from '@/store/reminder-store'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// Lazy-load heavy client-only components so the page's initial bundle stays
// small. These all pull in zustand stores, the substances DB, and (for the
// chart) a chunk of SVG/d3-style code.
const DoseHistory = dynamic(
  () => import('@/components/dose-history').then((m) => m.DoseHistory),
  { ssr: false, loading: () => null },
)
const DoseStats = dynamic(
  () => import('@/components/dose-stats').then((m) => m.DoseStats),
  { ssr: false, loading: () => null },
)
const IntensityTimelineChart = dynamic(
  () => import('@/components/intensity-timeline-chart').then((m) => m.IntensityTimelineChart),
  { ssr: false, loading: () => null },
)
const ActiveReminders = dynamic(
  () => import('@/components/active-reminders').then((m) => m.ActiveReminders),
  { ssr: false, loading: () => null },
)
const ReminderSettings = dynamic(
  () => import('@/components/reminder-settings').then((m) => m.ReminderSettings),
  { ssr: false, loading: () => null },
)
const SyncConflicts = dynamic(
  () => import('@/components/sync-conflicts').then((m) => m.SyncConflicts),
  { ssr: false, loading: () => null },
)

// ─── Tab model ─────────────────────────────────────────────────────────────

type TrackTab = 'session' | 'history' | 'reminders' | 'insights'

interface TabDef {
  id: TrackTab
  label: string
  icon: typeof Activity
}

const TABS: TabDef[] = [
  { id: 'session', label: 'Active Session', icon: Activity },
  { id: 'history', label: 'History', icon: History },
  { id: 'reminders', label: 'Reminders', icon: BellRing },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
]

// ─── Hero ──────────────────────────────────────────────────────────────────

function TrackHero() {
  const doses = useDoseStore((state) => state.doses)
  const schedules = useReminderStore((state) => state.schedules)
  const activeReminders = useReminderStore((state) => state.activeReminders)

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayCount = useMemo(
    () => doses.filter((dose) => dose.timestamp.slice(0, 10) === todayKey).length,
    [doses, todayKey],
  )
  const activeCount = useMemo(
    () => activeReminders.filter((reminder) => reminder.status !== 'dismissed').length,
    [activeReminders],
  )

  return (
    <Card variant="elevated" className="p-4 md:p-6">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between w-full">
        <div className="max-w-2xl space-y-2">
          <Badge variant="outline" size="sm">
            Track workspace
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Dose log, reminders & session view
          </h1>
          <p className="text-sm text-neutral-content md:text-base">
            Review active reminders, follow your current session timeline, and keep your dose
            history organized in one place.
          </p>
        </div>

        {/* Glanceable stats — semantic daisyUI tokens, no hard-coded palette. */}
        <div className="stats stats-vertical w-full border border-base-300 bg-base-100 shadow-sm sm:stats-horizontal">
          <div className="stat">
            <div className="stat-title">Total logs</div>
            <div className="stat-value text-2xl">{doses.length}</div>
            <div className="stat-desc">All recorded doses</div>
          </div>
          <div className="stat">
            <div className="stat-title">Today</div>
            <div className="stat-value text-2xl">{todayCount}</div>
            <div className="stat-desc">Doses logged today</div>
          </div>
          <div className="stat">
            <div className="stat-title">Active reminders</div>
            <div className="stat-value text-2xl">{activeCount}</div>
            <div className="stat-desc">Running or fired timers</div>
          </div>
          <div className="stat">
            <div className="stat-title">Schedules</div>
            <div className="stat-value text-2xl">{schedules.length}</div>
            <div className="stat-desc">Saved reminder rules</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: TabDef
  active: boolean
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`tab tab-bordered gap-1.5 ${active ? 'tab-active' : ''}`}
    >
      <Icon className="h-4 w-4" />
      <span>{tab.label}</span>
    </button>
  )
}

// ─── Active Session tab ────────────────────────────────────────────────────

function ActiveSessionTab() {
  return (
    <div className="space-y-6">
      <ActiveReminders />

      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Intensity Timeline
          </CardTitle>
          <CardDescription>
            Live view of active doses and their estimated intensity over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IntensityTimelineChart />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Reminders tab ─────────────────────────────────────────────────────────

function RemindersTab() {
  return (
    <div className="space-y-6">
      <ActiveReminders />

      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Reminder Settings
          </CardTitle>
          <CardDescription>
            Adjust auto-start behavior, notification permissions, sounds, and recurring schedules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReminderSettings />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Insights tab ──────────────────────────────────────────────────────────

function InsightsTab() {
  return (
    <div className="space-y-6">
      <DoseStats />
      <SyncConflicts />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

function DoseLogPageContent() {
  const [tab, setTab] = useState<TrackTab>('session')

  return (
    <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <TrackHero />

        {/* Sync conflicts surface above the tabs so they can't be missed. */}
        <SyncConflicts />

        {/* Tab bar — single source of truth for navigation within Track. */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as TrackTab)} variant="box">
          <TabsList className="w-full justify-center overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                <t.icon className="h-4 w-4 mr-1.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="session">
            <ActiveSessionTab />
          </TabsContent>
          <TabsContent value="history">
            <DoseHistory />
          </TabsContent>
          <TabsContent value="reminders">
            <RemindersTab />
          </TabsContent>
          <TabsContent value="insights">
            <InsightsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function DoseLogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <DoseLogPageContent />
    </Suspense>
  )
}
