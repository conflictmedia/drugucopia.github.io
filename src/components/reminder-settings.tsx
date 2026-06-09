'use client'

import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Bell, BellOff, Plus, Trash2, Pencil, Clock, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useReminderStore } from '@/store/reminder-store'
import { askNotificationPermission } from '@/lib/reminder-engine'
import { formatIntervalMinutes } from '@/lib/notification-utils'
import { substances } from '@/lib/substances/index'
import { ReminderSchedule } from '@/types'
import { toast } from '@/hooks/use-toast'

// Pre-built schedule suggestions for common multi-dose substances
const SUGGESTIONS: {
  name: string
  intervalMinutes: number
  maxDosesPerDay: number
}[] = [
  { name: 'N-Acetylcysteine', intervalMinutes: 240, maxDosesPerDay: 2 },
  { name: 'Vitamin C', intervalMinutes: 480, maxDosesPerDay: 2 },
  { name: 'L-Theanine', intervalMinutes: 360, maxDosesPerDay: 3 },
  { name: 'Ashwagandha', intervalMinutes: 720, maxDosesPerDay: 2 },
  { name: 'Omega-3', intervalMinutes: 720, maxDosesPerDay: 2 },
  { name: 'Magnesium', intervalMinutes: 480, maxDosesPerDay: 2 },
]

