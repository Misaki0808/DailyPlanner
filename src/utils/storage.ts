import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plans, Task, Settings, RecurringTask } from '../types';

// Storage anahtarları - tek yerden yönetmek için
const STORAGE_KEYS = {
  PLANS: '@daily_planner_plans',
  USER_NAME: '@daily_planner_user_name',
  GENDER: '@daily_planner_gender',
  SETTINGS: '@daily_planner_settings',
  RECURRING_TASKS: '@daily_planner_recurring_tasks',
  LAST_RECURRING_SYNC: '@daily_planner_last_recurring_sync',
  ABOUT_ME: '@daily_planner_about_me',
};

/**
 * TÜM PLANLARI GETİR
 * AsyncStorage'dan tüm planları okur
 * @returns Promise<Plans> - Tarih bazlı planlar objesi
 */
export const getAllPlans = async (): Promise<Plans> => {
  try {
    const plansJson = await AsyncStorage.getItem(STORAGE_KEYS.PLANS);
    if (plansJson === null) {
      return {}; // İlk kullanımda boş obje döner
    }
    return JSON.parse(plansJson);
  } catch (error) {
    console.error('Planlar okunurken hata:', error);
    return {};
  }
};

/**
 * BELİRLİ BİR GÜN İÇİN PLANI GETİR
 * @param date - Format: "YYYY-MM-DD"
 * @returns Promise<Task[]> - O günün görevleri
 */
export const getPlanByDate = async (date: string) => {
  try {
    const allPlans = await getAllPlans();
    return allPlans[date] || []; // O gün için plan yoksa boş array
  } catch (error) {
    console.error('Plan okunurken hata:', error);
    return [];
  }
};

/**
 * PLAN KAYDET VEYA GÜNCELLE
 * Belirli bir tarih için planı kaydeder veya günceller
 * @param date - Format: "YYYY-MM-DD"
 * @param tasks - Görev listesi
 */
export const savePlan = async (date: string, tasks: Task[]) => {
  try {
    const allPlans = await getAllPlans();
    allPlans[date] = tasks; // Yeni veya güncel planı ekle
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(allPlans));
    return true;
  } catch (error) {
    console.error('Plan kaydedilirken hata:', error);
    return false;
  }
};

/**
 * BELİRLİ BİR GÜNDEKİ PLANI SİL
 * @param date - Format: "YYYY-MM-DD"
 */
export const deletePlan = async (date: string) => {
  try {
    const allPlans = await getAllPlans();
    delete allPlans[date]; // O günü sil
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(allPlans));
    return true;
  } catch (error) {
    console.error('Plan silinirken hata:', error);
    return false;
  }
};

/**
 * BELİRLİ BİR GÖREVİ GÜNCELLE
 * Bir görevin "done" durumunu değiştirmek için kullanılır
 * @param date - Format: "YYYY-MM-DD"
 * @param taskId - Görevin ID'si
 * @param updates - Güncellenecek alanlar (örn: { done: true })
 */
export const updateTask = async (date: string, taskId: string, updates: Partial<Task>) => {
  try {
    const allPlans = await getAllPlans();
    const tasks = allPlans[date] || [];
    const updatedTasks = tasks.map((task: Task) =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    allPlans[date] = updatedTasks;
    await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(allPlans));
    return updatedTasks;
  } catch (error) {
    console.error('Görev güncellenirken hata:', error);
    return null;
  }
};

/**
 * KULLANICI ADINI KAYDET
 * İlk açılışta kullanıcı adı alınır
 */
export const saveUserName = async (name: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name);
    return true;
  } catch (error) {
    console.error('Kullanıcı adı kaydedilirken hata:', error);
    return false;
  }
};

/**
 * KULLANICI ADINI GETİR
 */
export const getUserName = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
  } catch (error) {
    console.error('Kullanıcı adı okunurken hata:', error);
    return null;
  }
};

/**
 * GENDER KAYDET
 */
export const saveGender = async (gender: 'male' | 'female') => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GENDER, gender);
    return true;
  } catch (error) {
    console.error('Gender kaydedilirken hata:', error);
    return false;
  }
};

/**
 * GENDER GETİR
 */
export const getGender = async (): Promise<'male' | 'female'> => {
  try {
    const gender = await AsyncStorage.getItem(STORAGE_KEYS.GENDER);
    return gender === 'female' ? 'female' : 'male'; // Default male
  } catch (error) {
    console.error('Gender okunurken hata:', error);
    return 'male';
  }
};

/**
 * AYARLARI KAYDET
 */
export const saveSettings = async (settings: Settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Ayarlar kaydedilirken hata:', error);
    return false;
  }
};

/**
 * AYARLARI GETİR
 */
export const getSettings = async (): Promise<Settings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settingsJson === null) {
      // Varsayılan ayarlar
      return {
        askBeforeDeleteAll: true, // Default: Sor
        darkMode: true, // Default: Dark mode
        notificationsEnabled: true, // Default: Bildirimler açık
        notificationTime: '08:00', // Default: Sabah 8
      };
    }
    return JSON.parse(settingsJson);
  } catch (error) {
    console.error('Ayarlar okunurken hata:', error);
    return {
      askBeforeDeleteAll: true,
      darkMode: true,
      notificationsEnabled: true,
      notificationTime: '08:00',
    };
  }
};

// TEKRARLAYAN GOREVLERI GETIR
export const getRecurringTasks = async (): Promise<RecurringTask[]> => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.RECURRING_TASKS);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Tekrarlayan gorevler okunurken hata:', error);
    return [];
  }
};

// TEKRARLAYAN GOREVLERI KAYDET
export const saveRecurringTasks = async (tasks: RecurringTask[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RECURRING_TASKS, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error('Tekrarlayan gorevler kaydedilirken hata:', error);
    return false;
  }
};

// SON SENKRONIZASYON TARIHINI GETIR
export const getLastRecurringSync = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_RECURRING_SYNC);
  } catch {
    return null;
  }
};

// SON SENKRONIZASYON TARIHINI KAYDET
export const saveLastRecurringSync = async (date: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_RECURRING_SYNC, date);
  } catch {
    // ignore
  }
};

/**
 * TÜM VERİLERİ SİL (Debug veya test için)
 */
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Veriler silinirken hata:', error);
    return false;
  }
};

/**
 * ESKİ PLANLARI TEMİZLE
 * Verilen gün sayısından daha eski planları otomatik siler (Varsayılan: 90 gün)
 */
export const cleanOldPlans = async (daysThreshold: number = 90) => {
  try {
    const allPlans = await getAllPlans();
    let hasChanges = false;
    
    // Bugünün başlangıcı
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    Object.keys(allPlans).forEach(date => {
      const [year, month, day] = date.split('-').map(Number);
      const planDate = new Date(year, month - 1, day);
      
      const diffTime = now.getTime() - planDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > daysThreshold) {
        delete allPlans[date];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(allPlans));
    }
    return hasChanges;
  } catch (error) {
    console.error('Eski planlar temizlenirken hata:', error);
    return false;
  }
};

// "Hakkımda" metnini kaydet
export const saveAboutMe = async (text: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ABOUT_ME, text);
    return true;
  } catch (error) {
    console.error('Hakkımda kaydedilirken hata:', error);
    return false;
  }
};

// "Hakkımda" metnini getir
export const getAboutMe = async (): Promise<string> => {
  try {
    const text = await AsyncStorage.getItem(STORAGE_KEYS.ABOUT_ME);
    return text || '';
  } catch (error) {
    console.error('Hakkımda okunurken hata:', error);
    return '';
  }
};
