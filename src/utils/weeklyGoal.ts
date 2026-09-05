import { Plans } from '../types';
import { formatDate, getToday, parseDate } from './dateUtils';
import { getWeekDates } from './weekUtils';

export interface WeeklyGoalProgress {
  /** Bu hafta (Pzt-Paz) tamamlanan görev sayısı */
  completed: number;
  /** Hedeflenen görev sayısı */
  goal: number;
  /** 0-100 arası, hedefi aşsa bile 100'de durur */
  percentage: number;
  reached: boolean;
  /** Hedefe kalan görev sayısı (hedefe ulaşıldıysa 0) */
  remaining: number;
}

/** Verilen günlerde tamamlanmış görevleri sayar. */
export const countCompletedTasks = (plans: Plans, dates: string[]): number =>
  dates.reduce((sum, date) => sum + (plans[date] || []).filter(t => t.done).length, 0);

/**
 * İçinde bulunulan haftanın görev tamamlama hedefine göre ilerlemesi.
 * Hafta Pazartesi başlar; esnek görev havuzu ve takvimlerle aynı tanım.
 */
export const getWeeklyGoalProgress = (
  plans: Plans,
  goal: number,
  today: string = getToday()
): WeeklyGoalProgress => {
  const completed = countCompletedTasks(plans, getWeekDates(today));
  const safeGoal = Math.max(0, Math.floor(goal));

  if (safeGoal <= 0) {
    return { completed, goal: 0, percentage: 0, reached: false, remaining: 0 };
  }

  return {
    completed,
    goal: safeGoal,
    percentage: Math.min(100, Math.round((completed / safeGoal) * 100)),
    reached: completed >= safeGoal,
    remaining: Math.max(0, safeGoal - completed),
  };
};

/**
 * Üst üste en az bir görev tamamlanan gün sayısı (görev tamamlama serisi).
 *
 * Pomodoro serisiyle aynı hoşgörüyü taşır: bugün henüz hiçbir görev
 * tamamlanmadıysa seri bozulmuş sayılmaz, düne bakılır. Günler `dateUtils`
 * ile YEREL tarihe göre gezilir — planlar da öyle anahtarlanıyor.
 */
export const calculateTaskStreak = (plans: Plans, today: string = getToday()): number => {
  let streak = 0;
  const date = parseDate(today);

  while (true) {
    const dateStr = formatDate(date);
    const completedCount = (plans[dateStr] || []).filter(t => t.done).length;

    if (completedCount > 0) {
      streak++;
      date.setDate(date.getDate() - 1);
      continue;
    }

    if (streak === 0 && dateStr === today) {
      date.setDate(date.getDate() - 1);
      continue;
    }

    break;
  }

  return streak;
};
