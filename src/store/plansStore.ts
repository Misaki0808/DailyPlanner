import { create } from 'zustand';
import { Plans, Task } from '../types';
import * as storage from '../utils/storage';

interface PlansState {
  plans: Plans;
  savePlan: (date: string, tasks: Task[]) => Promise<void>;
  deletePlan: (date: string) => Promise<void>;
  updateTask: (date: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  refreshPlans: () => Promise<void>;
  _hydrate: (data: Plans) => void;
}

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: {},
  savePlan: async (date: string, tasks: Task[]) => {
    const newPlans = { ...get().plans, [date]: tasks };
    set({ plans: newPlans });
    await storage.savePlan(date, tasks);
  },
  deletePlan: async (date: string) => {
    const newPlans = { ...get().plans };
    delete newPlans[date];
    set({ plans: newPlans });
    await storage.deletePlan(date);
  },
  updateTask: async (date: string, taskId: string, updates: Partial<Task>) => {
    const dayTasks = get().plans[date] || [];
    const updatedTasks = dayTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    const newPlans = { ...get().plans, [date]: updatedTasks };
    set({ plans: newPlans });
    await storage.savePlan(date, updatedTasks);
  },
  refreshPlans: async () => {
    const p = await storage.getAllPlans();
    set({ plans: p });
  },
  _hydrate: (data) => set({ plans: data }),
}));
