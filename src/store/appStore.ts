import { create } from 'zustand';
import * as storage from '../utils/storage';
import { getToday } from '../utils/dateUtils';
import { requestNotificationPermissions, scheduleDailySummaryNotification } from '../utils/notificationService';
import { useUserStore } from './userStore';
import { useSettingsStore } from './settingsStore';
import { usePlansStore } from './plansStore';
import { usePomodoroStore } from './pomodoroStore';
import { useRecurringStore } from './recurringStore';

// Note: syncRecurringTasks needs to be imported or rewritten here.
// For simplicity, we rewrite a lightweight version of it here, 
// or we can import it from a utility file if we refactor `useRecurringTasks`.

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

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));
