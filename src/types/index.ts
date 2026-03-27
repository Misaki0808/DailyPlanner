// Gender tipi
export type Gender = 'male' | 'female';

// Task (Görev) tipi
export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority?: 'low' | 'medium' | 'high';
  note?: string;
  category?: string; // Kategori id'si (ör: 'is', 'okul', 'spor')
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
}

// Navigation için tip tanımları
export type RootTabParamList = {
  CreatePlan: undefined;
  MultiDayView: undefined;
  PlanOverview: undefined;
  Settings: undefined;
};
