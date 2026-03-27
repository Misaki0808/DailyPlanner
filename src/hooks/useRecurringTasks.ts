import { useState } from 'react';
import { RecurringTask, Plans, Task } from '../types';
import * as storage from '../utils/storage';
import { getToday, generateId, parseDate } from '../utils/dateUtils';

export const useRecurringTasks = (
  setPlans: React.Dispatch<React.SetStateAction<Plans>>
) => {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);

  const syncRecurringTasks = async (
    date: string,
    recurring: RecurringTask[],
    currentPlans: Plans
  ) => {
    const lastSync = await storage.getLastRecurringSync();
    if (lastSync === date) return;

    const existingTasks = currentPlans[date] || [];
    const existingTitles = new Set(existingTasks.map(t => t.title.toLowerCase()));
    const dateObj = parseDate(date);
    const dayOfWeek = dateObj.getDay();
    const dayOfMonth = dateObj.getDate();

    const newTasks: Task[] = [];

    for (const rt of recurring) {
      if (!rt.isActive) continue;
      if (existingTitles.has(rt.title.toLowerCase())) continue;

      let shouldAdd = false;
      if (rt.frequency === 'daily') {
        shouldAdd = true;
      } else if (rt.frequency === 'weekly') {
        if (rt.weekDays && rt.weekDays.includes(dayOfWeek)) {
          shouldAdd = true;
        } else if (rt.weekDay !== undefined && rt.weekDay === dayOfWeek) {
          shouldAdd = true;
        }
      } else if (rt.frequency === 'monthly' && rt.monthDay === dayOfMonth) {
        shouldAdd = true;
      }

      if (shouldAdd) {
        newTasks.push({
          id: generateId(),
          title: rt.title,
          done: false,
          priority: rt.priority,
          category: 'diger',
        });
      }
    }

    if (newTasks.length > 0) {
      const updatedTasks = [...existingTasks, ...newTasks];
      await storage.savePlan(date, updatedTasks);
      setPlans(prev => ({ ...prev, [date]: updatedTasks }));
    }

    await storage.saveLastRecurringSync(date);
  };

  const addRecurringTask = async (taskData: Omit<RecurringTask, 'id' | 'createdAt'>) => {
    const newTask: RecurringTask = {
      ...taskData,
      id: generateId(),
      createdAt: getToday(),
    };
    const updated = [...recurringTasks, newTask];
    await storage.saveRecurringTasks(updated);
    setRecurringTasks(updated);

    const lastSync = await storage.getLastRecurringSync();
    if (lastSync === getToday()) {
      await storage.saveLastRecurringSync('');
    }
    const currentPlans = await storage.getAllPlans();
    await syncRecurringTasks(getToday(), updated, currentPlans);
  };

  const removeRecurringTask = async (id: string) => {
    const updated = recurringTasks.filter(t => t.id !== id);
    await storage.saveRecurringTasks(updated);
    setRecurringTasks(updated);
  };

  const toggleRecurringTask = async (id: string) => {
    const updated = recurringTasks.map(t =>
      t.id === id ? { ...t, isActive: !t.isActive } : t
    );
    await storage.saveRecurringTasks(updated);
    setRecurringTasks(updated);
  };

  return {
    recurringTasks,
    setRecurringTasks,
    syncRecurringTasks,
    addRecurringTask,
    removeRecurringTask,
    toggleRecurringTask,
  };
};
