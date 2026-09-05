import { create } from 'zustand';
import { AppState as ReactNativeAppState } from 'react-native';
import * as storage from '../utils/storage';
import { clampDayToMonth, getToday } from '../utils/dateUtils';
import { defaultSettings } from '../utils/defaultSettings';
import { requestNotificationPermissions, scheduleDailySummaryNotification } from '../utils/notificationService';
import { useUserStore } from './userStore';
import { useSettingsStore } from './settingsStore';
import { usePlansStore } from './plansStore';
import { usePomodoroStore } from './pomodoroStore';
import { useRecurringStore } from './recurringStore';
import { backupToCloudSilently, fetchCloudBackupRecord } from '../hooks/useCloudSync';

import { Task } from '../types';

interface AppStoreState {
  isLoading: boolean;
  hasCloudBackupAvailable: boolean;
  cloudBackupUpdatedAt: string | null;
  initializeApp: () => Promise<void>;
  checkCloudBackupStatus: () => Promise<void>;
}

interface SyncRecurringOptions {
  force?: boolean;
}

let appStateListenerRegistered = false;
let lastObservedDate: string | null = null;
let cloudBackupInFlight = false;

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
    } else if (rt.frequency === 'monthly' && rt.monthDay) {
      // Hedef gün ayın uzunluğuna kırpılır. Arayüz 31'e kadar seçime izin
      // veriyor; tam eşitlik arandığında "her ayın 31'i" Şubat, Nisan,
      // Haziran, Eylül ve Kasım'da hiç tetiklenmiyordu.
      const targetDay = clampDayToMonth(dateObj.getFullYear(), dateObj.getMonth() + 1, rt.monthDay);
      if (targetDay === dayOfMonth) shouldAdd = true;
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

const runBackgroundCloudBackup = async () => {
  if (cloudBackupInFlight) return;

  cloudBackupInFlight = true;
  try {
    await backupToCloudSilently();
  } finally {
    cloudBackupInFlight = false;
  }
};

const registerAppStateListeners = () => {
  if (appStateListenerRegistered) return;

  appStateListenerRegistered = true;
  lastObservedDate = getToday();

  ReactNativeAppState.addEventListener('change', async (nextState) => {
    if (nextState === 'active') {
      const today = getToday();
      if (lastObservedDate === today) return;

      try {
        await syncRecurringForToday();
        // Bayrak yalnız sync BAŞARILI olduğunda ilerletilir. Önceden önce
        // ilerletiliyordu; sync hata verirse koruma bir daha çalışmasına izin
        // vermiyor ve tekrarlayan görevler uygulama tamamen kapanana kadar
        // hiç eklenmiyordu.
        lastObservedDate = today;
      } catch (error) {
        console.warn('Recurring sync on app foreground failed:', error);
      }
      return;
    }

    if (nextState === 'background') {
      await runBackgroundCloudBackup();
    }
  });
};

export const useAppStore = create<AppStoreState>((set, get) => ({
  isLoading: true,
  hasCloudBackupAvailable: false,
  cloudBackupUpdatedAt: null,
  checkCloudBackupStatus: async () => {
    try {
      const record = await fetchCloudBackupRecord();
      set({
        hasCloudBackupAvailable: Boolean(record),
        cloudBackupUpdatedAt: record?.updated_at ?? null,
      });
    } catch (error) {
      console.warn('Cloud backup status check failed:', error);
      set({ hasCloudBackupAvailable: false, cloudBackupUpdatedAt: null });
    }
  },
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
          const [h, m] = (savedSettings.notificationTime || defaultSettings.notificationTime).split(':').map(Number);
          await scheduleDailySummaryNotification(h, m);
        }
      }

      registerAppStateListeners();
      await syncRecurringForToday();

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      set({ isLoading: false });
    }

    // Bulut durumu açılışı BLOKLAMAMALI. Sonuç yalnız store'da tutuluyor ve
    // ekranlar tarafından okunmuyor; buna karşılık zinciri (oturum -> profil
    // upsert -> household -> yedek kaydı) supabase-js'in fetch zaman aşımı
    // olmadığı için yavaş ağda "Yükleniyor..." ekranını dakikalarca açık
    // tutabiliyordu. Artık arka planda, isLoading kapandıktan sonra çalışır.
    get().checkCloudBackupStatus();
  }
}));
