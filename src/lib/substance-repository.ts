import type { Substance, SubstanceCategory } from "./substances/types";

export interface SubstanceSummary {
  id: string;
  name: string;
  commonNames: string[];
  aliases: string[];
  categories: SubstanceCategory[];
  class: string;
  description: string;
  riskLevel: Substance["riskLevel"];
  defaultUnit: string | null;
  routes: string[];
}

interface SubstanceIndexPayload {
  version: 1;
  generatedAt: string;
  substances: SubstanceSummary[];
}

const detailCache = new Map<string, Promise<Substance>>();
let indexRequest: Promise<SubstanceIndexPayload> | null = null;

function dataUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}/data/substances/${path}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to load substance data (${response.status})`);
  return response.json() as Promise<T>;
}

/** Load the compact catalogue used by search and selection interfaces. */
export function loadSubstanceIndex(): Promise<SubstanceIndexPayload> {
  indexRequest ??= fetchJson<SubstanceIndexPayload>(dataUrl("index.json"));
  return indexRequest;
}

/** Load one complete record on demand; concurrent requests are deduplicated. */
export function loadSubstanceDetail(id: string): Promise<Substance> {
  let request = detailCache.get(id);
  if (!request) {
    request = fetchJson<Substance>(
      dataUrl(`details/${encodeURIComponent(id)}.json`),
    );
    detailCache.set(id, request);
    request.catch(() => detailCache.delete(id));
  }
  return request;
}

export interface SubstanceSummarySearchResult {
  substance: SubstanceSummary;
  score: number;
  matchField: string;
}

const normalizeSearchText = (value: string) =>
  value.toLowerCase().replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();

/** Search the compact catalogue without importing full substance records. */
export function searchSubstanceSummaries(
  summaries: SubstanceSummary[],
  query: string,
  limit = 20,
): SubstanceSummarySearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const results: SubstanceSummarySearchResult[] = [];
  for (const substance of summaries) {
    const fields: Array<{
      value: string;
      field: string;
      exact: number;
      prefix: number;
      contains: number;
    }> = [
      {
        value: substance.id,
        field: "id",
        exact: 1,
        prefix: 0.95,
        contains: 0.85,
      },
      {
        value: substance.name,
        field: "name",
        exact: 1,
        prefix: 0.9,
        contains: 0.8,
      },
      ...substance.commonNames.map((value) => ({
        value,
        field: value,
        exact: 0.88,
        prefix: 0.78,
        contains: 0.65,
      })),
      ...substance.aliases.map((value) => ({
        value,
        field: value,
        exact: 0.87,
        prefix: 0.7,
        contains: 0.6,
      })),
      {
        value: substance.class,
        field: "class",
        exact: 0.55,
        prefix: 0.52,
        contains: 0.5,
      },
      {
        value: substance.description,
        field: "description",
        exact: 0.32,
        prefix: 0.31,
        contains: 0.3,
      },
    ];
    let best: SubstanceSummarySearchResult | null = null;
    for (const candidate of fields) {
      const value = normalizeSearchText(candidate.value);
      const score =
        value === normalizedQuery
          ? candidate.exact
          : value.startsWith(normalizedQuery)
            ? candidate.prefix
            : value.includes(normalizedQuery)
              ? candidate.contains
              : 0;
      if (score > (best?.score ?? 0))
        best = { substance, score, matchField: candidate.field };
    }
    if (best) results.push(best);
  }
  return results
    .sort(
      (a, b) =>
        b.score - a.score || a.substance.name.localeCompare(b.substance.name),
    )
    .slice(0, limit);
}

export function clearSubstanceRepositoryCache(): void {
  indexRequest = null;
  detailCache.clear();
}
