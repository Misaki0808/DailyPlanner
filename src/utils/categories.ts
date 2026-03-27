// Görev kategorileri tanımları

export interface TaskCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export const TASK_CATEGORIES: TaskCategory[] = [
  { id: 'is',        label: 'İş',        emoji: '💼', color: '#4F46E5' },
  { id: 'kisisel',   label: 'Kişisel',   emoji: '🏠', color: '#8B5CF6' },
  { id: 'okul',      label: 'Okul',      emoji: '📚', color: '#3B82F6' },
  { id: 'spor',      label: 'Spor',      emoji: '🏃', color: '#F97316' },
  { id: 'saglik',    label: 'Sağlık',    emoji: '❤️', color: '#EF4444' },
  { id: 'alisveris', label: 'Alışveriş', emoji: '🛒', color: '#F59E0B' },
  { id: 'sosyal',    label: 'Sosyal',    emoji: '🎉', color: '#EC4899' },
  { id: 'diger',     label: 'Diğer',     emoji: '📁', color: '#6B7280' },
];

export const getCategoryById = (id: string): TaskCategory => {
  return TASK_CATEGORIES.find(c => c.id === id) || TASK_CATEGORIES[TASK_CATEGORIES.length - 1]; // fallback: Diğer
};

export const getCategoryColor = (id?: string): string => {
  if (!id) return '#6B7280'; // Diğer
  return getCategoryById(id).color;
};

export const getCategoryEmoji = (id?: string): string => {
  if (!id) return '📁';
  return getCategoryById(id).emoji;
};

export const getCategoryLabel = (id?: string): string => {
  if (!id) return 'Diğer';
  return getCategoryById(id).label;
};
