'use client'

import { Search } from 'lucide-react'
import type { Substance } from '@/lib/types'
import { SubstanceCard } from './SubstanceCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SubstanceGridProps {
  substances: Substance[]
  visibleCount: number
  totalCount: number
  onSelect: (s: Substance) => void
  onShowMore: () => void
}

/**
 * SubstanceGrid — Phase 3 grid container for the library.
 *
 * Renders the visible slice of substances in a responsive grid:
 *   - mobile: 1 column
 *   - sm:     2 columns
 *   - lg:     3 columns
 *
 * Below the grid, conditionally renders a "Show More" button when there are
 * more substances than currently visible, and an empty-state card when the
 * filtered set is empty.
 */
export function SubstanceGrid({
  substances,
  visibleCount,
  totalCount,
  onSelect,
  onShowMore,
}: SubstanceGridProps) {
  const visible = substances.slice(0, visibleCount)
  const remaining = totalCount - visibleCount

  if (totalCount === 0) {
    return (
      <Card variant="default">
        <CardContent className="items-center text-center py-12">
          <Search className="h-10 w-10 text-neutral-content opacity-50" />
          <h3 className="text-lg font-medium">No substances found</h3>
          <p className="text-sm text-neutral-content">
            Try adjusting your search or filter criteria.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((substance) => (
          <SubstanceCard
            key={substance.id}
            substance={substance}
            onSelect={onSelect}
          />
        ))}
      </div>

      {remaining > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onShowMore} className="gap-2">
            Show more
            <Badge variant="outline" size="sm">
              {remaining} remaining
            </Badge>
          </Button>
        </div>
      )}
    </div>
  )
}
