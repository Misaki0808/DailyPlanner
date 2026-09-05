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
  // Onaylanmış ürün panosu gereği KAPALI gelir (task.md 3.5 "Varsayılan: KAPALI"
  // ve öncelik tablosu satır 9). Kullanıcı ayarlardan açar.
  pomodoroSoundEnabled: false,
  // Eski planların silinmesi geri alınamaz ve İstatistikler ekranı bu geçmişe
  // dayanıyor; kullanıcı açıkça istemedikçe hiçbir plan silinmez.
  autoCleanOldPlans: false,
  autoCleanThresholdDays: 365,
  // Haftada tamamlanması hedeflenen görev sayısı; 0 = KAPALI, rozet gizli.
  // Ürün paterni gereği yeni özellikler kapalı gelir (task.md 3.5 emsali):
  // kullanıcı Ayarlar'dan bir hedef seçerek açar.
  weeklyTaskGoal: 0,
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
