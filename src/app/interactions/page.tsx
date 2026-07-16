'use client'

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Shuffle,
  AlertTriangle,
  Zap,
  Users,
  Pill,
  X,
} from 'lucide-react'
import { InteractionSubstanceSelector } from '@/components/interaction-substance-selector'
import { InteractionResults } from '@/components/interaction-results'
import {
  checkInteractions,
  checkSingleSubstanceInteractions,
} from '@/lib/interaction-checker'
import type { InteractionCheckResult } from '@/lib/interaction-checker'
import {
  useMedicationStore,
  getMedicationsAsSubstances,
  isMedicationSelectorId,
  toMedicationSelectorId,
  getMedicationBySelectorId,
} from '@/store/medication-store'

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function InteractionsPage() {
  return (
    <Suspense>
      <InteractionsPageInner />
    </Suspense>
  )
}

function InteractionsPageInner() {
  const searchParams = useSearchParams()

  /**
   * `selectedIds` mixes two kinds of IDs in a single array:
   *   - built-in substance IDs ("mdma", "lsd", …) — resolved against
   *     the substance database
   *   - namespaced medication IDs ("med-<uuid>") — resolved against
   *     the user's medication profile
   *
   * Medications are NOT auto-prepended to the selection. They are
   * always present in the `extraSubstances` pool that gets passed to
   * `checkInteractions`, so they will be referenced when the user
   * explicitly picks them from the selector or when the URL contains
   * a `med-…` ID. We chose not to auto-select all active medications
   * because that would silently produce a long list of med×med pairs
   * the user didn't ask for. Instead, the UI surfaces them via a
   * one-click "Add all my medications" button below.
   */
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [result, setResult] = useState<InteractionCheckResult | null>(null)

  // Medication store — initialize on mount so we have access to the
  // user's active medications for the "add all" button and for the
  // extraSubstances pool that powers `med-<uuid>` resolution.
  const medications = useMedicationStore(s => s.medications)
  const initializeMedications = useMedicationStore(s => s.initialize)
  useEffect(() => { initializeMedications() }, [initializeMedications])
  const activeMedications = useMemo(
    () => medications.filter(m => m.isActive),
    [medications],
  )

  /**
   * The extras pool — every active medication converted to a Substance
   * shape. Recomputed whenever `medications` changes so newly-added
   * medications show up immediately. Passed to checkInteractions as
   * the second argument so `med-<uuid>` IDs resolve.
   */
  const medicationSubstances = useMemo(
    () => getMedicationsAsSubstances({ onlyActive: true }),
    [medications, activeMedications.length],  
  )

  // Load substances from URL params on mount.
  useEffect(() => {
    const subsParam = searchParams.get('substances')
    if (subsParam) {
      const ids = subsParam
        .split(',')
        .map((s) => s.trim())
        // Don't lowercase — `med-<uuid>` IDs are case-sensitive.
        .filter(Boolean)
      if (ids.length > 0) {
        setSelectedIds(ids)
      }
    }
  }, [searchParams])

  // Run interaction check whenever selection changes (with debounce-like behavior).
  useEffect(() => {
    if (selectedIds.length === 0) {
      setResult(null)
      return
    }

    const timer = setTimeout(() => {
      if (selectedIds.length === 1) {
        const checkResult = checkSingleSubstanceInteractions(
          selectedIds[0],
          medicationSubstances,
        )
        setResult(checkResult)
      } else {
        const checkResult = checkInteractions(
          selectedIds,
          medicationSubstances,
        )
        setResult(checkResult)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedIds, medicationSubstances])

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  /**
   * One-click helper: add all active medications from the medication
   * profile to the current selection. Useful for the common case of
   * "I want to check whether X interacts with my prescriptions".
   * Already-selected medications are skipped to avoid duplicates.
   */
  const addAllMedications = useCallback(() => {
    const medIds = activeMedications.map(m => toMedicationSelectorId(m.id))
    setSelectedIds(prev => {
      const existing = new Set(prev)
      const additions = medIds.filter(id => !existing.has(id))
      return [...prev, ...additions]
    })
  }, [activeMedications])

  const removeMedication = useCallback((medSelectorId: string) => {
    setSelectedIds(prev => prev.filter(id => id !== medSelectorId))
  }, [])

  // Selected medications (for the chips above the selector).
  const selectedMedications = useMemo(
    () => selectedIds
      .filter(isMedicationSelectorId)
      .map(id => ({ id, med: getMedicationBySelectorId(id) }))
      .filter(x => x.med) as { id: string; med: NonNullable<ReturnType<typeof getMedicationBySelectorId>> }[],
    [selectedIds],
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Desktop Content ── */}
      <div className="hidden md:block container mx-auto py-6 lg:py-10 max-w-5xl">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
              <Shuffle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight gradient-text">Interaction Checker</h2>
              <p className="text-neutral-content mt-1">
                Check for drug interactions. Select one substance to see all known
                interactions, or select two or more to check pairwise combinations
                and cross-tolerance information.
              </p>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Two-column layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Selector */}
          <div className="col-span-4">
            <div className="sticky top-20 card card-transparent p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-base-content">Substances</h3>
              </div>

              {/* Active-medication chips.
                  Rendered above the substance selector so the user can
                  see at a glance which of their prescriptions are
                  included in the current check, and remove any of them
                  individually. */}
              {selectedMedications.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-content font-medium">
                    From your medication profile
                  </p>
                  {selectedMedications.map(({ id, med }) => (
                    <div
                      key={id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-info/10 border border-info/30 text-xs"
                    >
                      <Pill className="w-3 h-3 text-info shrink-0" />
                      <span className="truncate flex-1 font-medium">
                        {med.name}
                        {med.dosage && <span className="opacity-70"> · {med.dosage}</span>}
                      </span>
                      {med.medicationType && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-info/20 text-info shrink-0">
                          {med.medicationType}
                        </span>
                      )}
                      <button
                        onClick={() => removeMedication(id)}
                        aria-label={`Remove ${med.name}`}
                        className="p-0.5 rounded hover:bg-info/20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <InteractionSubstanceSelector
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
              />

              {/* Quick-add: medications.
                  Surfaces the user's active medication profile as
                  one-click buttons (and an "add all" shortcut) so
                  they don't have to search for each prescription. */}
              {activeMedications.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-neutral-content mb-2 font-medium flex items-center gap-1">
                    <Pill className="h-3 w-3" />
                    Your active medications:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeMedications.map(m => {
                      const selId = toMedicationSelectorId(m.id)
                      const isSelected = selectedIds.includes(selId)
                      return (
                        <button
                          key={m.id}
                          onClick={() =>
                            isSelected
                              ? removeMedication(selId)
                              : handleSelectionChange([...selectedIds, selId])
                          }
                          className={`btn btn-sm gap-1 text-xs border ${
                            isSelected
                              ? 'btn-info border-info/40'
                              : 'btn-ghost border-white/10 hover:border-info/30'
                          }`}
                          title={m.dosage ? `${m.name} · ${m.dosage}` : m.name}
                        >
                          <Pill className="h-3 w-3" />
                          {m.name}
                          {m.medicationType && (
                            <span className="text-[10px] opacity-70">({m.medicationType})</span>
                          )}
                        </button>
                      )
                    })}
                    {activeMedications.length > 1 && (
                      <button
                        onClick={addAllMedications}
                        className="btn btn-sm btn-ghost border border-primary/30 gap-1 text-xs text-primary hover:bg-primary/10"
                      >
                        <Zap className="h-3 w-3" />
                        Add all
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Quick-add popular combos */}
              <div className="mt-6">
                <p className="text-xs text-neutral-content mb-2 font-medium">Quick check:</p>
                <div className="flex flex-wrap gap-1.5">
                  <QuickCombo
                    label="Alcohol + MDMA"
                    ids={['alcohol', 'mdma']}
                    onClick={handleSelectionChange}
                  />
                  <QuickCombo
                    label="Alcohol + Benzos"
                    ids={['alcohol', 'diazepam']}
                    onClick={handleSelectionChange}
                  />
                  <QuickCombo
                    label="Cocaine + Alcohol"
                    ids={['cocaine', 'alcohol']}
                    onClick={handleSelectionChange}
                  />
                  <QuickCombo
                    label="Ketamine + Cocaine"
                    ids={['ketamine', 'cocaine']}
                    onClick={handleSelectionChange}
                  />
                  <QuickCombo
                    label="LSD + Cannabis"
                    ids={['lsd', 'cannabis']}
                    onClick={handleSelectionChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="col-span-8">
            <InteractionResults
              result={result}
              selectedCount={selectedIds.length}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile Content ── */}
      <div className="md:hidden flex-1 overflow-y-auto safe-area-pb-min">
        {/* Hero */}
        <div className="px-4 pt-4 pb-3 border-b border-white/8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
              <Shuffle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold gradient-text">Interaction Checker</h2>
              <p className="text-xs text-neutral-content mt-0.5">
                Check interactions for one or more substances
              </p>
            </div>
          </div>
        </div>

        {/* Selector */}
        <section className="px-4 py-4 border-b border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Substances</h3>
          </div>

          {/* Mobile: same medication chips & quick-add as desktop. */}
          {selectedMedications.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-neutral-content font-medium">
                From your medication profile
              </p>
              {selectedMedications.map(({ id, med }) => (
                <div
                  key={id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-info/10 border border-info/30 text-xs"
                >
                  <Pill className="w-3 h-3 text-info shrink-0" />
                  <span className="truncate flex-1 font-medium">{med.name}</span>
                  {med.medicationType && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-info/20 text-info shrink-0">
                      {med.medicationType}
                    </span>
                  )}
                  <button
                    onClick={() => removeMedication(id)}
                    aria-label={`Remove ${med.name}`}
                    className="p-0.5 rounded hover:bg-info/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <InteractionSubstanceSelector
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
          />

          {/* Mobile: medications quick-add */}
          {activeMedications.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-neutral-content mb-2 font-medium flex items-center gap-1">
                <Pill className="h-3 w-3" />
                Your active medications:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeMedications.map(m => {
                  const selId = toMedicationSelectorId(m.id)
                  const isSelected = selectedIds.includes(selId)
                  return (
                    <button
                      key={m.id}
                      onClick={() =>
                        isSelected
                          ? removeMedication(selId)
                          : handleSelectionChange([...selectedIds, selId])
                      }
                      className={`btn btn-sm gap-1 text-xs border ${
                        isSelected
                          ? 'btn-info border-info/40'
                          : 'btn-ghost border-white/10 hover:border-info/30'
                      }`}
                      title={m.dosage ? `${m.name} · ${m.dosage}` : m.name}
                    >
                      <Pill className="h-3 w-3" />
                      {m.name}
                    </button>
                  )
                })}
                {activeMedications.length > 1 && (
                  <button
                    onClick={addAllMedications}
                    className="btn btn-sm btn-ghost border border-primary/30 gap-1 text-xs text-primary hover:bg-primary/10"
                  >
                    <Zap className="h-3 w-3" />
                    Add all
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick combos */}
          <div className="mt-4">
            <p className="text-xs text-neutral-content mb-2 font-medium">Quick check:</p>
            <div className="flex flex-wrap gap-1.5">
              <QuickCombo
                label="Alcohol + MDMA"
                ids={['alcohol', 'mdma']}
                onClick={handleSelectionChange}
              />
              <QuickCombo
                label="Alcohol + Benzos"
                ids={['alcohol', 'diazepam']}
                onClick={handleSelectionChange}
              />
              <QuickCombo
                label="LSD + Cannabis"
                ids={['lsd', 'cannabis']}
                onClick={handleSelectionChange}
              />
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="px-4 py-4">
          <InteractionResults
            result={result}
            selectedCount={selectedIds.length}
          />
        </section>
      </div>
    </div>
  )
}

// ─── QUICK COMBO BUTTON ─────────────────────────────────────────────────────

function QuickCombo({
  label,
  ids,
  onClick,
}: {
  label: string
  ids: string[]
  onClick: (ids: string[]) => void
}) {
  return (
    <button
      onClick={() => onClick(ids)}
      className="btn btn-sm btn-ghost border border-white/10 hover:border-primary/30 gap-1 text-xs text-neutral-content hover:text-base-content card-lift"
    >
      <Zap className="h-3 w-3" />
      {label}
    </button>
  )
}
