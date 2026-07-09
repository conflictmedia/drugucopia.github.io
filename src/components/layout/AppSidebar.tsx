'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight, Github } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type MouseEvent } from 'react'
import { NAV_ITEMS, NAV_SECTIONS, isNavItemActive } from './navigation'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  expanded: boolean
  onNavigate?: () => void
  onToggle: () => void
}

export function AppSidebar({ expanded, onNavigate, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams.get('view')

  const navigate = (href: string) => {
    onNavigate?.()

    if (pathname === '/') {
      router.replace(href)
      return
    }

    router.push(href)
  }

  const handleBrandClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    navigate('/')
  }

  return (
    <aside
      className={cn(
        'flex min-h-full w-72 flex-col overflow-x-hidden border-r border-base-300 bg-base-200 transition-[width] duration-200 lg:sticky lg:top-0 lg:h-[100dvh] lg:overflow-hidden',
        expanded ? 'lg:w-60' : 'lg:w-16',
      )}
    >
      <div className={cn('navbar min-h-16 border-b border-base-300', expanded ? 'px-3 sm:px-4' : 'px-2 lg:px-1.5')}>
        <button
          type="button"
          className={cn(
            'flex flex-1 w-full min-w-0 items-center gap-3 text-left',
            !expanded && 'lg:justify-center lg:gap-0',
          )}
          onClick={handleBrandClick}
          title="Drugucopia"
          aria-label="Go to Library"
        >
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`}
            alt="Drugucopia"
            width={36}
            height={36}
            className="rounded-box shrink-0"
          />
          <div className={cn('min-w-0', !expanded && 'lg:hidden')}>
            <div className="text-sm font-semibold leading-tight">Drugucopia</div>
            <div className="text-xs text-neutral-content">
              Harm reduction toolkit
            </div>
          </div>
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-square btn-sm ml-auto hidden lg:inline-flex"
          onClick={onToggle}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-2 lg:p-1.5">
        {NAV_SECTIONS.map((section) => {
          const items = NAV_ITEMS.filter((item) => item.section === section.section)

          return (
            <ul
              key={section.section}
              className={cn(
                'menu menu-md w-full rounded-box border border-base-300 bg-base-100 p-2',
                !expanded && 'lg:px-0.5 lg:py-2',
              )}
            >
              <li className={cn('menu-title px-2', !expanded && 'lg:hidden')}>
                <span>{section.title}</span>
              </li>
              {items.map((item) => {
                const isActive = isNavItemActive(item, pathname, view)
                const Icon = item.icon

                return (
                  <li key={item.id} className="w-full">
                    <div
                      className={cn(!expanded && 'tooltip tooltip-right w-full')}
                      data-tip={!expanded ? item.label : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(item.href)}
                        className={cn(
                          'w-full min-w-0',
                          isActive && 'menu-active lg:ring-1 lg:ring-primary/20',
                          !expanded && 'lg:justify-center lg:px-1.5 lg:min-h-11',
                        )}
                        title={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={item.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={cn(!expanded && 'lg:hidden')}>{item.label}</span>
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        })}
      </div>

      <div className="border-t border-base-300 p-2 lg:p-1.5">
        <div
          className={cn(!expanded && 'tooltip tooltip-right w-full')}
          data-tip={!expanded ? 'GitHub' : undefined}
        >
          <a
            href="https://github.com/drugucopia/drugucopia.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'btn btn-ghost btn-block',
              expanded ? 'justify-start' : 'lg:justify-center lg:px-1.5 lg:min-h-11',
            )}
            title="GitHub"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4 shrink-0" />
            <span className={cn(!expanded && 'lg:hidden')}>GitHub</span>
          </a>
        </div>
      </div>
    </aside>
  )
}
