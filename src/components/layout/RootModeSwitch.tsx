'use client'

import { Activity, FlaskConical } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isTrackView } from './navigation'

export function RootModeSwitch() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  if (pathname !== '/') return null

  const view = searchParams.get('view')
  const trackActive = isTrackView(view)

  const navigate = (href: string) => {
    router.replace(href)
  }

  return (
    <div role="tablist" className="tabs tabs-box tabs-sm w-full sm:w-auto">
      <button
        type="button"
        role="tab"
        aria-selected={!trackActive}
        className={cn('tab gap-2', !trackActive && 'tab-active')}
        onClick={() => navigate('/')}
      >
        <FlaskConical className="h-4 w-4" />
        Library
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={trackActive}
        className={cn('tab gap-2', trackActive && 'tab-active')}
        onClick={() => navigate('/?view=dose-log')}
      >
        <Activity className="h-4 w-4" />
        Track
      </button>
    </div>
  )
}
