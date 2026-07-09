'use client'

import { Suspense } from 'react'
import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Clock, Activity, CalendarDays, History } from 'lucide-react'
import { useDoseStore } from '@/store/dose-store'
import { useReminderStore } from '@/store/reminder-store'

// Lazy-load the heavy client-only components so the page's initial
// bundle stays small. These all pull in zustand stores, the substances
// DB, and (for the chart) a chunk of SVG/d3-style code.
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

/**
 * TrackWorkspace — the header card for the /dose-log page.
 *
 * Shows summary stats (total logs, today's count, active reminders,
 * schedules) and section-jump buttons. Previously lived inline in
 * HomeContent; moved here when Track became its own page.
 */
function TrackWorkspace() {
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

  const trackSections = [
    { id: 'track-reminders', label: 'Reminders', icon: Clock },
    { id: 'track-timeline', label: 'Timeline', icon: Activity },
    { id: 'track-insights', label: 'Insights', icon: CalendarDays },
    { id: 'track-history', label: 'History', icon: History },
  ]

  const jumpToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section className="card border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm scroll-mt-28">
      <div className="card-body gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="badge badge-outline badge-sm">Track workspace</div>
            <h2 className="text-2xl font-semibold tracking-tight">Dose log, reminders, and session view</h2>
            <p className="max-w-2xl text-sm text-neutral-content">
              Review active reminders, follow your current session timeline, and keep your dose history organized in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {trackSections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jumpToSection(section.id)}
                  className="btn btn-sm btn-ghost gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="stats stats-vertical border border-base-300/70 bg-base-100/70 shadow-sm lg:stats-horizontal">
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
    </section>
  )
}

function DoseLogPageContent() {
  return (
    <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <TrackWorkspace />

        <section id="track-reminders" className="space-y-6 scroll-mt-28">
          <ActiveReminders />

          <details className="collapse collapse-arrow border border-base-300/70 bg-base-100/70 backdrop-blur-sm shadow-sm">
            <summary className="collapse-title text-base font-semibold">
              Reminder settings
            </summary>
            <div className="collapse-content pt-0">
              <p className="mb-3 text-sm text-neutral-content">
                Adjust auto-start behavior, notification permissions, sounds, and recurring schedules.
              </p>
              <ReminderSettings />
            </div>
          </details>
        </section>

        <section id="track-timeline" className="scroll-mt-28">
          <IntensityTimelineChart />
        </section>

        <section id="track-insights" className="space-y-6 scroll-mt-28">
          <DoseStats />
          <SyncConflicts />
        </section>

        <section id="track-history" className="scroll-mt-28">
          <DoseHistory />
        </section>
      </div>
    </div>
  )
}

export default function DoseLogPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <DoseLogPageContent />
    </Suspense>
  )
}
