'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FlaskConical,
  Shuffle,
  Shield,
  Leaf,
  Calculator,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Substances', icon: FlaskConical },
  { href: '/interactions', label: 'Interactions', icon: Shuffle },
  { href: '/dxm-calculator', label: 'DXM', icon: Calculator },
  { href: '/kratom-calculator', label: 'Kratom', icon: Leaf },
  { href: '/harm-reduction', label: 'Harm', icon: Shield },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="mobile-nav md:hidden z-50">
      {navItems.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn('mobile-nav-item', active && 'active')}
          >
            <item.icon />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
