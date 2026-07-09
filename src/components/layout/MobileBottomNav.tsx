'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MOBILE_DOCK_ITEMS, isNavItemActive } from './navigation'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams.get('view')

  const navigate = (href: string) => {
    if (pathname === '/') {
      router.replace(href)
      return
    }

    router.push(href)
  }

  return (
    <nav
      className="dock dock-sm border-t border-base-300 bg-base-100/95 px-1 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Primary navigation"
    >
      {MOBILE_DOCK_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = isNavItemActive(item, pathname, view)

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.href)}
            className={cn(isActive && 'dock-active text-primary')}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            <Icon className="h-5 w-5" />
            <span className="dock-label text-[11px]">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}


