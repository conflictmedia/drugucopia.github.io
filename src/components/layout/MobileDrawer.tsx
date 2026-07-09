'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  X,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Substances', icon: FlaskConical },
  { href: '/interactions', label: 'Interactions', icon: Shuffle },
  { href: '/dxm-calculator', label: 'DXM Calc', icon: Calculator },
  { href: '/kratom-calculator', label: 'Kratom Calc', icon: Leaf },
  { href: '/harm-reduction', label: 'Harm Reduction', icon: Shield },
]

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-80 bg-base-200/95 backdrop-blur-xl shadow-2xl border-r border-base-300/50 transition-transform duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-base-300/50 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={onClose}
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
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square h-8 w-8 min-h-0"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  'hover:bg-base-300/50 hover:text-base-content',
                  active
                    ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                    : 'text-neutral-content'
                )}
                onClick={(e) => {
                  onClose()
                  if (item.href === '/') {
                    e.preventDefault()
                    router.push('/')
                  }
                }}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', active && 'text-primary')} />
                <span className="truncate">{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-6 rounded-full bg-primary" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-base-300/50 p-3 space-y-1 shrink-0">
          <a
            href="https://github.com/drugucopia/drugucopia"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-base-300/50 text-neutral-content hover:text-base-content"
          >
            <Github className="h-5 w-5 shrink-0" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </>
  )
}
