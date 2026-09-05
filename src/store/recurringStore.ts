import { create } from 'zustand';
import { RecurringTask } from '../types';
import * as storage from '../utils/storage';
import { generateId, getToday } from '../utils/dateUtils';
import { persistOrNotify } from '../utils/persistence';
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
    await persistOrNotify('Tekrarlayan görev', storage.saveRecurringTasks(updated));

    try {
      const { syncRecurringForToday } = require('./appStore') as typeof import('./appStore');
      await syncRecurringForToday({ force: true });
    } catch (error) {
      console.warn('Recurring sync after add failed:', error);
    }
  },
  
  removeRecurringTask: async (id: string) => {
    const updated = get().recurringTasks.filter(t => t.id !== id);
    set({ recurringTasks: updated });
    await persistOrNotify('Tekrarlayan görev silme', storage.saveRecurringTasks(updated));
  },
  
  toggleRecurringTask: async (id: string) => {
    const updated = get().recurringTasks.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    );
    set({ recurringTasks: updated });
    await persistOrNotify('Tekrarlayan görev', storage.saveRecurringTasks(updated));
  },
  
  _hydrate: (data) => set({ recurringTasks: data }),
}));
