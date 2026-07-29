'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { DARK_THEME_IDS } from '@/components/theme-provider'

export function MilkdropBackgroundWrapper() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="fixed inset-0 z-[-1] pointer-events-none bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/glitch_back.webp)' }} />
  }

  const isDark = !!resolvedTheme && DARK_THEME_IDS.has(resolvedTheme)

  return (
    <div
      className="fixed inset-0 z-[-1] pointer-events-none bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/glitch_back.webp)',
        opacity: isDark ? 0.6 : 0.4,
        filter: isDark ? 'brightness(0.8) contrast(1.1)' : 'brightness(1.1) contrast(0.95)',
        transition: 'opacity 0.5s ease, filter 0.5s ease',
      }}
    />
  )
}
