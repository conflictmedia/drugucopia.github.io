import { afterEach, describe, expect, test } from 'bun:test'
import { searchSubstancesRanked, searchSubstancesRankedAll } from './substances/index'
import type { Substance } from './substances/types'

const custom: Substance = {
  id: 'custom-fixture', name: 'Custom Fixture', commonNames: ['Fixture Alias'], categories: ['other'],
  class: 'test class', description: 'Search parity fixture', effects: { positive: [], neutral: [], negative: [] },
  interactions: { dangerous: [], unsafe: [], uncertain: [], crossTolerances: [] }, harmReduction: [],
  legality: 'unknown', chemistry: { formula: '', molecularWeight: '', class: '' }, history: null,
  afterEffects: '', riskLevel: 'low', aliases: ['CFX'],
}

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  configurable: true,
})

afterEach(() => storage.clear())

describe('substance search parity', () => {
  test('preserves built-in ranking when no custom records exist', () => {
    const builtIn = searchSubstancesRanked('caffeine', { limit: 5 })
    const combined = searchSubstancesRankedAll('caffeine', { limit: 5 })
    expect(combined.map((item) => item.substance.id)).toEqual(builtIn.map((item) => item.substance.id))
  })

  test('searches custom names, aliases, classes, and descriptions', () => {
    localStorage.setItem('drugucopia-custom-substances', JSON.stringify([custom]))
    for (const query of ['Custom Fixture', 'Fixture Alias', 'CFX', 'test class', 'parity fixture']) {
      expect(searchSubstancesRankedAll(query, { limit: 20 }).some((item) => item.substance.id === custom.id)).toBe(true)
    }
  })
})

