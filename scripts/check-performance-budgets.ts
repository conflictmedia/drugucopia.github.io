import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const budgets = await Bun.file(resolve(root, 'performance-budgets.json')).json()

async function filesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? filesRecursively(path) : [path]
  }))
  return nested.flat()
}

const chunkRoot = resolve(root, 'out', '_next', 'static', 'chunks')
const chunks = (await filesRecursively(chunkRoot)).filter((file) => file.endsWith('.js'))
const sizes = await Promise.all(chunks.map(async (file) => ({ file, bytes: (await stat(file)).size })))
const largest = sizes.reduce((max, item) => item.bytes > max.bytes ? item : max, { file: '', bytes: 0 })
const total = sizes.reduce((sum, item) => sum + item.bytes, 0)

const dataRoot = resolve(root, 'public', 'data', 'substances')
const summaryBytes = (await stat(resolve(dataRoot, 'index.json'))).size
const details = (await filesRecursively(resolve(dataRoot, 'details'))).filter((file) => file.endsWith('.json'))
const detailSizes = await Promise.all(details.map(async (file) => ({ file, bytes: (await stat(file)).size })))
const largestDetail = detailSizes.reduce((max, item) => item.bytes > max.bytes ? item : max, { file: '', bytes: 0 })

const failures: string[] = []
if (largest.bytes > budgets.javascript.maxChunkBytes) failures.push(`largest JS chunk ${largest.bytes} > ${budgets.javascript.maxChunkBytes}`)
if (total > budgets.javascript.maxTotalBytes) failures.push(`total JS ${total} > ${budgets.javascript.maxTotalBytes}`)
if (summaryBytes > budgets.substanceData.maxSummaryBytes) failures.push(`substance summary ${summaryBytes} > ${budgets.substanceData.maxSummaryBytes}`)
if (largestDetail.bytes > budgets.substanceData.maxDetailBytes) failures.push(`largest substance detail ${largestDetail.bytes} > ${budgets.substanceData.maxDetailBytes}`)

console.log(`JS: ${chunks.length} chunks, ${total} total bytes, ${largest.bytes} largest`)
console.log(`Substance data: ${summaryBytes} summary bytes, ${largestDetail.bytes} largest detail bytes`)
if (failures.length) {
  failures.forEach((failure) => console.error(`budget exceeded: ${failure}`))
  process.exit(1)
}

