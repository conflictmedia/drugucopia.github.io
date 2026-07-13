import { create } from 'zustand';
import { getSubstanceByIdAll } from '@/lib/substances/index';
import { checkInteractions } from '@/lib/interaction-checker';

export interface UserMedication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribedFor?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contraindication {
  medicationId: string;
  medicationName: string;
  substanceName: string;
  substanceId: string;
  severity: 'dangerous' | 'unsafe' | 'caution';
  description: string;
  source: 'tripsit' | 'substance-data' | 'manual';
}

interface MedicationState {
  medications: UserMedication[];
  contraindications: Contraindication[];
  loaded: boolean;
  
  initialize: () => void;
  addMedication: (med: UserMedication) => void;
  updateMedication: (id: string, patch: Partial<UserMedication>) => void;
  deleteMedication: (id: string) => void;
  checkContraindications: (substanceIds: string[]) => Contraindication[];
}

const KEY = 'drugucopia-user-medications';

function load(): UserMedication[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function save(list: UserMedication[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export const useMedicationStore = create<MedicationState>((set, get) => ({
  medications: [],
  contraindications: [],
  loaded: false,

  initialize: () => {
    if (get().loaded) return;
    set({ medications: load(), loaded: true });
  },

  addMedication: (med) => {
    const next = [...get().medications, med];
    save(next);
    set({ medications: next });
  },

  updateMedication: (id, patch) => {
    const next = get().medications.map(m => m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m);
    save(next);
    set({ medications: next });
  },

  deleteMedication: (id) => {
    const next = get().medications.filter(m => m.id !== id);
    save(next);
    set({ medications: next });
  },

  checkContraindications: (substanceIds) => {
    const meds = get().medications.filter(m => m.isActive);
    const substanceNames = substanceIds
      .map(id => getSubstanceByIdAll(id)?.name.toLowerCase())
      .filter(Boolean) as string[];
    
    if (substanceNames.length === 0) return [];
    
    const medNames = meds.map(m => m.name.toLowerCase());
    const allNames = [...substanceNames, ...medNames];
    const results = checkInteractions(allNames);
    
    const warnings: Contraindication[] = [];
    for (const pair of results.pairs) {
      const isMedA = medNames.includes(pair.substanceA.toLowerCase());
      const isMedB = medNames.includes(pair.substanceB.toLowerCase());
      
      if ((isMedA || isMedB) && pair.severity !== 'low-risk') {
        const medName = isMedA ? pair.substanceA : pair.substanceB;
        const subName = isMedA ? pair.substanceB : pair.substanceA;
        const med = meds.find(m => m.name.toLowerCase() === medName.toLowerCase());
        
        if (med) {
          const subId = substanceIds.find(id => 
            getSubstanceByIdAll(id)?.name.toLowerCase() === subName.toLowerCase()
          ) || '';
          
          warnings.push({
            medicationId: med.id,
            medicationName: medName,
            substanceName: subName,
            substanceId: subId,
            severity: pair.severity,
            description: pair.description || pair.matchedTerms.join(', '),
            source: pair.sources[0] as Contraindication['source'],
          });
        }
      }
    }
    set({ contraindications: warnings });
    return warnings;
  },
}));