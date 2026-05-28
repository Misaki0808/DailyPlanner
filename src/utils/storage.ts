import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plans, Task, Settings, RecurringTask } from '../types';

// Storage anahtarları - tek yerden yönetmek için
const STORAGE_KEYS = {
  OLD_PLANS: '@daily_planner_plans', // Migration için
  PLAN_PREFIX: '@dp_plan_',
  USER_NAME: '@daily_planner_user_name',
  GENDER: '@daily_planner_gender',
  SETTINGS: '@daily_planner_settings',
  RECURRING_TASKS: '@daily_planner_recurring_tasks',
  LAST_RECURRING_SYNC: '@daily_planner_last_recurring_sync',
  ABOUT_ME: '@daily_planner_about_me',
  POMODORO_STATS: '@daily_planner_pomodoro_stats',
  LAST_CLEANUP_DATE: '@daily_planner_last_cleanup_date', // Temizlik performansı için
};

/**
 * MİGRASYON: Eski tek parça JSON yapısını yeni ayrı key yapısına geçirir.
 */
export const migratePlansIfNecessary = async (): Promise<void> => {
  try {
    const oldPlansJson = await AsyncStorage.getItem(STORAGE_KEYS.OLD_PLANS);
    if (oldPlansJson) {
      const oldPlans: Plans = JSON.parse(oldPlansJson);
      const multiSetPairs: [string, string][] = [];
      Object.keys(oldPlans).forEach(date => {
        multiSetPairs.push([`${STORAGE_KEYS.PLAN_PREFIX}${date}`, JSON.stringify(oldPlans[date])]);
      });
      if (multiSetPairs.length > 0) {
         await AsyncStorage.multiSet(multiSetPairs);
      }
      await AsyncStorage.removeItem(STORAGE_KEYS.OLD_PLANS);
      console.log('Eski planlar yeni formata başarıyla taşındı.');
    }
  } catch (e) {
    console.error('Migration error:', e);
  }
};

/**
 * TÜM PLANLARI GETİR
 * Yeni sistemde multiGet kullanılarak yüksek performans hedeflenmiştir.
 */
export const getAllPlans = async (): Promise<Plans> => {
  try {
    await migratePlansIfNecessary();
    
    const allKeys = await AsyncStorage.getAllKeys();
    const planKeys = allKeys.filter(key => key.startsWith(STORAGE_KEYS.PLAN_PREFIX));
    
    if (planKeys.length === 0) return {};
    
    const keyValuePairs = await AsyncStorage.multiGet(planKeys);
    const plans: Plans = {};
    
    keyValuePairs.forEach(([key, value]) => {
      if (value) {
        const date = key.replace(STORAGE_KEYS.PLAN_PREFIX, '');
        plans[date] = JSON.parse(value);
      }
    });
    
    return plans;
  } catch (error) {
    console.error('Planlar okunurken hata:', error);
    return {};
  }
};

/**
 * BELİRLİ BİR GÜN İÇİN PLANI GETİR
 * Sadece o günkü key okunduğu için çok hızlıdır.
 */
export const getPlanByDate = async (date: string) => {
  try {
    const key = `${STORAGE_KEYS.PLAN_PREFIX}${date}`;
    const planJson = await AsyncStorage.getItem(key);
    return planJson ? JSON.parse(planJson) : [];
  } catch (error) {
    console.error('Plan okunurken hata:', error);
    return [];
  }
};

/**
 * PLAN KAYDET VEYA GÜNCELLE
 */
