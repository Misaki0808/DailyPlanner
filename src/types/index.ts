// Gender tipi
export type Gender = 'male' | 'female';

// Alt Görev (Subtask) tipi
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

// Task (Görev) tipi
export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority?: 'low' | 'medium' | 'high';
  note?: string;
  category?: string; // Kategori id'si (ör: 'is', 'okul', 'spor')
  pomodoroCount?: number; // Bu göreve bağlı tamamlanan pomodoro sayısı
  subtasks?: Subtask[]; // Alt görevler listesi
  /**
   * Görev esnek tekrarlayan görev havuzundan eklendiyse, kaynak rutinin
   * kimliği. Diske ve bulut yedeğine yazılıyor; esnek görev eşleştirmesi
   * bu alana bakıyor (R-039).
   */
  recurringTaskId?: string;
  /**
   * Son içerik değişikliğinin ISO zamanı. Bulut birleştirmesinde iki cihaz
   * aynı görevi değiştirdiyse kazananı belirler (bkz. utils/syncMerge).
   * Eski kayıtlarda ve eski uygulama sürümlerinde bulunmaz.
   */
  updatedAt?: string;
}

// Tekrarlayan görev tipi
export interface RecurringTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  frequency: 'daily' | 'weekly' | 'monthly' | 'flexible';
  weekDays?: number[];   // weekly: [1, 3, 5] (Pzt, Çar, Cum)
  /** @deprecated Eski format — yeni kayıtlar weekDays kullanır */
  weekDay?: number;      // Eski format backward compat (tek gün)
  monthDay?: number;     // monthly: 1-31
  flexibleTarget?: number; // flexible: haftada kaç kez? (örneğin 2)
  isActive: boolean;
  createdAt: string;     // YYYY-MM-DD
  /**
   * Son değişikliğin ISO zamanı. Bulut birleştirmesinde iki cihaz aynı rutini
   * değiştirdiyse kazananı belirler (bkz. utils/syncMerge). Eski kayıtlarda ve
   * eski uygulama sürümlerinin yazdığı yedeklerde bulunmaz.
   */
  updatedAt?: string;
}

// Plan tipi - bir gün için plan
export interface DayPlan {
  date: string; // YYYY-MM-DD formatında
  tasks: Task[];
}

// Tüm planları saklayan yapı
export interface Plans {
  [date: string]: Task[]; // "2025-12-24": [task1, task2, ...]
}

// Settings tipi
export interface Settings {
  askBeforeDeleteAll: boolean; // Tüm planları silerken sor
  darkMode: boolean; // Karanlık tema
  notificationsEnabled: boolean; // Bildirimler aktif mi
  notificationTime: string; // Bildirim saati (HH:MM formatında)
  pomodoroFocusTime?: number; // dk cinsinden
  pomodoroShortBreak?: number; // dk cinsinden
  pomodoroLongBreak?: number; // dk cinsinden
  pomodoroSoundEnabled?: boolean; // Süre bitince bildirim sesi çal
  autoCleanOldPlans?: boolean; // Eski planları otomatik sil (varsayılan kapalı)
  autoCleanThresholdDays?: number; // Kaç günden eski planlar silinsin
  weeklyTaskGoal?: number; // Haftalık tamamlama hedefi (0 = kapalı)
}

// Gezinme tipleri src/navigation/routes.ts içindedir (tek doğruluk kaynağı).
// Buradaki kopya kaldırıldı: MultiDayView'ı parametresiz gösteriyor ve
// Archive rotasını bilmiyordu, yani onu okuyan yanlış bilgi alıyordu.
