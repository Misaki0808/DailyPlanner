import { create } from 'zustand';
import * as storage from '../utils/storage';
import { getToday } from '../utils/dateUtils';
import { requestNotificationPermissions, scheduleDailySummaryNotification } from '../utils/notificationService';
import { useUserStore } from './userStore';
import { useSettingsStore } from './settingsStore';
import { usePlansStore } from './plansStore';
import { usePomodoroStore } from './pomodoroStore';
import { useRecurringStore } from './recurringStore';

import { Task } from '../types';

interface AppState {
  isLoading: boolean;
  initializeApp: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: true,
  initializeApp: async () => {
    try {
      await storage.cleanOldPlans(90);

      // We read everything from storage
      const [
        savedPlans,
        savedUsername,
        savedGender,
        savedSettings,
        savedRecurring,
        savedAboutMe,
        savedPomodoro
      ] = await Promise.all([
        storage.getAllPlans(),
        storage.getUserName(),
        storage.getGender(),
        storage.getSettings(),
        storage.getRecurringTasks(),
        storage.getAboutMe(),
        storage.getPomodoroStats(),
      ]);

      // Hydrate all stores
      usePlansStore.getState()._hydrate(savedPlans);
      useUserStore.getState()._hydrate({
        username: savedUsername,
        gender: (savedGender as any) || 'male',
        aboutMe: savedAboutMe,
      });
      useSettingsStore.getState()._hydrate(savedSettings);
      useRecurringStore.getState()._hydrate(savedRecurring);
      usePomodoroStore.getState()._hydrate(savedPomodoro);

      // Notification setup
      if (savedSettings?.notificationsEnabled) {
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          const [h, m] = (savedSettings.notificationTime || '20:00').split(':').map(Number);
          await scheduleDailySummaryNotification(h, m);
        }
      }

      // Sync Recurring Tasks for Today
      const today = getToday();
      const lastSync = await storage.getLastRecurringSync();
      
      if (lastSync !== today && savedRecurring && savedRecurring.length > 0) {
        const dateObj = new Date();
        const dayOfWeek = dateObj.getDay();
        const dayOfMonth = dateObj.getDate();
        const existingTasks = savedPlans[today] || [];
        const existingTitles = new Set(existingTasks.map((t: Task) => t.title.toLowerCase()));

        const newTasks: Task[] = [];
        for (const rt of savedRecurring) {
          if (!rt.isActive) continue;
          if (existingTitles.has(rt.title.toLowerCase())) continue;
          
          let shouldAdd = false;
          if (rt.frequency === 'daily') shouldAdd = true;
          else if (rt.frequency === 'weekly') {
            if (rt.weekDays && rt.weekDays.includes(dayOfWeek)) shouldAdd = true;
            else if (rt.weekDay !== undefined && rt.weekDay === dayOfWeek) shouldAdd = true;
          } else if (rt.frequency === 'monthly' && rt.monthDay === dayOfMonth) {
            shouldAdd = true;
          }

          if (shouldAdd) {
            newTasks.push({
              id: 'rt-' + Date.now() + Math.random().toString(36).substring(2, 7),
              title: rt.title,
              done: false,
              priority: rt.priority,
              category: 'diger',
            });
          }
        }

        if (newTasks.length > 0) {
          const updatedTasks = [...existingTasks, ...newTasks];
          await usePlansStore.getState().savePlan(today, updatedTasks);
        }
        await storage.saveLastRecurringSync(today);
      }

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));
