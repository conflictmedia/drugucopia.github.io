'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  FlaskConical,
  Shuffle,
  Shield,
  Leaf,
  Calculator,
  Moon,
  Sun,
  Github,
  Menu,
  X,
  Home,
  Activity,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Substances', icon: FlaskConical },
  { href: '/interactions', label: 'Interactions', icon: Shuffle },
  { href: '/dxm-calculator', label: 'DXM Calc', icon: Calculator },
  { href: '/kratom-calculator', label: 'Kratom Calc', icon: Leaf },
  { href: '/harm-reduction', label: 'Harm Reduction', icon: Shield },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full bg-base-200/80 backdrop-blur-xl border-r border-base-300/50 transition-all duration-300 ease-in-out',
        'flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-3 border-b border-base-300/50 shrink-0">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2.5 transition-opacity duration-200',
            collapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100'
          )}
        >
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`}
            alt="Drugucopia"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="font-semibold text-base tracking-tight">Drugucopia</span>
        </Link>
        <button
          onClick={onToggle}
          className="btn btn-ghost btn-sm btn-square h-8 w-8 min-h-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-base-300/50 hover:text-base-content',
                active
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                  : 'text-neutral-content'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', active && 'text-primary')} />
              <span className={cn('truncate transition-opacity duration-200', collapsed && 'opacity-0 w-0')}>
                {item.label}
              </span>
              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-6 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-base-300/50 p-3 space-y-1 shrink-0">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            'hover:bg-base-300/50 text-neutral-content hover:text-base-content'
          )}
          title={collapsed ? 'Toggle theme' : undefined}
        >
          {mounted && (theme === 'dark' ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          ))}
          <span className={cn('truncate transition-opacity duration-200', collapsed && 'opacity-0 w-0')}>
            {mounted && (theme === 'dark' ? 'Light' : 'Dark')}
          </span>
        </button>

        <a
          href="https://github.com/drugucopia/drugucopia"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            'hover:bg-base-300/50 text-neutral-content hover:text-base-content'
          )}
          title={collapsed ? 'GitHub' : undefined}
        >
          <Github className="h-5 w-5 shrink-0" />
          <span className={cn('truncate transition-opacity duration-200', collapsed && 'opacity-0 w-0')}>
            GitHub
          </span>
        </a>
      </div>
    </aside>
  )
}
