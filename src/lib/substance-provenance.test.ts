import { substances } from './substances/index'
import { getSubstanceProvenance } from './substance-provenance'

describe('substance provenance', () => {
  test('provides a transparent provenance record for every substance', () => {
    const records = substances.map(getSubstanceProvenance)
    expect(records).toHaveLength(substances.length)
    expect(new Set(records.map((record) => record.substanceId)).size).toBe(substances.length)
    for (const record of records) {
      expect(record.reviewStatus).toBe('legacy-unreviewed')
      expect(record.evidenceConfidence).toBe('unknown')
      for (const source of record.sources) expect(() => new URL(source.url)).not.toThrow()
    }
  })
})

