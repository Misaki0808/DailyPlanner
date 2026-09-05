import { addDays, formatDate, parseDate } from './dateUtils';

/**
 * Haftanın Pazartesi başladığı varsayılır (tr-TR yerelinde ve takvimlerde
 * `firstDay={1}` ile tutarlı).
 */
export const getWeekStart = (dateStr: string): string => {
  const date = parseDate(dateStr);
  // getDay(): Pazar = 0 → haftanın 7. günü sayılır
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() - dayOfWeek + 1);
  return formatDate(date);
};

/** Verilen günün içinde bulunduğu haftanın 7 gününü Pazartesi'den başlayarak döndürür. */
export const getWeekDates = (dateStr: string): string[] => {
  const monday = getWeekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};
