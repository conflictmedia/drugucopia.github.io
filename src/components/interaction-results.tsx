'use client'

import { useState } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Shuffle,
  ArrowRightLeft,
  ThumbsUp,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InteractionPairCard } from './interaction-pair-card'
import type { InteractionCheckResult, InteractionSeverity } from '@/lib/interaction-checker'

interface InteractionResultsProps {
  result: InteractionCheckResult | null
  selectedCount: number
  isLoading?: boolean
}

type SeverityFilter = 'all' | 'high-risk' | 'caution' | 'low-risk'

export function InteractionResults({
  result,
  selectedCount,
  isLoading,
}: InteractionResultsProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

  if (selectedCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-2xl card-transparent mb-4">
          <Shuffle className="h-8 w-8 text-neutral-content" />
        </div>
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
        <div className="p-4 rounded-2xl card-transparent mb-4 animate-pulse">
          <Shuffle className="h-8 w-8 text-neutral-content" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Analyzing interactions...</h3>
        <p className="text-sm text-neutral-content">Checking all substance pairs</p>
      </div>
    )
  }

  if (!result) return null

  if (result.summary.total === 0 && result.crossTolerances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-2xl bg-success/10 mb-4">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No Known Interactions</h3>
        <p className="text-sm text-neutral-content max-w-sm">
          No documented interactions were found between the selected substances. This does
          not guarantee safety — always do your own research and consult healthcare professionals.
        </p>
      </div>
    )
  }

  const dangerous = result.pairs.filter((p) => p.severity === 'dangerous')
  const unsafe = result.pairs.filter((p) => p.severity === 'unsafe')
  const caution = result.pairs.filter((p) => p.severity === 'caution')
  const lowRisk = result.pairs.filter((p) => p.severity === 'low-risk')
  const hasRisks = dangerous.length > 0 || unsafe.length > 0

  const showDangerous = severityFilter === 'all' || severityFilter === 'high-risk'
  const showUnsafe = severityFilter === 'all' || severityFilter === 'high-risk'
  const showCaution = severityFilter === 'all' || severityFilter === 'caution'
  const showLowRisk = severityFilter === 'all' || severityFilter === 'low-risk'

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div
        className={cn(
          'alert border-l-4 bg-base-100 border-base-300 shadow-sm',
          result.summary.dangerous > 0
            ? 'border-l-error'
            : result.summary.unsafe > 0
              ? 'border-l-warning'
              : result.summary.caution > 0
                ? 'border-l-warning'
                : 'border-l-success'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            {result.summary.dangerous > 0 ? (
              <ShieldAlert className="h-5 w-5 text-error shrink-0" />
            ) : result.summary.unsafe > 0 ? (
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            ) : result.summary.caution > 0 ? (
              <HelpCircle className="h-5 w-5 text-warning shrink-0" />
            ) : (
              <ThumbsUp className="h-5 w-5 text-success shrink-0" />
            )}
            <div>
              <h3 className="font-semibold">Interaction Summary</h3>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {result.summary.dangerous > 0 && (
                  <span className="badge bg-error/20 text-error border-error/40 font-bold text-xs">
                    {result.summary.dangerous} Dangerous
                  </span>
                )}
                {result.summary.unsafe > 0 && (
                  <span className="badge bg-warning/20 text-warning border-warning/40 font-bold text-xs">
                    {result.summary.unsafe} Unsafe
                  </span>
                )}
                {result.summary.caution > 0 && (
                  <span className="badge bg-warning/15 text-warning border-warning/30 font-medium text-xs">
                    {result.summary.caution} Caution
                  </span>
                )}
                {result.summary.lowRisk > 0 && (
                  <span className="badge bg-success/20 text-success border-success/40 font-medium text-xs">
                    {result.summary.lowRisk} Low Risk
                  </span>
                )}
                <span className="badge badge-outline text-neutral-content text-xs">
                  {result.summary.total} total
                </span>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 self-start sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-base-200">
            <Filter className="h-3.5 w-3.5 text-neutral-content mr-1" />
            <button
              onClick={() => setSeverityFilter('all')}
              className={`btn btn-xs ${severityFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            >
              All ({result.summary.total})
            </button>
            {(result.summary.dangerous > 0 || result.summary.unsafe > 0) && (
              <button
                onClick={() => setSeverityFilter('high-risk')}
                className={`btn btn-xs ${severityFilter === 'high-risk' ? 'btn-error' : 'btn-ghost text-error'}`}
              >
                High Risk ({result.summary.dangerous + result.summary.unsafe})
              </button>
            )}
            {result.summary.caution > 0 && (
              <button
                onClick={() => setSeverityFilter('caution')}
                className={`btn btn-xs ${severityFilter === 'caution' ? 'btn-warning' : 'btn-ghost text-warning'}`}
              >
                Caution ({result.summary.caution})
              </button>
            )}
            {result.summary.lowRisk > 0 && (
              <button
                onClick={() => setSeverityFilter('low-risk')}
                className={`btn btn-xs ${severityFilter === 'low-risk' ? 'btn-success' : 'btn-ghost text-success'}`}
              >
                Low Risk ({result.summary.lowRisk})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dangerous Interactions */}
      {showDangerous && dangerous.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-error" />
            <h4 className="text-sm font-bold text-error">Dangerous / Lethal Risk Combinations</h4>
            <span className="badge text-[10px] bg-error/20 text-error border-error/40 font-bold">
              {dangerous.length}
            </span>
          </div>
          <div className="space-y-3">
            {dangerous.map((pair, i) => (
              <InteractionPairCard key={`dangerous-${i}`} result={pair} />
            ))}
          </div>
        </section>
      )}

      {/* Unsafe Interactions */}
      {showUnsafe && unsafe.length > 0 && (
        <>
          {showDangerous && dangerous.length > 0 && <div className="divider" />}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h4 className="text-sm font-bold text-warning">Unsafe Interactions</h4>
              <span className="badge text-[10px] bg-warning/20 text-warning border-warning/40 font-bold">
                {unsafe.length}
              </span>
            </div>
            <div className="space-y-3">
              {unsafe.map((pair, i) => (
                <InteractionPairCard key={`unsafe-${i}`} result={pair} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Caution Interactions */}
      {showCaution && caution.length > 0 && (
        <>
          {(showDangerous && dangerous.length > 0 || showUnsafe && unsafe.length > 0) && <div className="divider" />}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-warning" />
              <h4 className="text-sm font-semibold text-warning">Use Caution</h4>
              <span className="badge text-[10px] bg-warning/15 text-warning border-warning/30">
                {caution.length}
              </span>
            </div>
            <div className="space-y-3">
              {caution.map((pair, i) => (
                <InteractionPairCard key={`caution-${i}`} result={pair} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Low Risk Interactions */}
      {showLowRisk && lowRisk.length > 0 && (
        <>
          {(hasRisks || caution.length > 0) && <div className="divider" />}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="h-4 w-4 text-success" />
              <h4 className="text-sm font-semibold text-success">Low Risk Combinations</h4>
              <span className="badge text-[10px] bg-success/20 text-success border-success/40">
                {lowRisk.length}
              </span>
            </div>
            <div className="space-y-3">
              {lowRisk.map((pair, i) => (
                <InteractionPairCard key={`lowrisk-${i}`} result={pair} />
              ))}
            </div>
          </section>
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
              <span className="badge text-[10px] bg-info/20 text-info border-info/40">
                {result.crossTolerances.length}
              </span>
            </div>
            <div className="space-y-2">
              {result.crossTolerances.map((ct, i) => (
                <div key={`ct-${i}`} className="card card-transparent border-info/20">
                  <div className="card-body p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge badge-secondary font-medium text-xs capitalize">
                        {ct.tolerance}
                      </span>
                      <span className="text-xs text-neutral-content">shared by</span>
                      {ct.substances.map((sub, j) => (
                        <span key={j} className="flex items-center gap-1">
                          {j > 0 && (
                            <span className="text-neutral-content text-xs">&bull;</span>
                          )}
                          <span className="badge badge-outline text-xs">
                            {sub}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-content mt-2 leading-relaxed">
              Cross-tolerance means tolerance to one substance in a pharmacological class reduces responsiveness to other substances in that class.
            </p>
          </section>
        </>
      )}

      {/* Disclaimer */}
      <div className="divider" />
      <div className="alert alert-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div>
          <h3 className="font-bold text-xs">Disclaimer</h3>
          <p className="text-[11px] leading-relaxed">
            Interaction data sourced from TripSit&apos;s community-maintained database. Absence of a known interaction does not guarantee safety. Always perform independent research and consult healthcare professionals.
          </p>
        </div>
      </div>
    </div>
  )
}