function ScheduleEditor({
  schedule,
  onSave,
  onCancel,
}: {
  schedule?: ReminderSchedule
  onSave: (data: {
    substanceName: string
    substanceId?: string
    intervalMinutes: number
    maxDosesPerDay: number
    customMessage?: string
    enabled: boolean
  }) => void
  onCancel: () => void
}) {
  const [substanceName, setSubstanceName] = useState(
    schedule?.substanceName || '',
  )
  const [substanceId, setSubstanceId] = useState(
    schedule?.substanceId || '',
  )
  const [intervalHours, setIntervalHours] = useState(
    schedule ? Math.floor(schedule.intervalMinutes / 60) : 4,
  )
  const [intervalMinutes, setIntervalMinutes] = useState(
    schedule ? schedule.intervalMinutes % 60 : 0,
  )
  const [maxDosesPerDay, setMaxDosesPerDay] = useState(
    schedule?.maxDosesPerDay || 0,
  )
  const [customMessage, setCustomMessage] = useState(
    schedule?.customMessage || '',
  )
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true)

  const substanceOptions: ComboboxOption[] = useMemo(
    () => substances.map((s) => ({ value: s.id, label: s.name })),
    [substances],
  )

  const handleSubstanceChange = (value: string) => {
    const found = substances.find((s) => s.id === value)
    if (found) {
      setSubstanceId(found.id)
      setSubstanceName(found.name)
    } else {
      // Custom value typed by user
      setSubstanceId('')
      setSubstanceName(value)
    }
  }

  const totalMinutes = intervalHours * 60 + intervalMinutes

  const handleSave = () => {
    if (!substanceName.trim()) {
      toast({
        title: 'Missing substance name',
        variant: 'destructive',
      })
      return
    }
    if (totalMinutes <= 0) {
      toast({
        title: 'Invalid interval',
        description: 'Interval must be greater than 0',
        variant: 'destructive',
      })
      return
    }
    onSave({
      substanceName: substanceName.trim(),
      substanceId: substanceId || undefined,
      intervalMinutes: totalMinutes,
      maxDosesPerDay,
      customMessage: customMessage.trim() || undefined,
      enabled,
    })
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Substance</Label>
        <Combobox
          options={substanceOptions}
          value={substanceId}
          onChange={handleSubstanceChange}
          placeholder="Search or type substance name..."
          allowCustom
        />
      </div>

      <div className="space-y-2">
        <Label>Interval between doses</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={24}
              step={1}
              value={intervalHours}
              onChange={(e) =>
                setIntervalHours(
                  Math.min(24, Math.max(0, parseInt(e.target.value) || 0)),
                )
              }
              onBlur={() => {
                // Clamp on blur so empty/invalid values snap to 0
                if (isNaN(intervalHours) || intervalHours < 0) setIntervalHours(0)
                if (intervalHours > 24) setIntervalHours(24)
              }}
              className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-neutral-content whitespace-nowrap">hours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={59}
              step={1}
              value={intervalMinutes}
              onChange={(e) =>
                setIntervalMinutes(
                  Math.min(59, Math.max(0, parseInt(e.target.value) || 0)),
                )
              }
              onBlur={() => {
                // Clamp on blur so empty/invalid values snap to 0
                if (isNaN(intervalMinutes) || intervalMinutes < 0) setIntervalMinutes(0)
                if (intervalMinutes > 59) setIntervalMinutes(59)
              }}
              className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-neutral-content whitespace-nowrap">min</span>
          </div>
        </div>
        {totalMinutes > 0 && (
          <p className="text-xs text-neutral-content">
            Timer will fire every {formatIntervalMinutes(totalMinutes)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Max doses per day</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={24}
            value={maxDosesPerDay}
            onChange={(e) =>
              setMaxDosesPerDay(parseInt(e.target.value) || 0)
            }
            className="w-20"
          />
          <span className="text-sm text-neutral-content">
            {maxDosesPerDay === 0 ? '(unlimited)' : `dose${maxDosesPerDay !== 1 ? 's' : ''}`}
          </span>
        </div>
        <p className="text-xs text-neutral-content">
          Set to 0 for unlimited reminders per day
        </p>
      </div>

      <div className="space-y-2">
        <Label>
          Custom message <span className="text-neutral-content">(optional)</span>
        </Label>
        <Input
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder={`Time for your next dose of ${substanceName || '...'}`}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={enabled ? 'default' : 'outline'}
          size="sm"
          className="gap-1"
          onClick={() => setEnabled(!enabled)}
        >
          {enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          {enabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={totalMinutes <= 0 || !substanceName.trim()}>
          {schedule ? 'Save Changes' : 'Add Schedule'}
        </Button>
      </DialogFooter>
    </div>
  )
}

/**
 * ReminderSettings — full settings panel for configuring dose reminder schedules.
 */
export function ReminderSettings() {
  const schedules = useReminderStore((s) => s.schedules)
  const addSchedule = useReminderStore((s) => s.addSchedule)
  const updateSchedule = useReminderStore((s) => s.updateSchedule)
  const removeSchedule = useReminderStore((s) => s.removeSchedule)
  const autoStartEnabled = useReminderStore((s) => s.autoStartEnabled)
  const setAutoStartEnabled = useReminderStore((s) => s.setAutoStartEnabled)
  const notificationPermission = useReminderStore(
    (s) => s.notificationPermission,
  )

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingSchedule, setEditingSchedule] =
    useState<ReminderSchedule | null>(null)

  const handleAddSchedule = (data: {
    substanceName: string
    substanceId?: string
    intervalMinutes: number
    maxDosesPerDay: number
    customMessage?: string
    enabled: boolean
  }) => {
    addSchedule({
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    })
    setShowAddDialog(false)
    toast({
      title: 'Reminder schedule added',
      description: `${data.substanceName} — every ${formatIntervalMinutes(data.intervalMinutes)}`,
    })
  }

  const handleEditSchedule = (data: {
    substanceName: string
    substanceId?: string
    intervalMinutes: number
    maxDosesPerDay: number
    customMessage?: string
    enabled: boolean
  }) => {
    if (!editingSchedule) return
    updateSchedule(editingSchedule.id, data)
    setEditingSchedule(null)
    toast({
      title: 'Schedule updated',
      description: `${data.substanceName} reminder saved`,
    })
  }

  const handleAddSuggestion = (suggestion: (typeof SUGGESTIONS)[0]) => {
    // Don't add if already exists
    const exists = schedules.some(
      (s) =>
        s.substanceName.toLowerCase() === suggestion.name.toLowerCase(),
    )
    if (exists) {
      toast({
        title: 'Already exists',
        description: `${suggestion.name} already has a reminder schedule`,
      })
      return
    }

    addSchedule({
      id: crypto.randomUUID(),
      substanceName: suggestion.name,
      intervalMinutes: suggestion.intervalMinutes,
      maxDosesPerDay: suggestion.maxDosesPerDay,
      enabled: true,
      createdAt: new Date().toISOString(),
    })
    toast({
      title: 'Reminder added',
      description: `${suggestion.name} — every ${formatIntervalMinutes(suggestion.intervalMinutes)}`,
    })
  }

  const handleRequestPermission = async () => {
    const result = await askNotificationPermission()
    if (result === 'granted') {
      toast({ title: 'Notifications enabled' })
    } else {
      toast({
        title: 'Notifications blocked',
        description: 'Please enable notifications in your browser settings',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="py-3 gap-2">
      <CardHeader className="pb-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          Reminder Settings
        </CardTitle>
        <CardDescription>
          Auto-start timers when you log a dose
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Global settings ── */}
        <div className="space-y-3">
          {/* Auto-start toggle */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Auto-start reminders</p>
              <p className="text-xs text-neutral-content">
                Start a timer automatically when you log a dose
              </p>
            </div>
            <Button
              variant={autoStartEnabled ? 'default' : 'outline'}
              size="sm"
              className="gap-1 shrink-0"
              onClick={() => setAutoStartEnabled(!autoStartEnabled)}
            >
              {autoStartEnabled ? (
                <Bell className="h-3.5 w-3.5" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}
              {autoStartEnabled ? 'On' : 'Off'}
            </Button>
          </div>

          {/* Notification permission */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Browser notifications</p>
              <p className="text-xs text-neutral-content">
                {notificationPermission === 'granted'
                  ? 'Notifications are enabled'
                  : 'Required for reminders when the tab is in the background'}
              </p>
            </div>
            {notificationPermission === 'granted' ? (
              <Badge
                variant="outline"
                className="border-green-500/30 text-green-500 gap-1"
              >
                <ShieldCheck className="h-3 w-3" />
                Enabled
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                onClick={handleRequestPermission}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Enable
              </Button>
            )}
          </div>
        </div>

        <div className="divider my-1" />

        {/* ── Suggestion chips ── */}
        {schedules.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-content uppercase tracking-wide">
              Quick add
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => {
                const exists = schedules.some(
                  (sc) =>
                    sc.substanceName.toLowerCase() === s.name.toLowerCase(),
                )
                return (
                  <button
                    key={s.name}
                    onClick={() => !exists && handleAddSuggestion(s)}
                    disabled={exists}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      exists
                        ? 'opacity-40 cursor-not-allowed border-base-300'
                        : 'border-primary/30 hover:border-primary/60 hover:bg-primary/5 cursor-pointer'
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    {s.name}
                    <span className="text-neutral-content">
                      ({formatIntervalMinutes(s.intervalMinutes)})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Existing schedules ── */}
        {schedules.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-content uppercase tracking-wide">
                Schedules ({schedules.length})
              </p>
              <Dialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Reminder Schedule</DialogTitle>
                    <DialogDescription>
                      Set up a timer that starts automatically when you log this
                      substance
                    </DialogDescription>
                  </DialogHeader>
                  <ScheduleEditor
                    onSave={handleAddSchedule}
                    onCancel={() => setShowAddDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-1.5">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors ${
                    s.enabled
                      ? 'border-base-300'
                      : 'border-base-300/50 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-neutral-content shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {s.substanceName}
                      </span>
                      {!s.enabled && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-neutral-content/30 text-neutral-content"
                        >
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-content mt-0.5 ml-5.5">
                      Every {formatIntervalMinutes(s.intervalMinutes)}
                      {s.maxDosesPerDay > 0 &&
                        ` · max ${s.maxDosesPerDay}x/day`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingSchedule(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-error hover:text-error"
                      onClick={() => removeSchedule(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state + add button */}
        {schedules.length === 0 && (
          <div className="text-center py-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Create Custom Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Reminder Schedule</DialogTitle>
                  <DialogDescription>
                    Set up a timer that starts automatically when you log this
                    substance
                  </DialogDescription>
                </DialogHeader>
                <ScheduleEditor
                  onSave={handleAddSchedule}
                  onCancel={() => setShowAddDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Edit dialog */}
        <Dialog
          open={!!editingSchedule}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Reminder</DialogTitle>
              <DialogDescription>
                Update the schedule for {editingSchedule?.substanceName}
              </DialogDescription>
            </DialogHeader>
            {editingSchedule && (
              <ScheduleEditor
                schedule={editingSchedule}
                onSave={handleEditSchedule}
                onCancel={() => setEditingSchedule(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
