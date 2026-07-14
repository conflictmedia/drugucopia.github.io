'use client'

import { substances, searchSubstancesRanked, getAllSubstances, searchSubstancesRankedAll } from '@/lib/substances/index'
import type { Substance } from '@/lib/substances/types'
import { formatDoseAmount } from '@/lib/utils'
import { parse } from 'date-fns'

/** Match a substance name against the repository (name, id, commonNames, aliases). */
export function findSubstanceMatch(name: string): { name: string; categories: string[] } | null {
  const searchName = name.toLowerCase().trim()

  for (const substance of substances) {
    // Check main name
    if (substance.name.toLowerCase() === searchName) {
      return {
        name: substance.name,
        categories: substance.categories
      }
    }

    // Check ID (for exact matches like "mdma" -> "MDMA")
    if (substance.id.toLowerCase() === searchName) {
      return {
        name: substance.name,
        categories: substance.categories
      }
    }

    // Check common names
    if (substance.commonNames?.some(cn => cn.toLowerCase() === searchName)) {
      return {
        name: substance.name,
        categories: substance.categories
      }
    }

    // Check aliases
    if (substance.aliases?.some(alias => alias.toLowerCase() === searchName)) {
      return {
        name: substance.name,
        categories: substance.categories
      }
    }
  }

  return null
}

/** Get substance lookup map for fast matching. */
export function getSubstanceLookupMap(): Map<string, Substance> {
  const map = new Map<string, Substance>()
  for (const s of substances) {
    map.set(s.name.toLowerCase(), s)
    map.set(s.id.toLowerCase(), s)
    for (const cn of s.commonNames || []) map.set(cn.toLowerCase(), s)
    for (const a of s.aliases || []) map.set(a.toLowerCase(), s)
  }
  return map
}

/** Match a substance name and return its category color classes. */
export function getSubstanceCategoryColor(name: string): string {
  const match = findSubstanceMatch(name)
  if (!match) return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
  
  const cat = match.categories[0]
  const categoryColors: Record<string, string> = {
    stimulants: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    depressants: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    hallucinogens: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    dissociatives: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    empathogens: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    cannabinoids: 'text-green-500 bg-green-500/10 border-green-500/20',
    opioids: 'text-red-500 bg-red-500/10 border-red-500/20',
    deliriants: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    nootropics: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    other: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
    medications: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  }
  return categoryColors[cat] || 'text-gray-500 bg-gray-500/10 border-gray-500/20'
}

/** Parse a date/time string into ISO format for validation. */
export function parseTimestamp(dateStr: string, timeStr?: string): string {
  const date = new Date(`${dateStr}T${timeStr || '00:00:00'}`)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date/time: ${dateStr} ${timeStr || ''}`)
  }
  return date.toISOString()
}

/** Format dose amount + unit for display. */
export function formatDoseDisplay(amount: number, unit: string): { amount: string; unit: string } {
  const formatted = formatDoseAmount(amount, unit)
  return { amount: formatted.amount, unit: formatted.unit }
}