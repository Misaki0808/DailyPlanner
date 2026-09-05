import { formatDate, parseDate } from './dateUtils';

/**
 * Verilen güne kadar kesintisiz süren pomodoro serisini (streak) hesaplar.
 *
 * `pomodoroStats` YEREL tarihe göre anahtarlanır (bkz. pomodoroStore →
 * getToday), bu yüzden gün gezinmesi de yerel tarih üzerinden yapılmalıdır;
 * `toISOString()` kullanmak UTC'ye kayıp seriyi yanlış hesaplar.
 *
 * Bugün henüz pomodoro yapılmamışsa seri bozulmuş sayılmaz, düne bakılır.
 */
export const calculatePomodoroStreak = (
  pomodoroStats: Record<string, number>,
  today: string
): number => {
  let streak = 0;
  const date = parseDate(today);

  while (true) {
    const dateStr = formatDate(date);
    if ((pomodoroStats[dateStr] || 0) > 0) {
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
