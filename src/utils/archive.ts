import { Plans, Task } from '../types';
import { getToday, parseDate } from './dateUtils';

/**
 * Geçmiş planların ay/gün olarak gruplanması ("Geçmiş" ekranı).
 *
 * Otomatik temizlik varsayılan kapalı olduğu için geçmiş sınırsız birikiyor;
 * bu yüzden gruplama saf ve testlenebilir tutuldu, ekran yalnız çiziyor.
 */

export interface ArchiveDay {
  /** YYYY-MM-DD */
  date: string;
  /** "5 Eylül 2026 Cumartesi" */
  label: string;
  tasks: Task[];
  total: number;
  completed: number;
  /** 0-100 */
  percentage: number;
}

export interface ArchiveMonth {
  /** YYYY-MM */
  key: string;
  /** "Eylül 2026" */
  label: string;
  days: ArchiveDay[];
  total: number;
  completed: number;
  percentage: number;
}

const monthFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
});

const percent = (completed: number, total: number): number =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

/**
 * Geçmiş günleri aya göre gruplar; hem aylar hem günler YENİDEN ESKİYE sıralanır.
 *
 * Kapsam kararı: yalnız BUGÜNDEN ÖNCEKİ günler. Bugün ve ileri tarihler
 * Planlarım/Takvim ekranlarının işi; arşivin amacı ulaşılması zorlaşan eski
 * günler. Görevi olmayan günler de atlanır — arşivde gürültü yaratıyorlar.
 */
export const buildArchiveMonths = (plans: Plans, today: string = getToday()): ArchiveMonth[] => {
  const monthMap = new Map<string, ArchiveDay[]>();

  Object.keys(plans)
    .filter(date => date < today)
    .sort((a, b) => b.localeCompare(a))
    .forEach(date => {
      const tasks = plans[date] || [];
      if (tasks.length === 0) return;

      const completed = tasks.filter(task => task.done).length;
      const day: ArchiveDay = {
        date,
        label: dayFormatter.format(parseDate(date)),
        tasks,
        total: tasks.length,
        completed,
        percentage: percent(completed, tasks.length),
      };

      const monthKey = date.slice(0, 7);
      const existing = monthMap.get(monthKey);
      if (existing) existing.push(day);
      else monthMap.set(monthKey, [day]);
    });

  return Array.from(monthMap.entries()).map(([key, days]) => {
    const total = days.reduce((sum, day) => sum + day.total, 0);
    const completed = days.reduce((sum, day) => sum + day.completed, 0);

    return {
      key,
      label: monthFormatter.format(parseDate(`${key}-01`)),
      days,
      total,
      completed,
      percentage: percent(completed, total),
    };
  });
};

export interface ArchiveSummary {
  monthCount: number;
  dayCount: number;
  total: number;
  completed: number;
  percentage: number;
  /** Arşivdeki en eski gün (YYYY-MM-DD), yoksa null */
  oldestDate: string | null;
}

/** Arşivin tamamının özeti (ekranın üst bandı için). */
export const summarizeArchive = (months: ArchiveMonth[]): ArchiveSummary => {
  const dayCount = months.reduce((sum, month) => sum + month.days.length, 0);
  const total = months.reduce((sum, month) => sum + month.total, 0);
  const completed = months.reduce((sum, month) => sum + month.completed, 0);
  const lastMonth = months[months.length - 1];

  return {
    monthCount: months.length,
    dayCount,
    total,
    completed,
    percentage: percent(completed, total),
    oldestDate: lastMonth ? lastMonth.days[lastMonth.days.length - 1].date : null,
  };
};
