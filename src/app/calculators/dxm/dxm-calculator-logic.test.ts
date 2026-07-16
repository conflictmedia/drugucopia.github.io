import { describe, expect, test } from 'bun:test'
import {
  buildDxmUrl,
  formatGrams,
  getPlateauSpectrumPercent,
  getPlateauStartPercent,
  plateaus,
} from './dxm-calculator-logic'

describe('DXM calculator helpers', () => {
  test('plateau spectrum boundaries are stable', () => {
    expect(getPlateauStartPercent(plateaus[0])).toBe(7.5)
    expect(getPlateauSpectrumPercent(plateaus[3])).toBe(25)
    expect(plateaus[0].rangeMin).toBe(1.5)
    expect(plateaus.at(-1)?.rangeMax).toBe(20)
  })

  test('plateaus are contiguous and ordered', () => {
    for (let index = 1; index < plateaus.length; index++) {
      expect(plateaus[index].rangeMin).toBe(plateaus[index - 1].rangeMax)
      expect(plateaus[index].rangeMax).toBeGreaterThan(plateaus[index].rangeMin)
    }
  })

  test('share URLs omit defaults and encode selected settings', () => {
    expect(buildDxmUrl('', 'lbs', 0)).toBe('')
    expect(buildDxmUrl('70', 'kg', 2)).toBe('weight=70&unit=kg&plateau=2')
  })

  test('formats dose quantities deterministically', () => {
    expect(formatGrams(0.05)).toBe('0.050')
    expect(formatGrams(0.5)).toBe('0.50')
    expect(formatGrams(1)).toBe('1.0')
  })
})

