"use client";

import { useEffect, useState } from "react";
import {
  loadSubstanceIndex,
  type SubstanceSummary,
} from "@/lib/substance-repository";
import type { Substance } from "@/lib/substances/types";

interface SubstanceIndexState {
  substances: SubstanceSummary[];
  loading: boolean;
  error: Error | null;
}

const CUSTOM_SUBSTANCES_KEY = "drugucopia-custom-substances";

function customSummaries(): SubstanceSummary[] {
  try {
    const stored = JSON.parse(
      localStorage.getItem(CUSTOM_SUBSTANCES_KEY) ?? "[]",
    ) as unknown;
    const records =
      stored && typeof stored === "object" && "data" in stored
        ? (stored as { data: unknown }).data
        : stored;
    if (!Array.isArray(records)) return [];
    return (records as Substance[]).map((substance) => ({
      id: substance.id,
      name: substance.name,
      commonNames: substance.commonNames ?? [],
      aliases: substance.aliases ?? [],
      categories: substance.categories,
      class: substance.class,
      description: substance.description,
      riskLevel: substance.riskLevel,
      defaultUnit: substance.defaultUnit ?? null,
      routes: substance.routes ?? Object.keys(substance.routeData ?? {}),
      source: "custom",
    }));
  } catch {
    return [];
  }
}

export function useSubstanceIndex(): SubstanceIndexState {
  const [state, setState] = useState<SubstanceIndexState>({
    substances: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let builtIn: SubstanceSummary[] = [];
    const publish = () => {
      if (active)
        setState({
          substances: [...builtIn, ...customSummaries()],
          loading: false,
          error: null,
        });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CUSTOM_SUBSTANCES_KEY) publish();
    };
    window.addEventListener("storage", onStorage);

    loadSubstanceIndex().then(
      (payload) => {
        builtIn = payload.substances;
        publish();
      },
      (error: unknown) =>
        active &&
        setState({
          substances: [],
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return state;
}
