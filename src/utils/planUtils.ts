import { Plans } from '../types';
import { addDays, getToday } from './dateUtils';

/** İleri doğru en fazla bu kadar gün taranır (1 yıl). */
const MAX_LOOKAHEAD_DAYS = 365;

/**
 * Başlangıç gününden itibaren planı boş olan ilk günü döndürür.
 * Bir yıl içinde boş gün bulunamazsa başlangıç gününe döner.
 */
export const findFirstEmptyDate = (plans: Plans, startDate: string = getToday()): string => {
  let currentDate = startDate;

  for (let daysChecked = 0; daysChecked < MAX_LOOKAHEAD_DAYS; daysChecked++) {
    if (!plans[currentDate] || plans[currentDate].length === 0) {
      return currentDate;
    }
    currentDate = addDays(currentDate, 1);
  }

  return startDate;
};
