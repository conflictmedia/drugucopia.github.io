import { describe, expect, test } from 'bun:test'
import { checkInteractions, checkSingleSubstanceInteractions, getSubstanceInteractions } from './interaction-checker'
import type { Substance } from './substances/types'

function fixture(id: string, name: string, interactions: Partial<Substance['interactions']> = {}): Substance {
  return {
    id,
    name,
    commonNames: [],
    categories: ['other'],
    class: 'fixture',
    description: 'Test fixture',
    effects: { positive: [], neutral: [], negative: [] },
    interactions: {
      dangerous: [], unsafe: [], uncertain: [], crossTolerances: [], ...interactions,
    },
    harmReduction: [], legality: 'unknown',
    chemistry: { formula: '', molecularWeight: '', class: '' },
    history: null, afterEffects: '', riskLevel: 'low',
  }
}

describe('interaction checker', () => {
  test('returns an empty result for unresolved or insufficient selections', () => {
    expect(checkInteractions(['does-not-exist']).summary.total).toBe(0)
    expect(checkSingleSubstanceInteractions('does-not-exist').pairs).toEqual([])
  })

  test('detects directional fallback data and consolidates one pair', () => {
    const alpha = fixture('fixture-alpha', 'Alpha', { dangerous: ['Beta'] })
    const beta = fixture('fixture-beta', 'Beta')
    const result = checkInteractions([alpha.id, beta.id], [alpha, beta])

    expect(result.pairs).toHaveLength(1)
    expect(result.pairs[0].severity).toBe('dangerous')
    expect(result.pairs[0].sources).toContain('substance-a')
    expect(result.summary).toEqual({ dangerous: 1, unsafe: 0, caution: 0, lowRisk: 0, total: 1 })
  })

  test('matches fallback data in either direction', () => {
    const alpha = fixture('fixture-alpha', 'Alpha')
    const beta = fixture('fixture-beta', 'Beta', { unsafe: ['Alpha'] })
    const result = checkInteractions([alpha.id, beta.id], [alpha, beta])
    expect(result.pairs[0]?.severity).toBe('unsafe')
    expect(result.pairs[0]?.sources).toContain('substance-b')
  })

  test('exposes raw interaction lists for custom medication records', () => {
    const medication = fixture('med-1', 'Medication', {
      dangerous: ['MAOIs'], crossTolerances: ['Related medicine'],
    })
    expect(getSubstanceInteractions('med-1', [medication])).toEqual({
      dangerous: ['MAOIs'], unsafe: [], uncertain: [], crossTolerances: ['Related medicine'],
    })
  })
})

