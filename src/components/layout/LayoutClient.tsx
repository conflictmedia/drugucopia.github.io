'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileDrawer } from './MobileDrawer'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'
import { VisualizerControls } from '@/components/visualizer-controls'
import { MilkdropBackgroundWrapper } from '@/components/milkdrop-background-wrapper'
import { SyncProvider } from '@/contexts/sync-context'
import { ReminderProvider } from '@/components/reminder-provider'

interface LayoutClientProps {
  children: React.ReactNode
}

export function LayoutClient({ children }: LayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    // Load sidebar state from localStorage
    try {
      const saved = localStorage.getItem('drugucopia-sidebar-collapsed')
      if (saved !== null) {
        setSidebarCollapsed(JSON.parse(saved))
      }
    } catch {}
  }, [])

  useEffect(() => {
    // Close drawer on route change
    setDrawerOpen(false)
  }, [pathname])

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('drugucopia-sidebar-collapsed', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <SyncProvider>
      <ReminderProvider>
        <div className="min-h-screen bg-transparent">
          <MilkdropBackgroundWrapper />

          {/* Desktop Sidebar */}
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

          {/* Main content area */}
          <div
            className={cn(
              'transition-all duration-300 ease-in-out',
              sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
            )}
          >
            <Header
              onMenuClick={() => setDrawerOpen(true)}
              showDoseLog={true}
            />

            <main className="relative min-h-[calc(100vh-4rem)]">
              {children}
            </main>
          </div>

          {/* Mobile Drawer */}
          <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

          <VisualizerControls />
          <Toaster />
        </div>
      </ReminderProvider>
    </SyncProvider>
  )
}
