'use client'

import { AlertTriangle, HelpCircle, ShieldAlert, ThumbsDown, ThumbsUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InteractionResult } from '@/lib/interaction-checker'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface InteractionPairCardProps {
  result: InteractionResult
}

const severityConfig = {
  dangerous: {
    icon: ShieldAlert,
    badgeVariant: 'error' as const,
    iconBgVariant: 'error' as const,
    borderVariant: 'error' as const,
    badgeLabel: 'DANGEROUS',
    iconColor: 'text-error',
  },
  unsafe: {
    icon: AlertTriangle,
    badgeVariant: 'warning' as const,
    iconBgVariant: 'warning' as const,
    borderVariant: 'warning' as const,
    badgeLabel: 'UNSAFE',
    iconColor: 'text-warning',
  },
  caution: {
    icon: HelpCircle,
    badgeVariant: 'warning' as const,
    iconBgVariant: 'warning' as const,
    borderVariant: 'warning' as const,
    badgeLabel: 'CAUTION',
    iconColor: 'text-warning',
  },
  'low-risk': {
    icon: ThumbsUp,
    badgeVariant: 'success' as const,
    iconBgVariant: 'success' as const,
    borderVariant: 'success' as const,
    badgeLabel: 'LOW RISK',
    iconColor: 'text-success',
  },
} as const

const tripsitStatusLabel: Record<string, string> = {
  'Low Risk & Synergy': 'SYNERGY',
  'Low Risk & No Synergy': 'NO SYNERGY',
  'Low Risk & Decrease': 'DECREASES',
}

export function InteractionPairCard({ result }: InteractionPairCardProps) {
  const config = severityConfig[result.severity]
  const Icon = config.icon
  const isTripsit = result.sources.includes('tripsit')

  // Determine sub-label for low-risk results
  const subLabel = result.tripsitStatus
    ? tripsitStatusLabel[result.tripsitStatus]
    : null

  return (
    <Card variant="outline" className={cn('border-transition', `border-${config.borderVariant}/30`, 'hover:shadow-md')}>
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <Badge variant={config.iconBgVariant} className="p-1.5 rounded-lg shrink-0">
            {result.tripsitStatus === 'Low Risk & Decrease' ? (
              <TrendingDown className={cn('h-4 w-4', config.iconColor)} />
            ) : result.tripsitStatus === 'Low Risk & No Synergy' ? (
              <ThumbsDown className={cn('h-4 w-4', config.iconColor)} />
            ) : (
              <Icon className={cn('h-4 w-4', config.iconColor)} />
            )}
          </Badge>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Substance pair */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge variant="outline" className="font-medium text-sm">
                {result.substanceA}
              </Badge>
              <span className="text-neutral-content font-bold text-xs">&times;</span>
              <Badge variant="outline" className="font-medium text-sm">
                {result.substanceB}
              </Badge>
            </div>

            {/* Description */}
            {result.description && (
              <p className="text-sm text-neutral-content leading-relaxed mb-2">
                {result.description}
              </p>
            )}

            {/* Matched interaction terms */}
            {result.matchedTerms.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-xs text-neutral-content">Matched:</span>
                {result.matchedTerms.map((term, i) => (
                  <Badge key={i} variant="outline" size="xs">
                    {term}
                  </Badge>
                ))}
              </div>
            )}

            {/* Academic sources (collapsible — shows all when expanded) */}
            {result.tripsitSources && result.tripsitSources.length > 0 && (
              <details className="mb-2 group">
                <summary className="text-xs text-neutral-content cursor-pointer hover:text-base-content transition-colors select-none">
                  {result.tripsitSources.length} source{result.tripsitSources.length !== 1 ? 's' : ''}
                </summary>
                <ul className="mt-1 space-y-1">
                  {result.tripsitSources.map((src, i) => (
                    <li key={i} className="text-xs text-neutral-content">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-base-content underline decoration-neutral-content/30 hover:decoration-base-content/50 transition-colors"
                      >
                        {src.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* Metadata row */}
            <div className="flex items-center gap-2">
              <Badge variant={config.badgeVariant} size="xs" className="font-bold">
                {config.badgeLabel}
              </Badge>
              {subLabel && (
                <Badge variant={config.badgeVariant} size="xs" className="font-bold">
                  {subLabel}
                </Badge>
              )}
              {isTripsit && (
                <Badge variant="info" size="xs" className="font-bold">
                  TRIPSIT
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}