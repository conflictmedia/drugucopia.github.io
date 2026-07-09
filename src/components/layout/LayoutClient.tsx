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
import { CommandPalette } from '@/components/command-palette'

interface LayoutClientProps {
  children: React.ReactNode
}

export function LayoutClient({ children }: LayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('drugucopia-sidebar-collapsed')
      if (saved !== null) {
        setSidebarCollapsed(JSON.parse(saved))
      }
    } catch { }

    // Detect mobile once on mount — used to skip rendering VisualizerControls
    // (which controls the WebGL background that is disabled on mobile anyway).
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('drugucopia-sidebar-collapsed', JSON.stringify(next))
      } catch { }
      return next
    })
  }

  if (!mounted) {
    return (
      <div className="min-h-[100dvh] bg-transparent">
        <div className="flex h-[100dvh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <SyncProvider>
      <ReminderProvider>
        <div className="min-h-[100dvh] bg-transparent">
          <MilkdropBackgroundWrapper />

          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

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

          <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
          {/* G1 — Global cmd-K search palette. Mounted at the root so the
              Cmd/Ctrl+K shortcut works on every page. Returns null when
              closed, so it adds zero render cost when not in use. */}
          <CommandPalette />
          {/* Visualizer controls only on desktop — the WebGL background itself
              is disabled on mobile, so the controls would do nothing but add
              render cost and clutter. */}
          {!isMobile && <VisualizerControls />}
          <Toaster />
        </div>
      </ReminderProvider>
    </SyncProvider>
  )
}
