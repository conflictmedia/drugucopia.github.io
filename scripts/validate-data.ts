import { substances } from '../src/lib/substances/index'
import { tripsitLookup } from '../src/lib/tripsit-combos/index'
import type { RouteDosageDuration, SubstanceCategory } from '../src/lib/substances/types'

const errors: string[] = []
const warnings: string[] = []
const categories = new Set<SubstanceCategory>([
  'stimulants', 'depressants', 'hallucinogens', 'dissociatives', 'empathogens',
  'cannabinoids', 'opioids', 'deliriants', 'nootropics', 'other', 'medications',
])
const riskLevels = new Set(['none', 'low', 'moderate', 'high', 'very-high'])
const dosageKeys: Array<keyof RouteDosageDuration['dosage']> = ['threshold', 'light', 'common', 'strong', 'heavy']
const durationKeys: Array<keyof RouteDosageDuration['duration']> = ['onset', 'comeup', 'peak', 'offset', 'total', 'afterglow']

function requiredString(value: unknown, path: string) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${path} must be a non-empty string`)
}

function stringArray(value: unknown, path: string) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    errors.push(`${path} must be a string array`)
  }
}

const ids = new Set<string>()
const normalizedNames = new Map<string, string>()
for (const substance of substances) {
  const path = `substance:${substance.id || '<missing-id>'}`
  requiredString(substance.id, `${path}.id`)
  requiredString(substance.name, `${path}.name`)
  requiredString(substance.class, `${path}.class`)
  if (typeof substance.description !== 'string') errors.push(`${path}.description must be a string`)
  else if (substance.description.trim() === '') warnings.push(`${path}.description is empty`)

  if (ids.has(substance.id)) errors.push(`duplicate substance id: ${substance.id}`)
  ids.add(substance.id)

  const normalizedName = substance.name.toLowerCase().trim()
  const priorId = normalizedNames.get(normalizedName)
  if (priorId && priorId !== substance.id) errors.push(`duplicate normalized name: ${substance.name} (${priorId}, ${substance.id})`)
  normalizedNames.set(normalizedName, substance.id)

  if (!Array.isArray(substance.categories) || substance.categories.length === 0) {
    errors.push(`${path}.categories must not be empty`)
  } else {
    for (const category of substance.categories) {
      if (!categories.has(category)) errors.push(`${path}.categories contains unknown value: ${category}`)
    }
  }

  if (!riskLevels.has(substance.riskLevel)) errors.push(`${path}.riskLevel is invalid: ${substance.riskLevel}`)
  stringArray(substance.commonNames, `${path}.commonNames`)
  stringArray(substance.harmReduction, `${path}.harmReduction`)
  if (substance.aliases) stringArray(substance.aliases, `${path}.aliases`)
  stringArray(substance.effects?.positive, `${path}.effects.positive`)
  stringArray(substance.effects?.neutral, `${path}.effects.neutral`)
  stringArray(substance.effects?.negative, `${path}.effects.negative`)

  for (const key of ['dangerous', 'unsafe', 'uncertain', 'crossTolerances'] as const) {
    stringArray(substance.interactions?.[key], `${path}.interactions.${key}`)
  }

  for (const [route, data] of Object.entries(substance.routeData ?? {})) {
    const routePath = `${path}.routeData.${route}`
    requiredString(route, `${routePath}.route`)
    for (const key of dosageKeys) requiredString(data.dosage?.[key], `${routePath}.dosage.${key}`)
    for (const key of durationKeys) requiredString(data.duration?.[key], `${routePath}.duration.${key}`)
  }

  if (!substance.psychonautWikiUrl && !substance.wikipediaUrl) {
    warnings.push(`${path} has no external reference URL`)
  }
}

const allowedStatuses = new Set(['Dangerous', 'Unsafe', 'Caution', 'Low Risk & Synergy', 'Low Risk & No Synergy', 'Low Risk & Decrease'])
for (const [key, combo] of Object.entries(tripsitLookup)) {
  const expectedKey = [combo.drugA.toLowerCase(), combo.drugB.toLowerCase()].sort().join('|')
  if (key !== expectedKey) errors.push(`TripSit key ${key} does not match ${expectedKey}`)
  if (!allowedStatuses.has(combo.status)) errors.push(`TripSit ${key} has unknown status: ${combo.status}`)
  if (typeof combo.note !== 'string') errors.push(`TripSit:${key}.note must be a string`)
  else if (combo.note.trim() === '') warnings.push(`TripSit:${key}.note is empty`)
  if (!Array.isArray(combo.sources)) errors.push(`TripSit:${key}.sources must be an array`)
  for (const [index, source] of (combo.sources ?? []).entries()) {
    requiredString(source.title, `TripSit:${key}.sources[${index}].title`)
    try {
      new URL(source.url)
    } catch {
      warnings.push(`TripSit:${key}.sources[${index}].url is invalid`)
    }
  }
}

for (const warning of warnings.slice(0, 20)) console.warn(`warning: ${warning}`)
if (warnings.length > 20) console.warn(`warning: ${warnings.length - 20} additional warnings omitted`)

if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`)
  console.error(`\nData validation failed with ${errors.length} error(s) and ${warnings.length} warning(s).`)
  process.exit(1)
}

console.log(`Validated ${substances.length} substances and ${Object.keys(tripsitLookup).length} TripSit combinations (${warnings.length} warning(s)).`)

