
import type { Substance } from './substances/types'

export type EvidenceConfidence = 'high' | 'moderate' | 'low' | 'unknown'
export type ReviewStatus = 'reviewed' | 'legacy-unreviewed'

export interface SubstanceProvenance {
  substanceId: string
  sources: Array<{ label: string; url: string }>
  reviewStatus: ReviewStatus
  lastReviewed: string | null
  evidenceConfidence: EvidenceConfidence
}

/**
 * Exposes honest provenance for legacy records. Existing source links are
 * retained, while records without a documented review are explicitly marked
 * unreviewed/unknown rather than implying clinical verification.
 */
export function getSubstanceProvenance(substance: Substance): SubstanceProvenance {
  const sources: SubstanceProvenance['sources'] = []
  if (substance.psychonautWikiUrl) sources.push({ label: 'PsychonautWiki', url: substance.psychonautWikiUrl })
  if (substance.wikipediaUrl) sources.push({ label: 'Wikipedia', url: substance.wikipediaUrl })
  return {
    substanceId: substance.id,
    sources,
    reviewStatus: 'legacy-unreviewed',
    lastReviewed: null,
    evidenceConfidence: 'unknown',
  }
}
