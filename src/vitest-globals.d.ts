/// <reference types="vitest/globals" />

declare const vi: {
  fn: <T extends (...args: any[]) => any>(implementation?: T) => T & { mockReturnValue: (value: any) => any; mockResolvedValue: (value: any) => any; mockRejectedValue: (error: any) => any; mockImplementation: (fn: any) => any; mockClear: () => void; mockReset: () => void; mockRestore: () => void };
  mock: <T>(moduleName: string, factory?: () => T) => any;
  unmock: (moduleName: string) => void;
  clearAllMocks: () => void;
  resetAllMocks: () => void;
  restoreAllMocks: () => void;
  spyOn: <T extends object, K extends keyof T>(object: T, method: K, accessType?: 'get' | 'set') => any;
  useFakeTimers: () => void;
  useRealTimers: () => void;
  setSystemTime: (date: Date | number) => void;
  runOnlyPendingTimers: () => void;
  runAllTimers: () => void;
  advanceTimersByTime: (ms: number) => void;
  waitFor: <T>(callback: () => T, options?: { interval?: number; timeout?: number }) => Promise<T>;
};