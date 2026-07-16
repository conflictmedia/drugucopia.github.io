import type { ZodType } from 'zod'

export interface VersionedEnvelope<T> {
  version: number
  data: T
}

export class StorageRepository<T> {
  constructor(
    private readonly key: string,
    private readonly version: number,
    private readonly schema: ZodType<T>,
    private readonly fallback: () => T,
    private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage,
  ) {}

  read(): T {
    try {
      const raw = this.storage.getItem(this.key)
      if (!raw) return this.fallback()
      const parsed = JSON.parse(raw) as unknown
      // Accept the current envelope and legacy unwrapped values. This permits
      // gradual migration without losing local-first user data.
      if (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed) {
        const envelope = parsed as VersionedEnvelope<unknown>
        if (envelope.version !== this.version) return this.fallback()
        const result = this.schema.safeParse(envelope.data)
        return result.success ? result.data : this.fallback()
      }
      const legacy = this.schema.safeParse(parsed)
      return legacy.success ? legacy.data : this.fallback()
    } catch {
      return this.fallback()
    }
  }

  write(value: T): void {
    const validated = this.schema.parse(value)
    this.storage.setItem(this.key, JSON.stringify({ version: this.version, data: validated }))
  }

  remove(): void {
    this.storage.removeItem(this.key)
  }
}
