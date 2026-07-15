'use client'

import {
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Shuffle,
  ArrowRightLeft,
  ThumbsUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InteractionPairCard } from './interaction-pair-card'
import type { InteractionCheckResult } from '@/lib/interaction-checker'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

interface InteractionResultsProps {
  result: InteractionCheckResult | null
  selectedCount: number
  isLoading?: boolean
}

type Severity = 'dangerous' | 'unsafe' | 'caution' | 'low-risk'

const severityIcons = {
  dangerous: ShieldAlert,
  unsafe: AlertTriangle,
  caution: HelpCircle,
  'low-risk': ThumbsUp,
} as const

function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  const Icon = severityIcons[severity]
  return <Icon className={cn(className)} />
}

function SummaryIcon({ severity, className }: { severity: Severity; className?: string }) {
  const Icon = severityIcons[severity]
  return <Icon className={cn(className)} />
}

const severityBadgeVariant = {
  dangerous: 'error' as const,
  unsafe: 'warning' as const,
  caution: 'warning' as const,
  'low-risk': 'success' as const,
}

const severityIconColor = {
  dangerous: 'text-error',
  unsafe: 'text-warning',
  caution: 'text-warning',
  'low-risk': 'text-success',
}

const summaryIconColor = {
  dangerous: 'text-error',
  unsafe: 'text-warning',
  caution: 'text-warning',
  'low-risk': 'text-success',
}

const summaryBorderColor = {
  dangerous: 'border-l-error',
  unsafe: 'border-l-warning',
  caution: 'border-l-warning',
  'low-risk': 'border-l-success',
}

