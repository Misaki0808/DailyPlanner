import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Plans, Task, Settings, RecurringTask, Gender } from '../types';
import * as storage from '../utils/storage';
import { getTheme, Theme } from '../utils/theme';
import { getToday } from '../utils/dateUtils';
import { requestNotificationPermissions, scheduleDailySummaryNotification } from '../utils/notificationService';
import { usePlans } from '../hooks/usePlans';
import { useSettings } from '../hooks/useSettings';
import { useUser } from '../hooks/useUser';
import { useRecurringTasks } from '../hooks/useRecurringTasks';
import { usePomodoroStats } from '../hooks/usePomodoroStats';

// ─── YENİ ALT CONTEXT'LER (Performans için) ─────────────────────────────

export interface UserContextType {
  username: string | null;
  gender: Gender;
  aboutMe: string;
  setUsername: (name: string) => Promise<void>;
  setGender: (gender: Gender) => Promise<void>;
  saveAboutMe: (text: string) => Promise<void>;
}

export interface SettingsContextType {
  settings: Settings;
  theme: Theme;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
}

export interface PlansContextType {
  plans: Plans;
  savePlan: (date: string, tasks: Task[]) => Promise<void>;
  deletePlan: (date: string) => Promise<void>;
  updateTask: (date: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  refreshPlans: () => Promise<void>;
}

export interface PomodoroContextType {
  pomodoroStats: Record<string, number>;
  addPomodoroSession: (date?: string) => Promise<void>;
}

export interface RecurringContextType {
  recurringTasks: RecurringTask[];
  addRecurringTask: (task: Omit<RecurringTask, 'id' | 'createdAt'>) => Promise<void>;
  removeRecurringTask: (id: string) => Promise<void>;
  toggleRecurringTask: (id: string) => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);
export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
export const PlansContext = createContext<PlansContextType | undefined>(undefined);
export const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);
export const RecurringContext = createContext<RecurringContextType | undefined>(undefined);

// ─── ESKİ GENEL CONTEXT (Geriye Uyumluluk İçin) ────────────────────────

export interface AppContextType extends UserContextType, SettingsContextType, PlansContextType, PomodoroContextType, RecurringContextType {
  isLoading: boolean;
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
  const { pomodoroStats, loadPomodoroStats, addPomodoroSession } = usePomodoroStats();

  const [isLoading, setIsLoading] = useState(true);
  const [aboutMe, setAboutMeState] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await storage.cleanOldPlans(90);

      const [savedPlans, savedUsername, savedGender, savedSettings, savedRecurring, savedAboutMe] = await Promise.all([
        storage.getAllPlans(),
        storage.getUserName(),
        storage.getGender(),
        storage.getSettings(),
        storage.getRecurringTasks(),
        storage.getAboutMe(),
        loadPomodoroStats(),
      ]);

      setPlans(savedPlans);
      setUsernameState(savedUsername);
      setGenderState((savedGender as Gender) || 'male');
      if (savedSettings) setSettings(savedSettings);
      setRecurringTasks(savedRecurring);
      setAboutMeState(savedAboutMe);

      await syncRecurringTasks(getToday(), savedRecurring, savedPlans);

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
      setIsLoading(false);
    }
  };

  const theme = getTheme(settings?.darkMode ?? true);

  const handleSaveAboutMe = async (text: string) => {
    setAboutMeState(text);
    await storage.saveAboutMe(text);
  };

  // Optimize context values to prevent re-renders
  const userValue = useMemo(() => ({ username, gender, aboutMe, setUsername, setGender, saveAboutMe: handleSaveAboutMe }), [username, gender, aboutMe, setUsername, setGender]);
  const settingsValue = useMemo(() => ({ settings, theme, updateSettings }), [settings, theme, updateSettings]);
  const plansValue = useMemo(() => ({ plans, savePlan, deletePlan, updateTask, refreshPlans }), [plans, savePlan, deletePlan, updateTask, refreshPlans]);
  const pomodoroValue = useMemo(() => ({ pomodoroStats, addPomodoroSession }), [pomodoroStats, addPomodoroSession]);
  const recurringValue = useMemo(() => ({ recurringTasks, addRecurringTask, removeRecurringTask, toggleRecurringTask }), [recurringTasks, addRecurringTask, removeRecurringTask, toggleRecurringTask]);
  
  const appValue = useMemo(() => ({
    ...userValue,
    ...settingsValue,
    ...plansValue,
    ...pomodoroValue,
    ...recurringValue,
    isLoading
  }), [userValue, settingsValue, plansValue, pomodoroValue, recurringValue, isLoading]);

  return (
    <UserContext.Provider value={userValue}>
      <SettingsContext.Provider value={settingsValue}>
        <PlansContext.Provider value={plansValue}>
          <PomodoroContext.Provider value={pomodoroValue}>
            <RecurringContext.Provider value={recurringValue}>
              <AppContext.Provider value={appValue}>
                {children}
              </AppContext.Provider>
            </RecurringContext.Provider>
          </PomodoroContext.Provider>
        </PlansContext.Provider>
      </SettingsContext.Provider>
    </UserContext.Provider>
  );
};

// ─── HOOKS ─────────────────────────────────────────────────────────────

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUserContext must be used within an AppProvider');
  return context;
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) throw new Error('useSettingsContext must be used within an AppProvider');
  return context;
};

export const usePlansContext = () => {
  const context = useContext(PlansContext);
  if (context === undefined) throw new Error('usePlansContext must be used within an AppProvider');
  return context;
};

export const usePomodoroContext = () => {
  const context = useContext(PomodoroContext);
  if (context === undefined) throw new Error('usePomodoroContext must be used within an AppProvider');
  return context;
};

export const useRecurringContext = () => {
  const context = useContext(RecurringContext);
  if (context === undefined) throw new Error('useRecurringContext must be used within an AppProvider');
  return context;
};
