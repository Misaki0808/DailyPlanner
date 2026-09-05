import { Settings } from '../types';

/**
 * Uygulama ayarlarının TEK doğruluk kaynağı.
 * Yeni bir ayar alanı eklenirken burada da varsayılanı tanımlanmalıdır;
 * aksi halde eski kurulumlarda alan `undefined` kalır.
 */
export const defaultSettings: Settings = {
  askBeforeDeleteAll: true,
  darkMode: true,
  notificationsEnabled: true,
  // Günün özeti akşam gönderilir (bkz. notificationService.scheduleDailySummaryNotification)
  notificationTime: '20:00',
  pomodoroFocusTime: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroSoundEnabled: true,
};

/**
 * Diskten/buluttan gelen ayarları varsayılanların üzerine bindirir.
 * Eski sürümlerde kaydedilmiş eksik alanlar varsayılan değerini alır.
 */
export const withSettingsDefaults = (stored: unknown): Settings => {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return { ...defaultSettings };
  }
  return { ...defaultSettings, ...(stored as Partial<Settings>) };
};
