import { Plans } from '../types';
import { addDays, getToday, parseDate } from './dateUtils';

export interface WeeklyStatsDay {
  /** YYYY-MM-DD (YEREL tarih) */
  date: string;
  /** Kısa gün adı, ör. "Pzt" */
  dayName: string;
  total: number;
  completed: number;
  /** 0-100 arası tamamlanma yüzdesi */
  percentage: number;
  isToday: boolean;
}

/**
 * Son 7 günün (bugün dahil) tamamlanma verisini üretir.
 *
 * Günler `dateUtils` üzerinden YEREL tarihe göre anahtarlanır — planlar da
 * öyle saklanıyor. Bu hesap daha önce iki grafik bileşeninde ayrı ayrı
 * yazılmıştı ve biri `toISOString()` (UTC) kullandığı için çubuklar komşu
 * günün verisini gösteriyordu. Tek kaynak, ikisinin yeniden ayrışmasını
 * engeller.
 */
export const buildWeeklyStats = (plans: Plans, today: string = getToday()): WeeklyStatsDay[] => {
  const days: WeeklyStatsDay[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    const dayTasks = plans[date] || [];
    const total = dayTasks.length;
    const completed = dayTasks.filter(t => t.done).length;

    days.push({
      date,
      dayName: new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(parseDate(date)),
      total,
      completed,
      percentage: total > 0 ? (completed / total) * 100 : 0,
      isToday: date === today,
    });
  }

  return days;
};
