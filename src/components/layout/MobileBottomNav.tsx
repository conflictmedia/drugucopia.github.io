'use client'

import { usePathname, useRouter } from 'next/navigation'
import { MOBILE_DOCK_ITEMS, isNavItemActive, type NavItem } from './navigation'
import { cn } from '@/lib/utils'

/**
 * Literal class name lookup so Tailwind sees every utility at build time.
 * Active = full color + bold; inactive = 70% opacity tint of the item's color.
 */
const COLOR_CLASSES: Record<NavItem['color'], { active: string; inactive: string }> = {
  primary: { active: 'text-primary', inactive: 'text-primary/70' },
  secondary: { active: 'text-secondary', inactive: 'text-secondary/70' },
  accent: { active: 'text-accent', inactive: 'text-accent/70' },
  info: { active: 'text-info', inactive: 'text-info/70' },
  success: { active: 'text-success', inactive: 'text-success/70' },
  warning: { active: 'text-warning', inactive: 'text-warning/70' },
  error: { active: 'text-error', inactive: 'text-error/70' },
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const navigate = (href: string) => {
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
        const isActive = isNavItemActive(item, pathname)
        const colorClass = COLOR_CLASSES[item.color]

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.href)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5',
              isActive ? colorClass.active : colorClass.inactive,
              isActive && 'dock-active',
            )}
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
