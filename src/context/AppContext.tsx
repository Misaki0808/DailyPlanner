import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Plans, Task, Settings, RecurringTask, Gender } from '../types';
import * as storage from '../utils/storage';
import { getTheme, Theme } from '../utils/theme';
import { getToday } from '../utils/dateUtils';
import { usePlans } from '../hooks/usePlans';
import { useSettings } from '../hooks/useSettings';
import { useUser } from '../hooks/useUser';
import { useRecurringTasks } from '../hooks/useRecurringTasks';

export interface AppContextType {
  plans: Plans;
  username: string | null;
  gender: Gender;
  settings: Settings;
  theme: Theme;
  isLoading: boolean;
  recurringTasks: RecurringTask[];
  savePlan: (date: string, tasks: Task[]) => Promise<void>;
  deletePlan: (date: string) => Promise<void>;
  updateTask: (date: string, taskId: string, done: boolean) => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  setGender: (gender: Gender) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  refreshPlans: () => Promise<void>;
  addRecurringTask: (task: Omit<RecurringTask, 'id' | 'createdAt'>) => Promise<void>;
  removeRecurringTask: (id: string) => Promise<void>;
  toggleRecurringTask: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { plans, setPlans, refreshPlans, savePlan, deletePlan, updateTask } = usePlans();
  const { settings, setSettings, updateSettings } = useSettings();
  const { username, setUsernameState, setUsername, gender, setGenderState, setGender } = useUser();
  const {
    recurringTasks,
    setRecurringTasks,
    syncRecurringTasks,
    addRecurringTask,
    removeRecurringTask,
    toggleRecurringTask,
  } = useRecurringTasks(setPlans);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 90 günden eski planları otomatik temizle (uygulama boyutunu korumak için)
      await storage.cleanOldPlans(90);

      const [savedPlans, savedUsername, savedGender, savedSettings, savedRecurring] = await Promise.all([
        storage.getAllPlans(),
        storage.getUserName(),
        storage.getGender(),
        storage.getSettings(),
        storage.getRecurringTasks(),
      ]);

      setPlans(savedPlans);
      setUsernameState(savedUsername);
      setGenderState((savedGender as Gender) || 'male');
      if (savedSettings) setSettings(savedSettings);
      setRecurringTasks(savedRecurring);

      await syncRecurringTasks(getToday(), savedRecurring, savedPlans);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const theme = getTheme(settings?.darkMode ?? true);

  return (
    <AppContext.Provider
      value={{
        plans,
        username,
        gender,
        settings,
        theme,
        isLoading,
        recurringTasks,
        savePlan,
        deletePlan,
        updateTask,
        setUsername,
        setGender,
        updateSettings,
        refreshPlans,
        addRecurringTask,
        removeRecurringTask,
        toggleRecurringTask,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
