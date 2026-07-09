'use client'

import { Menu, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { searchSubstancesRanked } from '@/lib/substances/index'
import { AnimatePresence, motion } from 'framer-motion'

interface HeaderProps {
  onMenuClick: () => void
  onDoseLog?: () => void
  showDoseLog?: boolean
}

const pageTitles: Record<string, string> = {
  '/': 'Substances',
  '/interactions': 'Interactions',
  '/dxm-calculator': 'DXM Calculator',
  '/kratom-calculator': 'Kratom Calculator',
  '/harm-reduction': 'Harm Reduction',
  '/analytics': 'Analytics',
}

const CATEGORY_DOTS: Record<string, string> = {
  stimulants: 'bg-amber-500',
  depressants: 'bg-indigo-500',
  hallucinogens: 'bg-purple-500',
  dissociatives: 'bg-cyan-500',
  empathogens: 'bg-pink-500',
  cannabinoids: 'bg-green-500',
  opioids: 'bg-red-500',
  deliriants: 'bg-slate-500',
  nootropics: 'bg-teal-500',
  other: 'bg-zinc-500',
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const lower = text.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  const index = lower.indexOf(lowerQuery)
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-primary">{text.slice(index, index + lowerQuery.length)}</span>
      {text.slice(index + lowerQuery.length)}
    </>
  )
}

export function Header({ onMenuClick, onDoseLog, showDoseLog = true }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const title = pageTitles[pathname] || 'Drugucopia'

  const searchResults = searchSubstancesRanked(searchQuery, { limit: 6 })

  useEffect(() => {
    setActiveIndex(-1)
  }, [searchResults.length])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: MouseEvent) => {
      const clickInDesktop = searchRef.current && searchRef.current.contains(e.target as Node)
      const clickInMobile = mobileSearchRef.current && mobileSearchRef.current.contains(e.target as Node)
      if (!clickInDesktop && !clickInMobile) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  const navigateToSubstance = useCallback((substanceId: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    const viewParam = new URLSearchParams(window.location.search).get('view')
    const url = viewParam
      ? `/?substance=${substanceId}&view=${viewParam}`
      : `/?substance=${substanceId}`
    router.push(url)
  }, [router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!searchOpen || searchResults.length === 0) {
      if (e.key === 'Enter' && searchQuery.trim()) {
        setSearchOpen(false)
        router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => prev < searchResults.length - 1 ? prev + 1 : 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => prev > 0 ? prev - 1 : searchResults.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        const idx = activeIndex >= 0 ? activeIndex : 0
        if (idx < searchResults.length) navigateToSubstance(searchResults[idx].substance.id)
        break
      case 'Escape':
        e.preventDefault()
        setSearchOpen(false)
        setActiveIndex(-1)
        break
    }
  }, [searchOpen, searchResults, activeIndex, searchQuery, router, navigateToSubstance])

  const handleDoseLogClick = () => {
    if (onDoseLog) onDoseLog()
    window.dispatchEvent(new CustomEvent('drugucopia:dose-log'))
  }

  const isHomePage = pathname === '/'

  return (
    <header className="sticky top-0 z-50 h-auto md:h-16 border-b border-base-300/50 bg-base-100/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        {/* Left: Menu button (mobile) + Title */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onMenuClick}
            className="btn btn-ghost btn-sm btn-square h-9 w-9 min-h-0 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight hidden sm:block">{title}</h1>
        </div>

        {/* Center: Search (desktop) */}
        <div ref={searchRef} className="hidden md:flex flex-1 max-w-md mx-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-content" />
          <Input
            ref={inputRef}
            placeholder="Search substances..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => { if (searchQuery.trim()) setSearchOpen(true) }}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-4 h-9 bg-base-200/70 border-base-300/50 focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchOpen(false); setActiveIndex(-1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-content hover:text-base-content transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <AnimatePresence>
            {searchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 w-full rounded-xl border border-base-300 bg-base-100 shadow-xl overflow-hidden z-50"
              >
                <div className="max-h-72 overflow-y-auto p-1.5">
                  {searchResults.map((result, idx) => {
                    const sub = result.substance
                    const isActive = idx === activeIndex
                    return (
                      <button
                        key={sub.id}
                        onClick={() => navigateToSubstance(sub.id)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left',
                          isActive ? 'bg-accent text-accent-content' : 'hover:bg-accent/50'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full shrink-0', CATEGORY_DOTS[sub.categories[0]] || 'bg-zinc-500')} />
                        <span className="truncate flex-1">
                          {result.matchField === 'name' ? highlightMatch(sub.name, searchQuery) : sub.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-base-200/70 text-neutral-content truncate max-w-[80px]">
                          {sub.categories[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Dose Log button (home page only) */}
          {isHomePage && showDoseLog && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 text-xs h-9"
              onClick={handleDoseLogClick}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Log Dose</span>
              <span className="sm:hidden">Log</span>
            </Button>
          )}

          {/* Mobile search toggle */}
          <button
            className="md:hidden btn btn-ghost btn-sm btn-square h-9 w-9 min-h-0"
            onClick={() => {
              // Focus search on mobile - we'll use a simple toggle or focus
              const searchInput = document.querySelector('input[placeholder="Search substances..."]')
              if (searchInput instanceof HTMLInputElement) searchInput.focus()
            }}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile search bar (below header) */}
      <div ref={mobileSearchRef} className="md:hidden px-4 pb-3 -mt-1 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-content" />
          <Input
            placeholder="Search substances..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => { if (searchQuery.trim()) setSearchOpen(true) }}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-10 h-9 bg-base-200/70 border-base-300/50 text-sm focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchOpen(false); setActiveIndex(-1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-content hover:text-base-content transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <AnimatePresence>
            {searchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 w-full rounded-xl border border-base-300 bg-base-100 shadow-xl overflow-hidden z-50"
              >
                <div className="max-h-72 overflow-y-auto p-1.5">
                  {searchResults.map((result, idx) => {
                    const sub = result.substance
                    const isActive = idx === activeIndex
                    return (
                      <button
                        key={sub.id}
                        onClick={() => navigateToSubstance(sub.id)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left',
                          isActive ? 'bg-accent text-accent-content' : 'hover:bg-accent/50'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full shrink-0', CATEGORY_DOTS[sub.categories[0]] || 'bg-zinc-500')} />
                        <span className="truncate flex-1">
                          {result.matchField === 'name' ? highlightMatch(sub.name, searchQuery) : sub.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-base-200/70 text-neutral-content truncate max-w-[80px]">
                          {sub.categories[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

// Re-export X for the search clear button
import { X } from 'lucide-react'
