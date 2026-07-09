import { create } from 'zustand'

interface UIState {
  doseLoggerOpen: boolean
  doseLoggerPreselect?: {
    substanceId?: string
    substanceName?: string
    category?: string | string[]
    route?: string
  }
  openDoseLogger: (preselect?: UIState['doseLoggerPreselect']) => void
  closeDoseLogger: () => void
}

export const useUIStore = create<UIState>((set) => ({
  doseLoggerOpen: false,
  doseLoggerPreselect: undefined,

  openDoseLogger: (preselect) => {
    set({ doseLoggerOpen: true, doseLoggerPreselect: preselect })
  },

  closeDoseLogger: () => {
    set({ doseLoggerOpen: false, doseLoggerPreselect: undefined })
  },
}))
