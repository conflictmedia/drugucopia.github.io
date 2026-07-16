import { afterEach, describe, expect, test } from 'bun:test'
import { clearSubstanceRepositoryCache, loadSubstanceDetail, loadSubstanceIndex } from './substance-repository'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
  clearSubstanceRepositoryCache()
})

describe('lazy substance repository', () => {
  test('loads and caches the compact index', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      return new Response(JSON.stringify({ version: 1, generatedAt: '2026-01-01', substances: [] }))
    }) as unknown as typeof fetch
    const [first, second] = await Promise.all([loadSubstanceIndex(), loadSubstanceIndex()])
    expect(first).toBe(second)
    expect(calls).toBe(1)
  })

  test('deduplicates concurrent detail requests and evicts failures', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      if (calls === 1) return new Response('failure', { status: 500 })
      return new Response(JSON.stringify({ id: 'caffeine', name: 'Caffeine' }))
    }) as unknown as typeof fetch

    await expect(loadSubstanceDetail('caffeine')).rejects.toThrow()
    expect((await loadSubstanceDetail('caffeine')).id).toBe('caffeine')
    expect(calls).toBe(2)
  })
})

