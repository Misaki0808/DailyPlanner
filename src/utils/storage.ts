import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plans, Task, Settings } from '../types';

// Storage anahtarları - tek yerden yönetmek için
const STORAGE_KEYS = {
  PLANS: '@daily_planner_plans',
  USER_NAME: '@daily_planner_user_name',
  GENDER: '@daily_planner_gender',
  SETTINGS: '@daily_planner_settings',
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
    const tasks = await getPlanByDate(date);
    const updatedTasks = tasks.map((task: Task) =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    await savePlan(date, updatedTasks);
    return true;
  } catch (error) {
    console.error('Görev güncellenirken hata:', error);
    return false;
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
      };
    }
    return JSON.parse(settingsJson);
  } catch (error) {
    console.error('Ayarlar okunurken hata:', error);
    return {
      askBeforeDeleteAll: true,
    };
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
