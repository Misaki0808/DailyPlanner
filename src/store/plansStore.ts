import { create } from 'zustand';
import { Platform } from 'react-native';
import { Plans, Task } from '../types';
import * as storage from '../utils/storage';
import { getToday } from '../utils/dateUtils';
import { DailyPlannerWidget } from '../widgets/DailyPlannerWidget';

const DAILY_PLANNER_WIDGET_NAME = 'DailyPlannerWidget';

const mapWidgetTasks = (tasks: Task[]) => tasks.map(t => ({
  id: t.id,
  title: t.title,
  done: !!t.done,
  priority: t.priority,
}));

const requestDailyPlannerWidgetUpdate = async () => {
  if (Platform.OS !== 'android') return;

  try {
    const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');

    await requestWidgetUpdate({
      widgetName: DAILY_PLANNER_WIDGET_NAME,
      renderWidget: async () => {
        const today = getToday();
        const tasks = await storage.getPlanByDate(today);
        return DailyPlannerWidget({
          date: today,
          tasks: mapWidgetTasks(tasks),
        });
      },
    });
  } catch (error) {
    console.log('Widget update request failed (likely running in Expo Go):', error);
  }
};

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
    await requestDailyPlannerWidgetUpdate();
  },
  deletePlan: async (date: string) => {
    const newPlans = { ...get().plans };
    delete newPlans[date];
    set({ plans: newPlans });
    await storage.deletePlan(date);
    await requestDailyPlannerWidgetUpdate();
  },
  updateTask: async (date: string, taskId: string, updates: Partial<Task>) => {
    const dayTasks = get().plans[date] || [];
    const updatedTasks = dayTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    const newPlans = { ...get().plans, [date]: updatedTasks };
    set({ plans: newPlans });
    await storage.savePlan(date, updatedTasks);
    await requestDailyPlannerWidgetUpdate();
  },
  refreshPlans: async () => {
    const p = await storage.getAllPlans();
    set({ plans: p });
  },
  _hydrate: (data) => set({ plans: data }),
}));
