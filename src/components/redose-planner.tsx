'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDoseStore } from '@/store/dose-store'
import { useReminderStore } from '@/store/reminder-store'
import { toast } from '@/hooks/use-toast'
import { formatIntervalMinutes } from '@/lib/notification-utils'
import { format } from 'date-fns'
import type { DoseLog, Duration, ReminderSchedule } from '@/types'

interface RedosePlannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  substance: {
    id: string
    name: string
    categories: string[]
  }
  baseAmount: number
  baseUnit: string
  route: string
  duration?: Duration | null
  notes?: string | null
  mood?: string | null
  setting?: string | null
  intensity?: number | null
  timestamp?: string
  logInitialDose?: boolean
  onPlanCreated?: () => void
}

export function RedosePlanner({
  open,
  onOpenChange,
  substance,
  baseAmount,
  baseUnit,
  route,
  duration,
  notes,
  mood,
  setting,
  intensity,
  timestamp,
  logInitialDose = true,
  onPlanCreated,
}: RedosePlannerProps) {
  const [intervalHours, setIntervalHours] = useState(4)
  const [intervalMinutes, setIntervalMinutes] = useState(0)
  const [totalDoses, setTotalDoses] = useState(3)
  const [shouldLogInitialDose, setShouldLogInitialDose] = useState(logInitialDose)

  const intervalMinutesTotal = intervalHours * 60 + intervalMinutes

  const plannedTimes = useMemo(() => {
    if (intervalMinutesTotal <= 0 || totalDoses <= 0) return []
    const times: string[] = []
    for (let i = 1; i < totalDoses; i++) {
      times.push(format(new Date(Date.now() + i * intervalMinutesTotal * 60_000), 'h:mm a'))
    }
    return times
  }, [intervalMinutesTotal, totalDoses])

  const handleCreatePlan = useCallback(() => {
    if (intervalMinutesTotal <= 0 || totalDoses <= 0) {
      toast({
        title: 'Invalid plan',
        description: 'Interval must be greater than 0 and total doses must be at least 1.',
        variant: 'destructive',
      })
      return
    }

    if (baseAmount <= 0) {
      toast({
        title: 'Invalid dose',
        description: 'Base amount must be greater than 0.',
        variant: 'destructive',
      })
      return
    }

    // Ensure both stores are loaded before mutating
    useDoseStore.getState().initialize()
    useReminderStore.getState().initialize()

    let initialDose: DoseLog | null = null

    if (shouldLogInitialDose) {
      const now = timestamp ?? new Date().toISOString()
      initialDose = {
        id: `dose_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        substanceId: substance.id,
        substanceName: substance.name,
        categories: substance.categories,
        amount: baseAmount,
        unit: baseUnit,
        route,
        timestamp: now,
        duration: duration ?? null,
        notes: notes || null,
        mood: mood ?? null,
        setting: setting ?? null,
        intensity: intensity ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      useDoseStore.getState().addDose(initialDose)
    }

    const reminderStore = useReminderStore.getState()
    const existingSchedule = reminderStore.schedules.find(
      (s) => s.substanceName.toLowerCase() === substance.name.toLowerCase(),
    )
    const scheduleData: Omit<ReminderSchedule, 'id' | 'createdAt' | 'updatedAt'> = {
      substanceName: substance.name,
      substanceId: substance.id,
      intervalMinutes: intervalMinutesTotal,
      maxDosesPerDay: totalDoses,
      enabled: true,
      customMessage: `Time for your next dose of ${substance.name} (${baseAmount} ${baseUnit})`,
    }

    if (existingSchedule) {
      reminderStore.updateSchedule(existingSchedule.id, {
        ...scheduleData,
        updatedAt: new Date().toISOString(),
      })
    } else {
      reminderStore.addSchedule({
        id: crypto.randomUUID(),
        ...scheduleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // Explicitly start the first timer so the plan begins regardless of the global autoStart setting.
    if (initialDose) {
      reminderStore.startTimer(initialDose)
    }

    toast({
      title: 'Redose plan created',
      description: `${totalDoses} doses of ${baseAmount} ${baseUnit} ${substance.name} planned, every ${formatIntervalMinutes(intervalMinutesTotal)}. Next redose${plannedTimes.length > 1 ? 's' : ''}: ${plannedTimes.slice(0, 3).join(', ')}${plannedTimes.length > 3 ? '...' : ''}.`,
    })

    onPlanCreated?.()
    onOpenChange(false)
  }, [
    baseAmount,
    baseUnit,
    duration,
    intensity,
    intervalMinutesTotal,
    mood,
    notes,
    onOpenChange,
    onPlanCreated,
    plannedTimes,
    route,
    setting,
    shouldLogInitialDose,
    substance,
    timestamp,
    totalDoses,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-400" />
            Plan redoses for today
          </DialogTitle>
          <DialogDescription>
            Set up a reminder schedule for {substance.name} redoses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs text-neutral-content mb-1">Base dose</p>
            <p className="text-lg font-bold font-mono text-emerald-400">
              {baseAmount} {baseUnit}
            </p>
            <p className="text-xs text-neutral-content">
              {substance.name} · {route}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-content">Interval between doses</Label>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={1}
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(Math.min(24, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-neutral-content">hr</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={1}
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-neutral-content">min</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-content">Total doses today</Label>
            <div className="flex items-center justify-center gap-2">
              <Input
                type="number"
                min={1}
                max={24}
                step={1}
                value={totalDoses}
                onChange={(e) => setTotalDoses(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-neutral-content">
                {totalDoses === 1 ? 'dose' : 'doses'}
              </span>
            </div>
          </div>

          {intervalMinutesTotal > 0 && totalDoses > 0 && (
            <div className="rounded-xl border border-base-300/50 bg-base-200/30 p-3">
              <p className="text-xs font-medium text-neutral-content mb-2 text-center">Planned times</p>
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: totalDoses }).map((_, i) => {
                  const time = new Date(Date.now() + i * intervalMinutesTotal * 60_000)
                  return (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        i === 0
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-base-300 bg-base-200 text-neutral-content'
                      }`}
                    >
                      {i === 0 ? 'Now' : `+${i}`} · {format(time, 'h:mm a')}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 rounded-xl bg-base-200/50 border border-base-300/50">
            <input
              id="log-initial-dose"
              type="checkbox"
              checked={shouldLogInitialDose}
              onChange={(e) => setShouldLogInitialDose(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-base-300 text-emerald-500 focus:ring-emerald-500/20"
            />
            <div>
              <label htmlFor="log-initial-dose" className="text-sm font-medium text-base-content cursor-pointer">
                Log initial dose now
              </label>
              <p className="text-xs text-neutral-content">
                Records the base dose in your dose history and starts the first reminder timer.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleCreatePlan} className="w-full sm:w-auto gap-2">
            <CalendarDays className="h-4 w-4" />
            Create plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

