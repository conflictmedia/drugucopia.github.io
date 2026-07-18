import { computeStreakInsights } from './analytics'
import type { DoseLog } from '@/types'

function dose(id: string, timestamp: string, substanceName = 'Fixture'): DoseLog {
  return {
    id, timestamp, substanceName, categories: ['other'], amount: 1, unit: 'mg', route: 'oral',
    duration: null, notes: null, mood: null, setting: null, createdAt: timestamp,
  }
}

describe('analytics streaks', () => {
  test('returns stable empty-state metrics', () => {
    expect(computeStreakInsights([])).toEqual({
      currentStreak: 0, longestStreak: 0, currentRestStreak: 0,
      avgDosesPerActiveDay30d: 0, mostActiveDayOfWeek: null, mostActiveHour: null,
      uniqueSubstances: 0, totalActiveDays: 0, totalRestDays: 0,
    })
  })

  test('treats calendar-adjacent days across DST as a continuous streak', () => {
    const previousTimezone = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      const result = computeStreakInsights([
        dose('1', '2026-03-07T12:00:00-05:00'),
        dose('2', '2026-03-08T12:00:00-04:00'),
        dose('3', '2026-03-09T12:00:00-04:00'),
      ])
      expect(result.longestStreak).toBe(3)
      expect(result.totalActiveDays).toBe(3)
    } finally {
      process.env.TZ = previousTimezone
    }
  })

  test('deduplicates multiple doses on one active day', () => {
    const result = computeStreakInsights([
      dose('1', '2026-07-14T08:00:00'),
      dose('2', '2026-07-14T20:00:00'),
    ])
    expect(result.totalActiveDays).toBe(1)
    expect(result.uniqueSubstances).toBe(1)
  })
})

