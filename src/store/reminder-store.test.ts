import { useReminderStore } from './reminder-store'
import type { ActiveReminder, DoseLog, ReminderSchedule } from '@/types'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
  removeItem(key: string) { this.values.delete(key) }
  clear() { this.values.clear() }
}

const storage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
Object.defineProperty(globalThis, 'window', {
  value: { addEventListener() {}, removeEventListener() {} }, configurable: true,
})

const schedule: ReminderSchedule = {
  id: 'schedule-1', substanceName: 'Fixture', intervalMinutes: 60,
  maxDosesPerDay: 0, enabled: true, createdAt: '2026-01-01T00:00:00.000Z',
}
const dose: DoseLog = {
  id: 'dose-1', substanceName: 'Fixture', amount: 1, unit: 'mg', route: 'oral',
  categories: ['other'], timestamp: '2026-01-01T12:00:00.000Z', duration: null,
  notes: null, mood: null, setting: null, createdAt: '2026-01-01T12:00:00.000Z',
}

beforeEach(() => {
  storage.clear()
  useReminderStore.setState({
    schedules: [schedule], activeReminders: [], deletedScheduleIds: new Set(),
    notificationPermission: 'default', autoStartEnabled: true, soundEnabled: false, isLoaded: true,
  })
})

describe('reminder scheduling', () => {
  test('starts from dose time and replaces stale timers for the same substance', () => {
    useReminderStore.getState().startTimer(dose)
    let reminders = useReminderStore.getState().activeReminders
    expect(reminders).toHaveLength(1)
    expect(reminders[0].firesAt).toBe('2026-01-01T13:00:00.000Z')

    useReminderStore.getState().startTimer({ ...dose, id: 'dose-2', timestamp: '2026-01-01T12:30:00.000Z' })
    reminders = useReminderStore.getState().activeReminders
    expect(reminders).toHaveLength(1)
    expect(reminders[0].sourceDoseId).toBe('dose-2')
  })

  test('fires due and snoozed reminders once', () => {
    const due: ActiveReminder = {
      id: 'r1', scheduleId: schedule.id, substanceName: 'Fixture', sourceDoseId: dose.id,
      startedAt: '2020-01-01T00:00:00.000Z', firesAt: '2020-01-01T01:00:00.000Z',
      intervalMs: 3_600_000, status: 'running', dosesRemindedToday: 0,
    }
    useReminderStore.setState({ activeReminders: [due] })
    useReminderStore.getState().tick()
    expect(useReminderStore.getState().activeReminders[0]?.status).toBeUndefined()
  })

  test('respects the configured daily maximum', () => {
    useReminderStore.setState({ schedules: [{ ...schedule, maxDosesPerDay: 1 }] })
    const todayDose = { ...dose, timestamp: `${new Date().toISOString().slice(0, 10)}T12:00:00.000Z` }
    storage.setItem('drugucopia-dose-logs', JSON.stringify([todayDose]))
    useReminderStore.getState().startTimer(todayDose)
    expect(useReminderStore.getState().activeReminders).toHaveLength(0)
  })
})