export function InteractionResults({
  result,
  selectedCount,
  isLoading,
}: InteractionResultsProps) {
  if (selectedCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Card variant="ghost" className="mb-4">
          <Shuffle className="h-8 w-8 text-neutral-content mx-auto" />
        </Card>
        <h3 className="text-lg font-semibold mb-1">Select Substances</h3>
        <p className="text-sm text-neutral-content max-w-sm">
          Choose one or more substances to check for interactions. Selecting a single substance
          will show all known interactions for it; selecting two or more will check pairwise
          combinations and cross-tolerances.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Card variant="ghost" className="mb-4 animate-pulse">
          <Shuffle className="h-8 w-8 text-neutral-content mx-auto" />
        </Card>
        <h3 className="text-lg font-semibold mb-1">Analyzing interactions...</h3>
        <p className="text-sm text-neutral-content">Checking all substance pairs</p>
      </div>
    )
  }

  if (!result) return null

  if (result.summary.total === 0 && result.crossTolerances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Card variant="ghost" className="mb-4">
          <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
        </Card>
        <h3 className="text-lg font-semibold mb-1">No Known Interactions</h3>
        <p className="text-sm text-neutral-content max-w-sm">
          No documented interactions were found between the selected substances. This does
          not guarantee safety — always do your own research and consult professionals.
        </p>
      </div>
    )
  }

  const dangerous = result.pairs.filter((p) => p.severity === 'dangerous')
  const unsafe = result.pairs.filter((p) => p.severity === 'unsafe')
  const caution = result.pairs.filter((p) => p.severity === 'caution')
  const lowRisk = result.pairs.filter((p) => p.severity === 'low-risk')
  const hasRisks = dangerous.length > 0 || unsafe.length > 0

  // Determine highest severity for summary banner
  const topSeverity: Severity = result.summary.dangerous > 0
    ? 'dangerous'
    : result.summary.unsafe > 0
      ? 'unsafe'
      : result.summary.caution > 0
        ? 'caution'
        : 'low-risk'

  return (
    <div className="space-y-6">
      {/* Summary Banner — neutral bg with colored left border per severity */}
      <Alert variant="default" className={cn('border-l-4', summaryBorderColor[topSeverity])}>
        <div className="flex items-center gap-3 mb-3">
          <SummaryIcon severity={topSeverity} className={cn('h-5 w-5', summaryIconColor[topSeverity])} />
          <AlertTitle>Interaction Summary</AlertTitle>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.summary.dangerous > 0 && (
            <Badge variant="error" className="font-bold">
              {result.summary.dangerous} Dangerous
            </Badge>
          )}
          {result.summary.unsafe > 0 && (
            <Badge variant="warning" className="font-bold">
              {result.summary.unsafe} Unsafe
            </Badge>
          )}
          {result.summary.caution > 0 && (
            <Badge variant="warning" className="font-bold">
              {result.summary.caution} Caution
            </Badge>
          )}
          {result.summary.lowRisk > 0 && (
            <Badge variant="success" className="font-bold">
              {result.summary.lowRisk} Low Risk
            </Badge>
          )}
          <Badge variant="outline" className="text-base-content/60">
            {result.summary.total} total
          </Badge>
        </div>
      </Alert>

      {/* Dangerous Interactions */}
      {dangerous.length > 0 && (
        <Accordion type="multiple" defaultValue={dangerous.map((_, i) => `dangerous-${i}`)}>
          <div className="mb-3">
            <SeverityIcon severity="dangerous" className="h-4 w-4 text-error" />
            <h4 className="text-sm font-semibold text-error inline-flex items-center gap-2">
              Dangerous Interactions
              <Badge variant="error" size="xs">{dangerous.length}</Badge>
            </h4>
          </div>
          {dangerous.map((pair, i) => (
            <AccordionItem key={`dangerous-${i}`} value={`dangerous-${i}`}>
              <AccordionTrigger className="p-0">
                <InteractionPairCard result={pair} />
              </AccordionTrigger>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Unsafe Interactions */}
      {unsafe.length > 0 && (
        <>
          {dangerous.length > 0 && <div className="divider" />}
          <Accordion type="multiple" defaultValue={unsafe.map((_, i) => `unsafe-${i}`)}>
            <div className="mb-3">
              <SeverityIcon severity="unsafe" className="h-4 w-4 text-warning" />
              <h4 className="text-sm font-semibold text-warning inline-flex items-center gap-2">
                Unsafe Interactions
                <Badge variant="warning" size="xs">{unsafe.length}</Badge>
              </h4>
            </div>
            {unsafe.map((pair, i) => (
              <AccordionItem key={`unsafe-${i}`} value={`unsafe-${i}`}>
                <AccordionTrigger className="p-0">
                  <InteractionPairCard result={pair} />
                </AccordionTrigger>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}

      {/* Caution Interactions */}
      {caution.length > 0 && (
        <>
          {hasRisks && <div className="divider" />}
          <Accordion type="multiple" defaultValue={caution.map((_, i) => `caution-${i}`)}>
            <div className="mb-3">
              <SeverityIcon severity="caution" className="h-4 w-4 text-warning" />
              <h4 className="text-sm font-semibold text-warning inline-flex items-center gap-2">
                Use Caution
                <Badge variant="warning" size="xs">{caution.length}</Badge>
              </h4>
            </div>
            {caution.map((pair, i) => (
              <AccordionItem key={`caution-${i}`} value={`caution-${i}`}>
                <AccordionTrigger className="p-0">
                  <InteractionPairCard result={pair} />
                </AccordionTrigger>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}

      {/* Low Risk Interactions (synergies, decreases, no synergy) */}
      {lowRisk.length > 0 && (
        <>
          {(hasRisks || caution.length > 0) && <div className="divider" />}
          <Accordion type="multiple" defaultValue={lowRisk.map((_, i) => `lowrisk-${i}`)}>
            <div className="mb-3">
              <SeverityIcon severity="low-risk" className="h-4 w-4 text-success" />
              <h4 className="text-sm font-semibold text-success inline-flex items-center gap-2">
                Low Risk Combinations
                <Badge variant="success" size="xs">{lowRisk.length}</Badge>
              </h4>
            </div>
            {lowRisk.map((pair, i) => (
              <AccordionItem key={`lowrisk-${i}`} value={`lowrisk-${i}`}>
                <AccordionTrigger className="p-0">
                  <InteractionPairCard result={pair} />
                </AccordionTrigger>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}

      {/* Cross-Tolerances */}
      {result.crossTolerances.length > 0 && (
        <>
          <div className="divider" />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ArrowRightLeft className="h-4 w-4 text-info" />
              <h4 className="text-sm font-semibold text-info">Cross-Tolerances</h4>
              <Badge variant="info" size="xs">{result.crossTolerances.length}</Badge>
            </div>
            <div className="space-y-2">
              {result.crossTolerances.map((ct, i) => (
                <Card key={`ct-${i}`} variant="outline" className="border-info/20">
                  <div className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-medium text-xs capitalize">
                        {ct.tolerance}
                      </Badge>
                      <span className="text-xs text-neutral-content">shared by</span>
                      {ct.substances.map((sub, j) => (
                        <span key={j} className="flex items-center gap-1">
                          {j > 0 && (
                            <span className="text-neutral-content text-xs">&bull;</span>
                          )}
                          <Badge variant="outline" size="xs">
                            {sub}
                          </Badge>
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-xs text-neutral-content mt-2 leading-relaxed">
              Cross-tolerance means that tolerance to one substance may reduce the effects of
              another substance in the same class. This can lead to taking higher doses than
              intended.
            </p>
          </section>
        </>
      )}

      {/* Disclaimer */}
      <div className="divider" />
      <Alert variant="warning" soft>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div>
          <AlertTitle className="text-xs">Disclaimer</AlertTitle>
          <AlertDescription className="text-[11px] leading-relaxed">
            Interaction data sourced from TripSit&apos;s community-maintained combos database
            and per-substance profiles. Absence of a known interaction does not guarantee
            safety. Always perform independent research and consult qualified healthcare
            professionals. In case of emergency, contact your local emergency services
            immediately.
          </AlertDescription>
        </div>
      </Alert>
    </div>
  )
}