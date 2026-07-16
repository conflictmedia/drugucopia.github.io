import { create } from "zustand";
import { z } from "zod";
import { StorageRepository } from "@/lib/storage-repository";

export interface CustomSubstance {
  id: string;
  name: string;
  description: string;
  category: string;
  // Dose ranges for different routes (matches RouteDosageDuration structure)
  routeData?: Record<
    string,
    {
      dosage: {
        threshold: string;
        light: string;
        common: string;
        strong: string;
        heavy: string;
      };
      duration: {
        onset: string;
        comeup: string;
        peak: string;
        offset: string;
        total: string;
        afterglow: string;
      };
      notes?: string;
    }
  >;
  customData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CustomSubstanceState {
  substances: CustomSubstance[];
  deletedIds: Set<string>;
  loaded: boolean;
  addSubstance: (sub: CustomSubstance) => void;
  updateSubstance: (id: string, patch: Partial<CustomSubstance>) => void;
  deleteSubstance: (id: string) => void;
  initialize: () => void;
  setSubstancesFromSync: (
    substances: CustomSubstance[],
    deletedIds: Set<string>,
  ) => void;
}

const KEY = "drugucopia-custom-substances";
const DELETED_KEY = "drugucopia-deleted-custom-substances";
const customListSchema = z.custom<CustomSubstance[]>((value) =>
  Array.isArray(value),
);
const deletedListSchema = z.array(z.string());
const repositories = () => ({
  substances: new StorageRepository(KEY, 1, customListSchema, () => []),
  deleted: new StorageRepository(DELETED_KEY, 1, deletedListSchema, () => []),
});

const load = (): CustomSubstance[] => {
  if (typeof window === "undefined") return [];
  return repositories().substances.read();
};

const loadDeleted = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  return new Set(repositories().deleted.read());
};

const save = (list: CustomSubstance[], deletedIds?: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    const repo = repositories();
    repo.substances.write(list);
    if (deletedIds) repo.deleted.write([...deletedIds]);
  } catch {}
};

export const useCustomSubstanceStore = create<CustomSubstanceState>(
  (set, get) => ({
    substances: [],
    deletedIds: new Set(),
    loaded: false,
    initialize: () => {
      if (get().loaded) return;
      set({ substances: load(), deletedIds: loadDeleted(), loaded: true });
    },
    addSubstance: (sub) => {
      const deletedIds = new Set(get().deletedIds);
      deletedIds.delete(sub.id);
      const next = [
        ...get().substances.filter((item) => item.id !== sub.id),
        sub,
      ];
      save(next, deletedIds);
      set({ substances: next, deletedIds });
    },
    updateSubstance: (id, patch) => {
      const next = get().substances.map((s) =>
        s.id === id
          ? { ...s, ...patch, updatedAt: new Date().toISOString() }
          : s,
      );
      save(next);
      set({ substances: next });
    },
    deleteSubstance: (id) => {
      const next = get().substances.filter((s) => s.id !== id);
      const deletedIds = new Set(get().deletedIds).add(id);
      save(next, deletedIds);
      set({ substances: next, deletedIds });
    },
    setSubstancesFromSync: (substances, deletedIds) => {
      save(substances, deletedIds);
      set({ substances, deletedIds, loaded: true });
    },
  }),
);
