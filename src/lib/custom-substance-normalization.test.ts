import { getAllSubstances, getSubstanceByIdAll, searchSubstancesRankedAll } from './substances/index'
import { checkInteractions } from './interaction-checker'

const storage = new Map<string, string>()
const mockStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
}

// Properly mock localStorage for both globalThis and window
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true, writable: true })
;(globalThis as any).window = { localStorage: mockStorage, navigator: {} }
;(globalThis as any).localStorage = mockStorage

afterEach(() => storage.clear())

describe('custom substance normalization', () => {
  test('upgrades the persisted compact custom shape at the read boundary', () => {
    localStorage.setItem('drugucopia-custom-substances', JSON.stringify([{
      id: 'custom-one', name: 'Custom One', description: 'Fixture', category: 'other',
      customData: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01',
    }]))

    const custom = getSubstanceByIdAll('custom-one')!
    expect(custom.categories).toEqual(['other'])
    expect(custom.commonNames).toEqual([])
    expect(custom.effects).toEqual({ positive: [], neutral: [], negative: [] })
    expect(custom.interactions).toEqual({ dangerous: [], unsafe: [], uncertain: [], crossTolerances: [] })
    expect(custom.chemistry).toEqual({ formula: '', molecularWeight: '', class: '' })
    expect(getAllSubstances().some((item) => item.id === 'custom-one')).toBe(true)
  })

  test('can be searched and interaction-checked without crashing', () => {
    localStorage.setItem('drugucopia-custom-substances', JSON.stringify([{
      id: 'custom-one', name: 'Custom One', description: 'Fixture', category: 'other', customData: {},
    }]))
    expect(searchSubstancesRankedAll('Custom One')[0].substance.id).toBe('custom-one')
    expect(() => checkInteractions(['custom-one', 'caffeine'])).not.toThrow()
  })
})