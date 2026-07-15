'use client'

import { Badge } from '@/components/ui/badge'
import { categoryDotColors } from '../home-constants'
import type { SubstanceCategory } from '@/lib/types'
import type { categories as categoriesType } from '@/lib/categories'
import { cn } from '@/lib/utils'

interface CategoryFilterBarProps {
  selectedCategory: SubstanceCategory | 'all'
  onChange: (cat: SubstanceCategory | 'all') => void
  categories: typeof categoriesType
}

/**
 * CategoryFilterBar — single unified filter row for the library.
 *
 * Phase 3 redesign (plan §6.1, §7). Replaces the previous duplicated
 * `md:hidden` mobile chips + `hidden md:flex` desktop buttons with one
 * component that adapts:
 *   - mobile (< md): horizontally scrollable pill row, no wrap
 *   - desktop (>= md): wrapped row of the same pills
 *
 * Pills use semantic badge variants from DESIGN.md — consistent across all 13 themes.
 */
export function CategoryFilterBar({
  selectedCategory,
  onChange,
  categories,
}: CategoryFilterBarProps) {
  return (
    <div
      className={cn(
        'mb-6 flex gap-2',
        // mobile: horizontal scroll
        'overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible',
      )}
    >
      <FilterPill
        active={selectedCategory === 'all'}
        onClick={() => onChange('all')}
        label="All"
      />

      {categories.map((cat) => {
        const isActive = selectedCategory === cat.id
        const dotBadgeVariant = categoryDotColors[cat.id as SubstanceCategory] ?? 'outline'
        return (
          <FilterPill
            key={cat.id}
            active={isActive}
            onClick={() => onChange(cat.id as SubstanceCategory)}
            label={cat.name}
            dotBadgeVariant={dotBadgeVariant}
          />
        )
      })}
    </div>
  )
}

interface FilterPillProps {
  active: boolean
  onClick: () => void
  label: string
  dotBadgeVariant?: string
}

function FilterPill({ active, onClick, label, dotBadgeVariant }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
        active
          ? 'border-base-content bg-base-content text-base-100'
          : 'border-base-300 bg-base-200 text-base-content hover:bg-base-200/80 hover:text-base-content',
      )}
      aria-pressed={active}
    >
      {dotBadgeVariant && (
        <Badge
          variant={dotBadgeVariant as any}
          size="xs"
          className={cn(
            'h-2 w-2 shrink-0 rounded-full p-0',
            // When the pill is active, the badge variant might not be visible
            // against the dark bg-content background, so we use mix-blend-screen
            active && 'mix-blend-screen',
          )}
        >
          {/* Empty badge just for the colored dot */}
        </Badge>
      )}
      {label}
    </button>
  )
}
