import { describe, expect, test } from 'bun:test'
import {
  classifyLeafDose,
  extractToLeaf,
  formatGrams,
  getConcentrationFactor,
  getSpectrumPosition,
  leafToExtract,
  percentToRatio,
  ratioToPercent,
} from './kratom-calculator-logic'

describe('kratom conversion math', () => {
  test('percent and ratio conversions round-trip', () => {
    expect(percentToRatio(15, 1.5)).toBe(10)
    expect(ratioToPercent(10, 1.5)).toBe(15)
  })

  test('leaf and extract equivalents round-trip', () => {
    const extract = leafToExtract(5, 10)
    expect(extract).toBeCloseTo(0.5)
    expect(extractToLeaf(extract, 10)).toBeCloseTo(5)
  })

  test('rejects non-positive concentration factors safely', () => {
    expect(getConcentrationFactor('percent', 0, 1.5)).toBe(0)
    expect(getConcentrationFactor('ratio', -1, 1.5)).toBe(0)
    expect(leafToExtract(5, 0)).toBe(0)
  })

  test('classifies exact tier boundaries conservatively', () => {
    expect(classifyLeafDose(0.999)).toBeNull()
    expect(classifyLeafDose(1)?.name).toBe('Threshold')
    expect(classifyLeafDose(2)?.name).toBe('Light')
    expect(classifyLeafDose(3)?.name).toBe('Common')
    expect(classifyLeafDose(6)?.name).toBe('Strong')
    expect(classifyLeafDose(8)?.name).toBe('Heavy')
  })

  test('caps the visual marker and formats small quantities', () => {
    expect(getSpectrumPosition(100)).toBe(105)
    expect(formatGrams(0.009)).toBe('0.009')
    expect(formatGrams(0.5)).toBe('0.50')
    expect(formatGrams(2)).toBe('2.0')
  })
})