export const savePlan = async (date: string, tasks: Task[]) => {
  try {
    const key = `${STORAGE_KEYS.PLAN_PREFIX}${date}`;
    await AsyncStorage.setItem(key, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error('Plan kaydedilirken hata:', error);
    return false;
  }
};

/**
 * BELİRLİ BİR GÜNDEKİ PLANI SİL
 */
export const deletePlan = async (date: string) => {
  try {
    const key = `${STORAGE_KEYS.PLAN_PREFIX}${date}`;
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Plan silinirken hata:', error);
    return false;
  }
};

/**
 * BELİRLİ BİR GÖREVİ GÜNCELLE
 */
export const updateTask = async (date: string, taskId: string, updates: Partial<Task>) => {
  try {
    const key = `${STORAGE_KEYS.PLAN_PREFIX}${date}`;
    const planJson = await AsyncStorage.getItem(key);
    const tasks: Task[] = planJson ? JSON.parse(planJson) : [];
    
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    await AsyncStorage.setItem(key, JSON.stringify(updatedTasks));
    return updatedTasks;
  } catch (error) {
    console.error('Görev güncellenirken hata:', error);
    return null;
  }
};

export const saveUserName = async (name: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name);
    return true;
  } catch (error) {
    return false;
  }
};

export const getUserName = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
  } catch (error) {
    return null;
  }
};

export const saveGender = async (gender: 'male' | 'female') => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GENDER, gender);
    return true;
  } catch (error) {
    return false;
  }
};

export const getGender = async (): Promise<'male' | 'female'> => {
  try {
    const gender = await AsyncStorage.getItem(STORAGE_KEYS.GENDER);
    return gender === 'female' ? 'female' : 'male';
  } catch (error) {
    return 'male';
  }
};

export const saveSettings = async (settings: Settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    return false;
  }
};

export const getSettings = async (): Promise<Settings> => {
  const defaultSettings: Settings = {
    askBeforeDeleteAll: true,
    darkMode: true,
    notificationsEnabled: true,
    notificationTime: '08:00',
    pomodoroFocusTime: 25,
    pomodoroShortBreak: 5,
    pomodoroLongBreak: 15,
    pomodoroSoundEnabled: false,
  };
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settingsJson === null) return defaultSettings;
    return JSON.parse(settingsJson);
  } catch (error) {
    return defaultSettings;
  }
};

export const getRecurringTasks = async (): Promise<RecurringTask[]> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.RECURRING_TASKS);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

export const saveRecurringTasks = async (tasks: RecurringTask[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RECURRING_TASKS, JSON.stringify(tasks));
    return true;
  } catch (error) {
    return false;
  }
};

export const getLastRecurringSync = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_RECURRING_SYNC);
  } catch {
    return null;
  }
};

export const saveLastRecurringSync = async (date: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_RECURRING_SYNC, date);
  } catch {}
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * ESKİ PLANLARI TEMİZLE
 * Her gün 1 kez çalışması sağlanarak performans korunur.
 */
export const cleanOldPlans = async (daysThreshold: number = 90) => {
  try {
    // Sadece günde 1 kez çalışsın
    const todayStr = new Date().toISOString().split('T')[0];
    const lastCleanup = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CLEANUP_DATE);
    if (lastCleanup === todayStr) return false;

    const allKeys = await AsyncStorage.getAllKeys();
    const planKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.PLAN_PREFIX));
    
    const keysToRemove: string[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    planKeys.forEach(key => {
      const dateStr = key.replace(STORAGE_KEYS.PLAN_PREFIX, '');
      const [year, month, day] = dateStr.split('-').map(Number);
      const planDate = new Date(year, month - 1, day);
      
      const diffTime = now.getTime() - planDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > daysThreshold) {
        keysToRemove.push(key);
      }
    });

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_CLEANUP_DATE, todayStr);
    return keysToRemove.length > 0;
  } catch (error) {
    console.error('Eski planlar temizlenirken hata:', error);
    return false;
  }
};

export const saveAboutMe = async (text: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ABOUT_ME, text);
    return true;
  } catch (error) {
    return false;
  }
};

export const getAboutMe = async (): Promise<string> => {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEYS.ABOUT_ME)) || '';
  } catch (error) {
    return '';
  }
};

export const getPomodoroStats = async (): Promise<Record<string, number>> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.POMODORO_STATS);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    return {};
  }
};

export const savePomodoroStats = async (stats: Record<string, number>) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.POMODORO_STATS, JSON.stringify(stats));
    return true;
  } catch (error) {
    return false;
  }
};
