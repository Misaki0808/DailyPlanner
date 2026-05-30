import { create } from 'zustand';
import * as storage from '../utils/storage';
import { getToday } from '../utils/dateUtils';

interface PomodoroState {
  pomodoroStats: Record<string, number>;
  addPomodoroSession: (date?: string) => Promise<void>;
  _hydrate: (data: Record<string, number>) => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  pomodoroStats: {},
  addPomodoroSession: async (date?: string) => {
    const targetDate = date || getToday();
    const currentStats = get().pomodoroStats;
    const todayCount = (currentStats[targetDate] || 0) + 1;
    
    const newStats = {
      ...currentStats,
      [targetDate]: todayCount
    };
    
    set({ pomodoroStats: newStats });
    await storage.savePomodoroStats(newStats);
  },
  _hydrate: (data) => set({ pomodoroStats: data }),
}));
