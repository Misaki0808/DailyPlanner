import { clampDayToMonth, getDaysInMonth } from './dateUtils';

export type PickerDate = { year: number; month: number; day: number };

export const MIN_PICKER_YEAR = 2025;
export const MAX_PICKER_YEAR = 2030;

/**
 * Tarih seçicisinin saf mantığı.
 *
 * Yıl/ay/gün daha önce üç ayrı React state'inde tutuluyordu ve adım
 * fonksiyonları birbirini çağırıyordu; çağrılan fonksiyon hâlâ render anındaki
 * BAYAT günü okuduğu için 31 Ocak'ta "gün ileri" 1 Şubat yerine 28 Şubat'a
 * atlıyordu. Ayrıca ay/yıl değişiminde gün kırpılmadığı için "2029-02-29"
 * gibi var olmayan tarihler kaydedilebiliyordu.
 *
 * Buradaki fonksiyonlar tam bir tarihi alıp tam bir tarih döndürür; ara durum
 * yoktur, bu yüzden aynı hata sınıfı tekrar edemez. Dönen tarih her zaman
 * geçerli bir takvim günüdür.
 */

const withClampedDay = (year: number, month: number, day: number): PickerDate => ({
  year,
  month,
  day: clampDayToMonth(year, month, day),
});

const isYearInRange = (year: number) => year >= MIN_PICKER_YEAR && year <= MAX_PICKER_YEAR;

/** YYYY-MM-DD metnini seçici durumuna çevirir; boş/bozuk girdide bugüne düşer. */
export const toPickerDate = (dateStr: string, today: Date = new Date()): PickerDate => {
  const [year, month, day] = (dateStr || '').split('-').map(Number);

  if (!year || !month || !day || month < 1 || month > 12) {
    return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  }

  return withClampedDay(year, month, day);
};

/** YYYY-MM-DD metnine çevirir. */
export const fromPickerDate = ({ year, month, day }: PickerDate): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const stepYear = (current: PickerDate, increment: number): PickerDate => {
  const year = current.year + increment;
  if (!isYearInRange(year)) return current;
  return withClampedDay(year, current.month, current.day);
};

export const stepMonth = (current: PickerDate, increment: number): PickerDate => {
  let month = current.month + increment;
  let year = current.year;

  if (month > 12) { month = 1; year++; }
  else if (month < 1) { month = 12; year--; }

  if (!isYearInRange(year)) return current;
  return withClampedDay(year, month, current.day);
};

export const stepDay = (current: PickerDate, increment: number): PickerDate => {
  const day = current.day + increment;

  // Ayın sonunu aştı -> sonraki ayın İLK günü
  if (day > getDaysInMonth(current.year, current.month)) {
    const year = current.month === 12 ? current.year + 1 : current.year;
    const month = current.month === 12 ? 1 : current.month + 1;
    if (!isYearInRange(year)) return current;
    return { year, month, day: 1 };
  }

  // Ayın başından geriye gitti -> önceki ayın SON günü
  if (day < 1) {
    const year = current.month === 1 ? current.year - 1 : current.year;
    const month = current.month === 1 ? 12 : current.month - 1;
    if (!isYearInRange(year)) return current;
    return { year, month, day: getDaysInMonth(year, month) };
  }

  return { ...current, day };
};
