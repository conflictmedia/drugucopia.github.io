'use client'

import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSync, type DoseConflict } from '@/contexts/sync-context'
import { format } from 'date-fns'
import { formatDoseAmount } from '@/lib/utils'

/**
 * D2 — Pending sync conflicts banner + per-conflict resolution UI.
 *
 * Renders above the dose history list when one or more conflicts are
 * pending. Each conflict shows the local version vs. the remote version
 * side by side, plus three resolution buttons:
 *
 *   - Keep mine (local wins, pushes to remote on next sync)
 *   - Keep theirs (remote wins, local changes discarded)
 *   - Keep both (remote stays, local version is duplicated with a new ID)
 *
 * The user can also dismiss a conflict without resolving — but the
 * conflict will re-surface on the next sync if both sides still differ.
 */
export function SyncConflicts() {
  const { pendingConflicts, resolveConflict, dismissConflict } = useSync()

  if (pendingConflicts.length === 0) return null

  return (
    <Alert variant="warning" className="mb-4">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <AlertTitle>
          {pendingConflicts.length} sync conflict{pendingConflicts.length !== 1 ? 's' : ''} need{pendingConflicts.length === 1 ? 's' : ''} review
        </AlertTitle>
        <AlertDescription>
          Two devices edited the same dose since the last sync. Pick which version to keep — the other will be discarded (or pick &ldquo;keep both&rdquo; to duplicate).
        </AlertDescription>
      </div>
      <div className="space-y-2 ml-4">
        {pendingConflicts.map((c) => (
          <ConflictRow
            key={c.id}
            conflict={c}
            onResolve={(choice) => resolveConflict(c.id, choice)}
            onDismiss={() => dismissConflict(c.id)}
          />
        ))}
      </div>
    </Alert>
  )
}

function ConflictRow({
  conflict,
  onResolve,
  onDismiss,
}: {
  conflict: DoseConflict
  onResolve: (choice: 'local' | 'remote' | 'both') => void
  onDismiss: () => void
}) {
  const { local, remote } = conflict
  return (
    <Card variant="outline" className="border-warning/30 bg-base-100/60">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{local.substanceName}</span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-neutral-content/60 hover:text-base-content transition-colors shrink-0"
            aria-label="Dismiss this conflict"
            title="Dismiss (will re-surface on next sync if unresolved)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
          <VersionCard label="Your version" dose={local} variant="primary" />
          <div className="hidden sm:flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-neutral-content/60" />
          </div>
          <VersionCard label="Synced version" dose={remote} variant="info" />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onResolve('local')}
          >
            Keep mine
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onResolve('remote')}
          >
            Keep theirs
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onResolve('both')}
          >
            Keep both (duplicate)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function VersionCard({
  label,
  dose,
  variant,
}: {
  label: string
  dose: import('@/types').DoseLog
  variant: 'primary' | 'info' | 'success' | 'warning' | 'error'
}) {
  const formatted = formatDoseAmount(dose.amount, dose.unit)
  return (
    <Card variant="flat" className="p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-[10px] uppercase tracking-wider text-neutral-content">
          {label}
        </span>
        <span className="text-[10px] text-neutral-content/70 tabular-nums">
          {format(new Date(dose.updatedAt || dose.createdAt), 'MMM d, h:mm a')}
        </span>
      </div>
      <div className="text-sm font-medium">
        {formatted.amount} {formatted.unit} · {dose.route}
      </div>
      <div className="text-neutral-content text-[11px]">
        {dose.mood && <span className="mr-2">Mood: {dose.mood}</span>}
        {dose.setting && <span>Setting: {dose.setting}</span>}
        {!dose.mood && !dose.setting && <span className="italic opacity-60">No mood/setting</span>}
      </div>
      {dose.notes && (
        <p className="text-[11px] text-base-content/80 leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
          {dose.notes}
        </p>
      )}
      <Badge variant={variant} className="mt-1.5 w-fit">
        {label}
      </Badge>
    </Card>
  )
}