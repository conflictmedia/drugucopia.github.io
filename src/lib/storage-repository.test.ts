import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { StorageRepository } from './storage-repository'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const schema = z.object({ enabled: z.boolean(), count: z.number().int().nonnegative() })

describe('versioned storage repository', () => {
  test('validates writes and reads versioned envelopes', () => {
    const storage = new MemoryStorage()
    const repository = new StorageRepository('settings', 1, schema, () => ({ enabled: true, count: 0 }), storage)
    repository.write({ enabled: false, count: 2 })
    expect(repository.read()).toEqual({ enabled: false, count: 2 })
    expect(JSON.parse(storage.getItem('settings')!).version).toBe(1)
  })

  test('reads valid legacy values without destructive migration', () => {
    const storage = new MemoryStorage()
    storage.setItem('settings', JSON.stringify({ enabled: false, count: 3 }))
    const repository = new StorageRepository('settings', 1, schema, () => ({ enabled: true, count: 0 }), storage)
    expect(repository.read()).toEqual({ enabled: false, count: 3 })
  })

  test('falls back for corruption, invalid fields, and unsupported versions', () => {
    const storage = new MemoryStorage()
    const repository = new StorageRepository('settings', 1, schema, () => ({ enabled: true, count: 0 }), storage)
    for (const value of ['not json', JSON.stringify({ enabled: 'yes' }), JSON.stringify({ version: 2, data: { enabled: false, count: 1 } })]) {
      storage.setItem('settings', value)
      expect(repository.read()).toEqual({ enabled: true, count: 0 })
    }
  })
})

