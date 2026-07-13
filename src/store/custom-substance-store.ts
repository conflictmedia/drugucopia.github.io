import { create } from 'zustand';

export interface CustomSubstance {
  id: string;
  name: string;
  description: string;
  category: string;
  customData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CustomSubstanceState {
  substances: CustomSubstance[];
  loaded: boolean;
  addSubstance: (sub: CustomSubstance) => void;
  updateSubstance: (id: string, patch: Partial<CustomSubstance>) => void;
  deleteSubstance: (id: string) => void;
  initialize: () => void;
}

const KEY = 'drugucopia-custom-substances';

const load = (): CustomSubstance[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

const save = (list: CustomSubstance[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
};

export const useCustomSubstanceStore = create<CustomSubstanceState>((set, get) => ({
  substances: [],
  loaded: false,
  initialize: () => {
    if (get().loaded) return;
    set({ substances: load(), loaded: true });
  },
  addSubstance: (sub) => {
    const next = [...get().substances, sub];
    save(next);
    set({ substances: next });
  },
  updateSubstance: (id, patch) => {
    const next = get().substances.map((s) =>
      s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
    );
    save(next);
    set({ substances: next });
  },
  deleteSubstance: (id) => {
    const next = get().substances.filter((s) => s.id !== id);
    save(next);
    set({ substances: next });
  },
}));
