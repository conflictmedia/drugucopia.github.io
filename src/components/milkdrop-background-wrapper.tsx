'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, lazy, Suspense } from 'react'

// Lazy load to avoid SSR
const MilkdropBackground = lazy(() =>
  import('@/components/milkdrop-background').then((mod) => ({
    default: mod.MilkdropBackground,
  }))
)

export function MilkdropBackgroundWrapper() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="mesh-gradient" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }} />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Suspense
      fallback={
        <div
          className="mesh-gradient"
          style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
        />
      }
    >
      <MilkdropBackground isDark={isDark} />
    </Suspense>
  )
}
