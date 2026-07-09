import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BarChart3,
  Calculator,
  FlaskConical,
  Leaf,
  Shield,
  Shuffle,
} from 'lucide-react'

export const TRACK_VIEWS = new Set(['dose-log', 'timeline', 'history'])

export interface NavItem {
  id: 'library' | 'interactions' | 'track' | 'analytics' | 'dxm' | 'kratom' | 'safety'
  href: string
  label: string
  icon: LucideIcon
  section: 'explore' | 'track' | 'tools'
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'library',
    href: '/',
    label: 'Library',
    icon: FlaskConical,
    section: 'explore',
  },
  {
    id: 'interactions',
    href: '/interactions',
    label: 'Interactions',
    icon: Shuffle,
    section: 'explore',
  },
  {
    id: 'track',
    href: '/?view=dose-log',
    label: 'Track',
    icon: Activity,
    section: 'track',
  },
  {
    id: 'analytics',
    href: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    section: 'tools',
  },
  {
    id: 'dxm',
    href: '/dxm-calculator',
    label: 'DXM Calculator',
    icon: Calculator,
    section: 'tools',
  },
  {
    id: 'kratom',
    href: '/kratom-calculator',
    label: 'Kratom Calculator',
    icon: Leaf,
    section: 'tools',
  },
  {
    id: 'safety',
    href: '/harm-reduction',
    label: 'Safety',
    icon: Shield,
    section: 'explore',
  },
]

export const NAV_SECTIONS: Array<{
  title: string
  section: NavItem['section']
}> = [
  { title: 'Explore', section: 'explore' },
  { title: 'Track', section: 'track' },
  { title: 'Tools', section: 'tools' },
]

export const MOBILE_DOCK_ITEMS = NAV_ITEMS.filter((item) =>
  ['library', 'interactions', 'track', 'analytics', 'safety'].includes(item.id),
)

export function isTrackView(view: string | null) {
  return !!view && TRACK_VIEWS.has(view)
}

export function isNavItemActive(
  item: NavItem,
  pathname: string,
  view: string | null,
) {
  switch (item.id) {
    case 'library':
      return pathname === '/' && !isTrackView(view)
    case 'track':
      return pathname === '/' && isTrackView(view)
    case 'interactions':
      return pathname.startsWith('/interactions')
    case 'analytics':
      return pathname.startsWith('/analytics')
    case 'dxm':
      return pathname.startsWith('/dxm-calculator')
    case 'kratom':
      return pathname.startsWith('/kratom-calculator')
    case 'safety':
      return pathname.startsWith('/harm-reduction')
    default:
      return false
  }
}

export function getPageTitle(pathname: string, view: string | null) {
  if (pathname === '/' && isTrackView(view)) return 'Track'

  switch (pathname) {
    case '/':
      return 'Library'
    case '/interactions':
      return 'Interactions'
    case '/analytics':
      return 'Analytics'
    case '/dxm-calculator':
      return 'DXM Calculator'
    case '/kratom-calculator':
      return 'Kratom Calculator'
    case '/harm-reduction':
      return 'Safety'
    default:
      return 'Drugucopia'
  }
}

