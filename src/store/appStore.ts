import { create } from 'zustand';
import { AppState as ReactNativeAppState } from 'react-native';
import * as storage from '../utils/storage';
import { getToday } from '../utils/dateUtils';
import { requestNotificationPermissions, scheduleDailySummaryNotification } from '../utils/notificationService';
import { useUserStore } from './userStore';
import { useSettingsStore } from './settingsStore';
import { usePlansStore } from './plansStore';
import { usePomodoroStore } from './pomodoroStore';
import { useRecurringStore } from './recurringStore';

import { Task } from '../types';

interface AppStoreState {
  isLoading: boolean;
  initializeApp: () => Promise<void>;
}

interface SyncRecurringOptions {
  force?: boolean;
}

let appStateListenerRegistered = false;
let lastObservedDate: string | null = null;

const normalizeTitle = (title: string) => title.toLocaleLowerCase('tr-TR');

export const syncRecurringForToday = async ({ force = false }: SyncRecurringOptions = {}) => {
  const today = getToday();
  const lastSync = await storage.getLastRecurringSync();

  if (!force && lastSync === today) return;

  const recurringTasks = useRecurringStore.getState().recurringTasks;
  if (recurringTasks.length === 0) {
    await storage.saveLastRecurringSync(today);
    return;
  }

  const dateObj = new Date();
  const dayOfWeek = dateObj.getDay();
  const dayOfMonth = dateObj.getDate();
  const planState = usePlansStore.getState().plans;
  const existingTasks = Object.prototype.hasOwnProperty.call(planState, today)
    ? planState[today]
    : await storage.getPlanByDate(today);
  const existingTitles = new Set(existingTasks.map((t: Task) => normalizeTitle(t.title)));

  const newTasks: Task[] = [];
  for (const rt of recurringTasks) {
    const normalizedTitle = normalizeTitle(rt.title);
    if (!rt.isActive) continue;
    if (existingTitles.has(normalizedTitle)) continue;

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
      existingTitles.add(normalizedTitle);
    }
  }

  if (newTasks.length > 0) {
    const updatedTasks = [...existingTasks, ...newTasks];
    await usePlansStore.getState().savePlan(today, updatedTasks);
  }
  await storage.saveLastRecurringSync(today);
};

const registerRecurringDateSyncListener = () => {
  if (appStateListenerRegistered) return;

  appStateListenerRegistered = true;
  lastObservedDate = getToday();

  ReactNativeAppState.addEventListener('change', async (nextState) => {
    if (nextState !== 'active') return;

    const today = getToday();
    if (lastObservedDate === today) return;

    lastObservedDate = today;
    try {
      await syncRecurringForToday();
    } catch (error) {
      console.warn('Recurring sync on app foreground failed:', error);
    }
  });
};

export const useAppStore = create<AppStoreState>((set) => ({
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

      registerRecurringDateSyncListener();
      await syncRecurringForToday();

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));
