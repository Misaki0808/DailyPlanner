import { create } from 'zustand';
import { RecurringTask } from '../types';
import * as storage from '../utils/storage';
import { generateId, getToday } from '../utils/dateUtils';
import { usePlansStore } from './plansStore';

interface RecurringState {
  recurringTasks: RecurringTask[];
  addRecurringTask: (task: Omit<RecurringTask, 'id' | 'createdAt'>) => Promise<void>;
  removeRecurringTask: (id: string) => Promise<void>;
  toggleRecurringTask: (id: string) => Promise<void>;
  _hydrate: (data: RecurringTask[]) => void;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  recurringTasks: [],
  
  addRecurringTask: async (taskData) => {
    const newTask: RecurringTask = {
      ...taskData,
      id: generateId(),
      createdAt: getToday(),
    };
    
    const updated = [...get().recurringTasks, newTask];
    set({ recurringTasks: updated });
    await storage.saveRecurringTasks(updated);
    
    // Yalnızca bugünün planlarını güncellemek için:
    // (Aslında sync logic'in her gün çalışması gerekir.
    // Şimdilik sadece store'a ekliyoruz, sync logic app boot'ta çalışır).
  },
  
  removeRecurringTask: async (id: string) => {
    const updated = get().recurringTasks.filter(t => t.id !== id);
    set({ recurringTasks: updated });
    await storage.saveRecurringTasks(updated);
  },
  
  toggleRecurringTask: async (id: string) => {
    const updated = get().recurringTasks.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    );
    set({ recurringTasks: updated });
    await storage.saveRecurringTasks(updated);
  },
  
  _hydrate: (data) => set({ recurringTasks: data }),
}));
