'use client'

import { Cloud, CloudOff, Loader2, Menu, Plus, AlertCircle } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { formatDistanceToNow } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type MouseEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSync } from '@/contexts/sync-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { SubstanceSearch } from './SubstanceSearch'
import { RootModeSwitch } from './RootModeSwitch'
import { getPageTitle } from './navigation'

interface TopBarProps {
  onMenuClick: () => void
}

function SyncStatusButton() {
  const router = useRouter()
  const { syncStatus, lastSyncedAt } = useSync()
  const [, setTick] = useState(0)

  useEffect(() => {
    if (syncStatus !== 'synced') return
    const id = window.setInterval(() => setTick((tick) => tick + 1), 30_000)
    return () => window.clearInterval(id)
  }, [syncStatus])

  const label =
    syncStatus === 'synced'
      ? lastSyncedAt
        ? `Synced ${formatDistanceToNow(new Date(lastSyncedAt), {
            addSuffix: true,
          })}`
        : 'Synced'
      : syncStatus === 'connecting'
        ? 'Connecting to sync…'
        : syncStatus === 'error'
          ? 'Sync error'
          : 'Sync off'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'relative',
        syncStatus === 'synced' && 'text-success',
        syncStatus === 'connecting' && 'text-warning',
        syncStatus === 'error' && 'text-error',
        syncStatus === 'idle' && 'text-neutral-content',
      )}
      onClick={() => router.push('/?view=dose-log')}
      aria-label={label}
      title={label}
    >
      {syncStatus === 'synced' && <Cloud className="h-4 w-4" />}
      {syncStatus === 'connecting' && <Loader2 className="h-4 w-4 animate-spin" />}
      {syncStatus === 'error' && <AlertCircle className="h-4 w-4" />}
      {syncStatus === 'idle' && <CloudOff className="h-4 w-4" />}
      {syncStatus === 'synced' && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-success"
        />
      )}
    </Button>
  )
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const queryParam = searchParams.get('q') ?? ''
  const title = getPageTitle(pathname, view)
  const showRootSwitch = pathname === '/'
  const openDoseLogger = useUIStore((state) => state.openDoseLogger)

  const handleDoseLogClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    openDoseLogger()
  }

  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur">
      <div className="navbar min-h-16 gap-2 px-3 sm:px-4 lg:px-5">
        <div className="navbar-start min-w-0 gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-square lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-content">
              Drugucopia
            </div>
            <h1 className="truncate text-lg font-semibold">{title}</h1>
          </div>
        </div>

        <div className="navbar-center hidden w-full max-w-xl lg:flex">
          <SubstanceSearch
            key={`desktop-search-${pathname}-${queryParam}`}
            showShortcutHint
          />
        </div>

        <div className="navbar-end gap-1 sm:gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={handleDoseLogClick}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log Dose</span>
            <span className="sm:hidden">Log</span>
          </Button>
          <SyncStatusButton />
          <ThemeToggle />
        </div>
      </div>

      <div
        className={cn(
          'border-t border-base-300/70 px-3 py-3 sm:px-4',
          !showRootSwitch && 'lg:hidden',
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {showRootSwitch && <RootModeSwitch />}
          <div className="lg:hidden">
            <SubstanceSearch key={`mobile-search-${pathname}-${queryParam}`} mobile />
          </div>
        </div>
      </div>
    </header>
  )
}


