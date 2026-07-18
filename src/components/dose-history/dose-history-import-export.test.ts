import { buildPreview, parseCSV, serializeDosesToCSV } from './dose-history-import-export'
import type { DoseLog } from '@/types'

const dose: DoseLog = {
  id: 'dose-1',
  timestamp: '2026-07-16T12:34:56',
  substanceName: 'Fixture, Extended',
  categories: ['other', 'medications'],
  amount: 12.5,
  unit: 'mg',
  route: 'oral',
  duration: { onset: '1 hour', comeup: '1 hour', peak: '2 hours', offset: '1 hour', total: '5 hours' },
  mood: 'calm',
  setting: 'home',
  notes: 'Quoted "note", with comma',
  createdAt: '2026-07-16T12:34:56.000Z',
  updatedAt: '2026-07-16T12:34:56.000Z',
}

describe('dose CSV import/export', () => {
  test('round-trips exported user-visible fields', () => {
    const csv = serializeDosesToCSV([dose])
    const parsed = parseCSV(csv)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const imported = parsed.doses[0]
    expect(imported.substanceName).toBe(dose.substanceName)
    expect(imported.categories).toEqual(dose.categories)
    expect(imported.amount).toBe(dose.amount)
    expect(imported.unit).toBe(dose.unit)
    expect(imported.route).toBe(dose.route)
    expect(imported.duration?.total).toBe(dose.duration?.total)
    expect(imported.mood).toBe(dose.mood)
    expect(imported.setting).toBe(dose.setting)
    expect(imported.notes).toBe(dose.notes)
  })

  test('rejects missing columns, malformed dates, and non-positive amounts', () => {
    expect(parseCSV('Date,Time\n2026-01-01,12:00').ok).toBe(false)
    expect(parseCSV('Date,Time,Substance,Amount,Unit,Route\nnope,12:00,X,1,mg,oral').ok).toBe(false)
    expect(parseCSV('Date,Time,Substance,Amount,Unit,Route\n2026-01-01,12:00,X,0,mg,oral').ok).toBe(false)
  })

  test('computes duplicate preview counts', () => {
    const preview = buildPreview({ doses: [dose, { ...dose, id: 'dose-2' }] }, 'doses.csv', [dose])
    expect(preview.duplicateCount).toBe(1)
    expect(preview.newCount).toBe(1)
  })
})

