import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { substances } from '../src/lib/substances/index'

const outputRoot = resolve(import.meta.dir, '..', 'public', 'data', 'substances')
await rm(outputRoot, { recursive: true, force: true })
await mkdir(resolve(outputRoot, 'details'), { recursive: true })

const summaries = substances.map((substance) => ({
  id: substance.id,
  name: substance.name,
  commonNames: substance.commonNames,
  aliases: substance.aliases ?? [],
  categories: substance.categories,
  class: substance.class,
  description: substance.description,
  riskLevel: substance.riskLevel,
  defaultUnit: substance.defaultUnit ?? null,
  routes: substance.routes ?? Object.keys(substance.routeData ?? {}),
}))

await Bun.write(
  resolve(outputRoot, 'index.json'),
  JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), substances: summaries }),
)

await Promise.all(substances.map((substance) =>
  Bun.write(resolve(outputRoot, 'details', `${encodeURIComponent(substance.id)}.json`), JSON.stringify(substance)),
))

console.log(`Generated ${summaries.length} substance summaries and detail records.`)

