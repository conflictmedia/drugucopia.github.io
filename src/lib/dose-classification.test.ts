import {
  calculateIntensityFromDose,
  classifyDose,
} from "./dose-classification";
import type { Substance } from "./types";

function fixture(defaultUnit = "mg"): Substance {
  return {
    id: "fixture",
    name: "Fixture",
    commonNames: [],
    categories: ["other"],
    defaultUnit,
    class: "fixture",
    description: "Fixture",
    effects: { positive: [], neutral: [], negative: [] },
    routeData: {
      oral: {
        dosage: {
          threshold: "1 mg",
          light: "2 mg",
          common: "5 mg",
          strong: "10 mg",
          heavy: "20 mg",
        },
        duration: {
          onset: "1 hour",
          comeup: "1 hour",
          peak: "1 hour",
          offset: "1 hour",
          total: "4 hours",
          afterglow: "—",
        },
      },
    },
    interactions: {
      dangerous: [],
      unsafe: [],
      uncertain: [],
      crossTolerances: [],
    },
    harmReduction: [],
    legality: "unknown",
    chemistry: { formula: "", molecularWeight: "", class: "" },
    history: null,
    afterEffects: "",
    riskLevel: "low",
  };
}

describe("dose classification", () => {
  test("classifies every exact lower boundary", () => {
    const substance = fixture();
    expect(classifyDose(1, "mg", substance, "oral")?.doseClass).toBe(
      "threshold",
    );
    expect(classifyDose(2, "mg", substance, "oral")?.doseClass).toBe("light");
    expect(classifyDose(5, "mg", substance, "oral")?.doseClass).toBe("common");
    expect(classifyDose(10, "mg", substance, "oral")?.doseClass).toBe("strong");
    expect(classifyDose(20, "mg", substance, "oral")?.doseClass).toBe("heavy");
  });

  test("computes common midpoint and bounded relative height", () => {
    const result = classifyDose(7.5, "mg", fixture(), "oral");
    expect(result?.averageCommonDose).toBe(7.5);
    expect(result?.heightRelativeToCommon).toBe(1);
    expect(
      classifyDose(1000, "mg", fixture(), "oral")?.heightRelativeToCommon,
    ).toBe(5);
  });

  test("converts microgram thresholds to the entered unit", () => {
    const substance = fixture("µg");
    const oral = substance.routeData!.oral;
    oral.dosage = {
      threshold: "100 µg",
      light: "200 µg",
      common: "500 µg",
      strong: "1 mg",
      heavy: "2 mg",
    };
    expect(classifyDose(0.5, "mg", substance, "oral")?.doseClass).toBe(
      "common",
    );
  });

  test("returns safe fallbacks for impossible classification", () => {
    expect(classifyDose(0, "mg", fixture(), "oral")).toBeNull();
    expect(classifyDose(5, "mg", fixture(), "missing")).toBeNull();
    expect(
      calculateIntensityFromDose(
        5,
        "mg",
        { ...fixture(), routeData: undefined },
        "oral",
      ),
    ).toBe(5);
  });

  test("maps classes to monotonic intensity values", () => {
    const substance = fixture();
    const values = [1, 2, 5, 10, 20].map((amount) =>
      calculateIntensityFromDose(amount, "mg", substance, "oral"),
    );
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(values[0]).toBeGreaterThanOrEqual(1);
    expect(values.at(-1)).toBeLessThanOrEqual(10);
  });
});
