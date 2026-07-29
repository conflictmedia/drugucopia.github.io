import {
  clearSubstanceRepositoryCache,
  loadSubstanceDetail,
  loadSubstanceIndex,
  searchSubstanceSummaries,
  type SubstanceSummary,
} from "./substance-repository";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  clearSubstanceRepositoryCache();
});

describe("lazy substance repository", () => {
  test("loads and caches the compact index", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(
        JSON.stringify({
          version: 1,
          generatedAt: "2026-01-01",
          substances: [],
        }),
      );
    }) as unknown as typeof fetch;
    const [first, second] = await Promise.all([
      loadSubstanceIndex(),
      loadSubstanceIndex(),
    ]);
    expect(first).toBe(second);
    expect(calls).toBe(1);
  });

  test("ranks compact records by ID, name, alias, and class", () => {
    const summary: SubstanceSummary = {
      id: "caffeine",
      name: "Caffeine",
      commonNames: ["Coffee alkaloid"],
      aliases: ["1,3,7-TMX"],
      categories: ["stimulants"],
      class: "Xanthine",
      description: "A common stimulant",
      riskLevel: "low",
      defaultUnit: "mg",
      routes: ["oral"],
    };
    expect(searchSubstanceSummaries([summary], "caffeine")[0].matchField).toBe(
      "id",
    );
    expect(searchSubstanceSummaries([summary], "1,3,7")[0].substance.id).toBe(
      "caffeine",
    );
    expect(
      searchSubstanceSummaries([summary], "xanthine")[0].substance.id,
    ).toBe("caffeine");
  });

  test("does not throw when a summary has missing string fields", () => {
    // Custom substances can produce summaries with undefined `class` or
    // `description` (CustomSubstance has `category` but no `class`). The
    // search function must tolerate that instead of throwing on
    // `undefined.toLowerCase()`.
    const summary = {
      id: "my-custom",
      name: "My Custom",
      commonNames: [],
      aliases: [],
      categories: ["other"],
      // class intentionally missing
      description: "Custom substance description",
      riskLevel: "none" as const,
      defaultUnit: null,
      routes: [],
    } as unknown as SubstanceSummary;
    expect(() => searchSubstanceSummaries([summary], "custom")).not.toThrow();
    expect(searchSubstanceSummaries([summary], "my custom")[0].substance.id).toBe(
      "my-custom",
    );
  });

  test("deduplicates concurrent detail requests and evicts failures", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) return new Response("failure", { status: 500 });
      return new Response(JSON.stringify({ id: "caffeine", name: "Caffeine" }));
    }) as unknown as typeof fetch;

    await expect(loadSubstanceDetail("caffeine")).rejects.toThrow();
    expect((await loadSubstanceDetail("caffeine")).id).toBe("caffeine");
    expect(calls).toBe(2);
  });
});
