import { describe, expect, test } from 'bun:test'
import { ETHANOL_DENSITY_G_PER_ML, gramsToShots, shotsToGrams } from './alcohol'
import { BENZODIAZEPINES, convertDose, getDiazepamEquivalent } from './benzo-equivalence'

describe('alcohol conversion', () => {
  test('matches the physical ethanol formula and round-trips', () => {
    const result = shotsToGrams({ shots: 1, shotVolumeMl: 44.36025, abv: 40 })!
    expect(result.ethanolGrams).toBeCloseTo(44.36025 * 0.4 * ETHANOL_DENSITY_G_PER_ML, 8)
    expect(result.standardDrinks.us).toBeCloseTo(1, 2)
    expect(gramsToShots(result.ethanolGrams, 44.36025, 40)).toBeCloseTo(1, 10)
  })

  test('accepts zero consumption but rejects invalid physical inputs', () => {
    expect(shotsToGrams({ shots: 0, shotVolumeMl: 44, abv: 40 })?.ethanolGrams).toBe(0)
    expect(shotsToGrams({ shots: -1, shotVolumeMl: 44, abv: 40 })).toBeNull()
    expect(shotsToGrams({ shots: 1, shotVolumeMl: 0, abv: 40 })).toBeNull()
    expect(shotsToGrams({ shots: 1, shotVolumeMl: 44, abv: 101 })).toBeNull()
    expect(gramsToShots(14, 44, 0)).toBeNull()
  })
})

describe('benzodiazepine equivalence', () => {
  test('converts through the diazepam reference and round-trips', () => {
    expect(convertDose('alprazolam', 0.5, 'diazepam')?.equivalentDose).toBe(10)
    expect(convertDose('diazepam', 10, 'alprazolam')?.equivalentDose).toBe(0.5)
    expect(getDiazepamEquivalent('lorazepam', 1)).toBe(10)
  })

  test('all reference records are internally consistent', () => {
    for (const benzo of BENZODIAZEPINES) {
      expect(benzo.equivalenceMg).toBeGreaterThan(0)
      expect(benzo.potencyRatio).toBeCloseTo(10 / benzo.equivalenceMg, 1)
      expect(benzo.halfLifeHours.max).toBeGreaterThanOrEqual(benzo.halfLifeHours.min)
    }
  })

  test('returns null for unknown records', () => {
    expect(convertDose('unknown', 1, 'diazepam')).toBeNull()
  })
})

