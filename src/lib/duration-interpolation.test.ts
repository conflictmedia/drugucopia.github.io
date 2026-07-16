import { describe, expect, test } from 'bun:test'
import { getDurationForRoute, interpolateDuration, normaliseRoute } from './duration-interpolation'
import type { Substance } from './substances/types'

const substance: Substance = {
  id: 'fixture',
  name: 'Fixture',
  commonNames: [],
  categories: ['other'],
  class: 'fixture',
  description: 'Test fixture',
  effects: { positive: [], neutral: [], negative: [] },
  interactions: { dangerous: [], unsafe: [], uncertain: [], crossTolerances: [] },
  harmReduction: [],
  legality: 'unknown',
  chemistry: { formula: '', molecularWeight: '', class: '' },
  history: null,
  afterEffects: '',
  riskLevel: 'low',
  routeData: {
    oral: {
      dosage: { threshold: '', light: '', common: '', strong: '', heavy: '' },
      duration: {
        onset: '30-60 minutes',
        comeup: '30 minutes',
        peak: '2-4 hours',
        offset: '1 hour',
        total: '4-6 hours',
        afterglow: '—',
      },
    },
  },
}

describe('duration interpolation', () => {
  test('normalises common route aliases without partial unknown matches', () => {
    expect(normaliseRoute('PO')).toBe('oral')
    expect(normaliseRoute('snorted')).toBe('insufflated')
    expect(normaliseRoute('IV')).toBe('intravenous')
    expect(normaliseRoute('unknown route')).toBeNull()
  })

  test('returns exact route data without marking it estimated', () => {
    const result = interpolateDuration(substance, 'oral')
    expect(result?.isEstimated).toBe(false)
    expect(result?.total).toBe('4-6 hours')
  })

  test('estimates a supported fallback route and records provenance', () => {
    const result = interpolateDuration(substance, 'sublingual')
    expect(result?.isEstimated).toBe(true)
    expect(result?.sourceRoute).toBe('oral')
    expect(result?.estimationNote).toContain('Sublingual')
    expect(result?.onset).toBe('19–26 minutes')
  })

  test('handles absent substances and route data', () => {
    expect(getDurationForRoute(undefined, 'oral')).toBeNull()
    expect(interpolateDuration({ ...substance, routeData: undefined }, 'oral')).toBeNull()
  })
})

