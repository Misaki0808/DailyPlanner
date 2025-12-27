// Task (Görev) tipi
export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority?: 'low' | 'medium' | 'high'; // Yeşil, Sarı, Kırmızı
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
}

// Navigation için tip tanımları
export type RootTabParamList = {
  CreatePlan: undefined;
  MultiDay: undefined;
  Settings: undefined;
};
