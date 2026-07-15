'use client'

import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Substance } from '@/lib/types'
import { categories } from '@/lib/categories'
import {
  categoryColors,
  categoryColorVar,
  riskLevelColors,
} from '../home-constants'
import {
  CategoryIcon,
  getPrimaryCategory,
  getSubstanceCategories,
} from '../home-utils'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SubstanceCardProps {
  substance: Substance
  onSelect: (s: Substance) => void
}

/**
 * SubstanceCard — Phase 3 simplified card for the library grid.
 *
 * Per plan §6.1 the grid card now shows only:
 *   - name + class
 *   - 1-line summary (clamped)
 *   - up to 2 category badges
 *   - risk badge
 *   - route count badge (only when > 1 route)
 *
 * Removed: glow classes, decorative card-transparent panel chrome, common-names
 * badges row, oversized icon tile. The card uses the standardized `<Card>`
 * primitive (variant="default") so transparency + spacing are consistent with
 * the rest of the app.
 *
 * Memoized — the grid can render 24+ cards and we don't want unrelated
 * re-renders (search query typing in a sibling component, etc.) to re-render
 * every card.
 */
export const SubstanceCard = memo(function SubstanceCard({
  substance,
  onSelect,
}: SubstanceCardProps) {
  const primary = getPrimaryCategory(substance)
  const cats = getSubstanceCategories(substance)
  const hasRouteData = substance.routeData && Object.keys(substance.routeData).length > 1

  // Map risk levels to semantic badge variants per DESIGN.md severity ladder
  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'very-high':
      case 'high':
        return 'error' as const
      case 'moderate':
        return 'warning' as const
      case 'low':
        return 'success' as const
      default:
        return 'outline' as const
    }
  }

  // Get semantic color CSS variable for category icon background
  const getCategoryColor = (cat: string) => categoryColorVar[cat as keyof typeof categoryColorVar] ?? 'var(--color-neutral)'

  return (
    <Card
      variant="default"
      className={cn(
        // GPU-only lift on hover (transform only, no layout animation)
        'transition-transform duration-150 hover:-translate-y-0.5',
        // Make the whole card a button
        'cursor-pointer text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        // Mobile: content-visibility for offscreen cards
        'content-visibility-auto',
      )}
      onClick={() => onSelect(substance)}
    >
      <CardContent className="gap-3 p-4 md:p-5">
        {/* Header: icon + name/class + chevron */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {primary && (
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  // Use semantic CSS variable for category color
                  `bg-[${getCategoryColor(primary)}]`
                )}
              >
                <CategoryIcon substance={substance} className="h-4 w-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="card-title text-base font-semibold leading-tight">
                {substance.name}
              </h3>
              <p className="truncate text-xs text-neutral-content">{substance.class}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-content" />
        </div>

        {/* Summary — single clamped line per the plan */}
        <p className="line-clamp-2 text-sm text-neutral-content">{substance.description}</p>

        {/* Footer: category badges + risk/routes */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {cats.slice(0, 2).map((cat) => {
              const info = categories.find((c) => c.id === cat)
              const colorVar = categoryColorVar[cat as keyof typeof categoryColorVar] ?? 'var(--color-neutral)'
              return (
                <Badge
                  key={cat}
                  variant="outline"
                  size="sm"
                  className={cn(`bg-[${colorVar}]/10 border-[${colorVar}]/20 text-[${colorVar}]`)}
                >
                  {info?.name ?? cat}
                </Badge>
              )
            })}
            {cats.length > 2 && (
              <Badge variant="outline" size="sm" className="text-neutral-content">
                +{cats.length - 2}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasRouteData && (
              <Badge variant="outline" size="sm" className="border-primary/30 text-primary">
                {Object.keys(substance.routeData!).length} routes
              </Badge>
            )}
            <Badge
              variant={getRiskBadgeVariant(substance.riskLevel)}
              size="sm"
            >
              {substance.riskLevel.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})