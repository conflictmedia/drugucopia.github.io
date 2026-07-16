import type { Substance, SubstanceCategory } from './substances/types'

export interface SubstanceSummary {
  id: string
  name: string
  commonNames: string[]
  aliases: string[]
  categories: SubstanceCategory[]
  class: string
  description: string
  riskLevel: Substance['riskLevel']
  defaultUnit: string | null
  routes: string[]
}

interface SubstanceIndexPayload {
  version: 1
  generatedAt: string
  substances: SubstanceSummary[]
}

const detailCache = new Map<string, Promise<Substance>>()
let indexRequest: Promise<SubstanceIndexPayload> | null = null

function dataUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  return `${basePath}/data/substances/${path}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load substance data (${response.status})`)
  return response.json() as Promise<T>
}

/** Load the compact catalogue used by search and selection interfaces. */
export function loadSubstanceIndex(): Promise<SubstanceIndexPayload> {
  indexRequest ??= fetchJson<SubstanceIndexPayload>(dataUrl('index.json'))
  return indexRequest
}

/** Load one complete record on demand; concurrent requests are deduplicated. */
export function loadSubstanceDetail(id: string): Promise<Substance> {
  let request = detailCache.get(id)
  if (!request) {
    request = fetchJson<Substance>(dataUrl(`details/${encodeURIComponent(id)}.json`))
    detailCache.set(id, request)
    request.catch(() => detailCache.delete(id))
  }
  return request
}

export function clearSubstanceRepositoryCache(): void {
  indexRequest = null
  detailCache.clear()
}

