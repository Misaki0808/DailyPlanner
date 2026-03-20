import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Plans, Task, Settings, RecurringTask } from '../types';
import * as storage from '../utils/storage';
import { getTheme, Theme } from '../utils/theme';
import { getToday, parseDate, generateId } from '../utils/dateUtils';

// Gender tipi
export type Gender = 'male' | 'female';

// Context Type
interface AppContextType {
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
  const [plans, setPlans] = useState<Plans>({});
  const [username, setUsernameState] = useState<string | null>(null);
  const [gender, setGenderState] = useState<Gender>('male');
  const [settings, setSettingsState] = useState<Settings>({
    askBeforeDeleteAll: true,
    darkMode: false,
    notificationsEnabled: true,
    notificationTime: '08:00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [savedPlans, savedUsername, savedGender, savedSettings, savedRecurring] = await Promise.all([
        storage.getAllPlans(),
        storage.getUserName(),
        storage.getGender(),
        storage.getSettings(),
        storage.getRecurringTasks(),
      ]);

      setPlans(savedPlans);
      setUsernameState(savedUsername);
      setGenderState(savedGender);
      setSettingsState(savedSettings);
      setRecurringTasks(savedRecurring);

      // Bugün için tekrarlayan görevleri senkronize et
      await syncRecurringTasks(getToday(), savedRecurring, savedPlans);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Tekrarlayan görevleri belirli bir tarih için senkronize et
  const syncRecurringTasks = async (
    date: string,
    recurring: RecurringTask[],
    currentPlans: Plans
  ) => {
    const lastSync = await storage.getLastRecurringSync();
    if (lastSync === date) return; // Bugün zaten sync edilmiş

    const existingTasks = currentPlans[date] || [];
    const existingTitles = new Set(existingTasks.map(t => t.title.toLowerCase()));
    const dateObj = parseDate(date);
    const dayOfWeek = dateObj.getDay(); // 0=Pazar, 1=Pazartesi...
    const dayOfMonth = dateObj.getDate(); // 1-31

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
          // Backward compatibility
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

  const refreshPlans = async () => {
    try {
      const savedPlans = await storage.getAllPlans();
      setPlans(savedPlans);
    } catch (error) {
      console.error('Planlar yenilenirken hata:', error);
    }
  };

  const savePlan = async (date: string, tasks: Task[]) => {
    try {
      await storage.savePlan(date, tasks);
      setPlans(prev => ({ ...prev, [date]: tasks }));
    } catch (error) {
      console.error('Plan kaydetme hatası:', error);
      throw error;
    }
  };

  const deletePlan = async (date: string) => {
    try {
      await storage.deletePlan(date);
      setPlans(prev => {
        const newPlans = { ...prev };
        delete newPlans[date];
        return newPlans;
      });
    } catch (error) {
      console.error('Plan silme hatası:', error);
      throw error;
    }
  };

  const updateTask = async (date: string, taskId: string, done: boolean) => {
    try {
      await storage.updateTask(date, taskId, { done });
      await refreshPlans();
    } catch (error) {
      console.error('Görev güncelleme hatası:', error);
      throw error;
    }
  };

  const setUsername = async (name: string) => {
    try {
      await storage.saveUserName(name);
      setUsernameState(name);
    } catch (error) {
      console.error('Kullanıcı adı kaydetme hatası:', error);
      throw error;
    }
  };

  const setGender = async (newGender: Gender) => {
    try {
      await storage.saveGender(newGender);
      setGenderState(newGender);
    } catch (error) {
      console.error('Gender kaydetme hatası:', error);
      throw error;
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await storage.saveSettings(updatedSettings);
      setSettingsState(updatedSettings);
    } catch (error) {
      console.error('Ayarlar güncellenirken hata:', error);
      throw error;
    }
  };

  // Tekrarlayan görev ekle
  const addRecurringTask = async (taskData: Omit<RecurringTask, 'id' | 'createdAt'>) => {
    const newTask: RecurringTask = {
      ...taskData,
      id: generateId(),
      createdAt: getToday(),
    };
    const updated = [...recurringTasks, newTask];
    await storage.saveRecurringTasks(updated);
    setRecurringTasks(updated);
    // Yeni eklenen görevi bugün için hemen sync et
    const lastSync = await storage.getLastRecurringSync();
    if (lastSync === getToday()) {
      await storage.saveLastRecurringSync(''); // Reset sync to force re-sync
    }
    const currentPlans = await storage.getAllPlans();
    await syncRecurringTasks(getToday(), updated, currentPlans);
    await refreshPlans();
  };

  // Tekrarlayan görev sil
  const removeRecurringTask = async (id: string) => {
    const updated = recurringTasks.filter(t => t.id !== id);
    await storage.saveRecurringTasks(updated);
    setRecurringTasks(updated);
  };

  // Tekrarlayan görev aktif/pasif toggle
  const toggleRecurringTask = async (id: string) => {
    const updated = recurringTasks.map(t =>
      t.id === id ? { ...t, isActive: !t.isActive } : t
    );
    await storage.saveRecurringTasks(updated);
    setRecurringTasks(updated);
  };

  const theme = getTheme(settings.darkMode);

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
