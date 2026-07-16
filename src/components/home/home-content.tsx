'use client'

import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import type { Substance, SubstanceCategory } from '@/lib/substances/types'
import { loadSubstanceDetail, type SubstanceSummary } from '@/lib/substance-repository'
import { useSubstanceIndex } from '@/hooks/use-substance-index'
import { categories } from '@/lib/categories'

import { LibraryHero, CategoryFilterBar, SubstanceGrid } from './library'
import { SubstanceDetail } from './detail'

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const queryParam = searchParams.get('q') ?? ''
  const [selectedCategory, setSelectedCategory] = useState<SubstanceCategory | 'all'>('all')
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const { substances, loading: catalogueLoading, error: catalogueError } = useSubstanceIndex()
  const [searchQuery, setSearchQuery] = useState(queryParam)
  const lastProcessedSubstanceRef = useRef<string | null>(null)
  const deferredQuery = useDeferredValue(searchQuery)

  const loadDetail = useCallback(async (summary: SubstanceSummary) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const detail = summary.source === 'custom'
        ? (await import('@/lib/substances/index')).getSubstanceByIdAll(summary.id)
        : await loadSubstanceDetail(summary.id)
      if (!detail) throw new Error('Substance detail was not found')
      setSelectedSubstance(detail)
      lastProcessedSubstanceRef.current = detail.id
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to load substance detail')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Backwards-compat redirect: the Track workspace used to live at
  // /?view=dose-log (inline in this component). It now lives at /dose-log.
  // Forward any old ?view=... links to the new page so bookmarks and
  // external links don't break. Uses window.location for a hard redirect
  // because router.replace on same-pathname doesn't reliably clear the
  // search param under output:export + trailingSlash:true.
  useEffect(() => {
    const view = searchParams.get('view')
    if (view === 'dose-log' || view === 'timeline' || view === 'history') {
      window.location.replace('/dose-log')
    }
  }, [searchParams])

  // Listen for search events from the app shell search input
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent).detail
      setSearchQuery(query)
    }
    window.addEventListener('drugucopia:search', handler)
    return () => window.removeEventListener('drugucopia:search', handler)
  }, [])

  // Handle URL query parameters (deep-link to a substance via ?substance=)
  useEffect(() => {
    const substanceId = searchParams.get('substance')
    if (substanceId) {
      if (substanceId !== lastProcessedSubstanceRef.current) {
        const found = substances.find((s) => s.id === substanceId)
        if (found) void loadDetail(found)
      }
    } else {
      if (selectedSubstance) setSelectedSubstance(null)
      lastProcessedSubstanceRef.current = null
    }
  }, [searchParams, selectedSubstance, substances, loadDetail])

  // Use history.pushState instead of router.push for same-page URL updates
  // to avoid triggering Next.js client-side navigation and Suspense fallback flicker
  const pushUrl = useCallback(
    (url: string) => {
      window.history.pushState(null, '', url)
    },
    [],
  )

  const handleBackFromDetail = useCallback(() => {
    pushUrl(pathname)
    setSelectedSubstance(null)
    lastProcessedSubstanceRef.current = null
  }, [pushUrl, pathname])

  const handleCategoryClickFromDetail = useCallback(
    (category: SubstanceCategory) => {
      setSelectedSubstance(null)
      lastProcessedSubstanceRef.current = null
      setSelectedCategory(category)
      pushUrl(pathname)
    },
    [pushUrl, pathname],
  )

  const [visibleCount, setVisibleCount] = useState(() => {
    // Start with fewer cards on mobile — fewer DOM nodes + fewer card backgrounds
    // to paint on first scroll. "Show More" still loads the rest on demand.
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 12
    return 24
  })

  useEffect(() => {
    setVisibleCount(typeof window !== 'undefined' && window.innerWidth < 768 ? 12 : 24)
  }, [selectedCategory, deferredQuery])

  const filteredSubstances = useMemo(() => {
    let result = substances
    if (selectedCategory !== 'all') {
      result = result.filter((s) => s.categories?.includes(selectedCategory))
    }
    if (deferredQuery) {
      const q = deferredQuery.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.commonNames.some((n) => n.toLowerCase().includes(q)),
      )
    }
    return result
  }, [substances, selectedCategory, deferredQuery])

  const handleDoseLogged = useCallback(() => { }, [])

  const handleSelectSubstance = useCallback(
    (substance: SubstanceSummary) => {
      pushUrl(`${pathname}?substance=${substance.id}`)
      void loadDetail(substance)
    },
    [pushUrl, pathname, loadDetail],
  )

  const handleCategoryChange = useCallback(
    (cat: SubstanceCategory | 'all') => {
      setSelectedCategory(cat)
      if (searchParams.toString()) pushUrl(pathname)
    },
    [searchParams, pushUrl, pathname],
  )

  useEffect(() => {
    if (selectedSubstance) window.scrollTo(0, 0)
  }, [selectedSubstance])

  if (detailLoading || catalogueLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="loading loading-spinner loading-lg text-primary" /></div>
  }

  if (detailError || catalogueError) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div role="alert" className="alert alert-error">
          <span>{detailError ?? catalogueError?.message ?? 'The substance catalogue could not load.'}</span>
          <button type="button" className="btn btn-sm" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  // ── Substance detail ──
  if (selectedSubstance) {
    return (
      <SubstanceDetail
        substance={selectedSubstance}
        onBack={handleBackFromDetail}
        onDoseLogged={handleDoseLogged}
        onCategoryClick={handleCategoryClickFromDetail}
        router={router}
      />
    )
  }

  // ── Library list view ──
  return (
    <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-10">
      <LibraryHero
        selectedCategory={selectedCategory}
        categories={categories}
        totalCount={filteredSubstances.length}
      />

      <CategoryFilterBar
        selectedCategory={selectedCategory}
        onChange={handleCategoryChange}
        categories={categories}
      />

      <SubstanceGrid
        substances={filteredSubstances}
        visibleCount={visibleCount}
        totalCount={filteredSubstances.length}
        onSelect={handleSelectSubstance}
        onShowMore={() =>
          setVisibleCount((prev) => prev + (typeof window !== 'undefined' && window.innerWidth < 768 ? 12 : 24))
        }
      />
    </div>
  )
}
