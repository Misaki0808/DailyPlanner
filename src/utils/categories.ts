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

export const FALLBACK_CATEGORY_ID = 'diger';

/**
 * Görevdeki kategori kimliğini BİLİNEN bir kimliğe indirger.
 *
 * Eski sürümlerden ya da bulut yedeğinden tanınmayan bir kimlik gelebilir.
 * Böyle bir görev sayımlarda kendi başına durursa ekranlar ayrışıyordu:
 * İstatistikler listesi satırı tamamen atlıyor (görevler yüzdelerden sessizce
 * düşüyor), halka grafik ise ayrı bir "Diğer" renkli dilim çiziyordu.
 * Sayım öncesi indirgeme, iki ekranı da tek bir "Diğer" altında birleştirir.
 */
export const normalizeCategoryId = (id?: string): string =>
  TASK_CATEGORIES.some(c => c.id === id) ? (id as string) : FALLBACK_CATEGORY_ID;

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
