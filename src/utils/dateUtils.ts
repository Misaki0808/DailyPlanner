/**
 * Tarihi YYYY-MM-DD formatına çevirir
 */
import uuid from 'react-native-uuid';

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * YYYY-MM-DD formatındaki string'i Date'e çevirir
 */
export const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Bugünün tarihini döndürür (YYYY-MM-DD)
 */
export const getToday = (): string => {
  return formatDate(new Date());
};

/**
 * Yarının tarihini döndürür (YYYY-MM-DD)
 */
export const getTomorrow = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
};

/**
 * Tarihe gün sayısı ekler/çıkarır
 */
export const addDays = (dateString: string, days: number): string => {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

/**
 * Verilen ayın kaç gün çektiğini döndürür (month: 1-12)
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

/**
 * Günü, ayın gerçek uzunluğuna kırpar.
 * 31 Ocak'tan Şubat'a geçerken günün 31 kalıp "2026-02-31" gibi
 * var olmayan bir tarih üretmesini engeller.
 */
export const clampDayToMonth = (year: number, month: number, day: number): number => {
  return Math.min(Math.max(day, 1), getDaysInMonth(year, month));
};

/**
 * Yıl/ay/gün üçlüsünü YYYY-MM-DD'ye çevirir.
 * Gün ayın uzunluğuna kırpıldığı için sonuç her zaman geçerli bir takvim günüdür.
 */
export const toDateString = (year: number, month: number, day: number): string => {
  const safeDay = clampDayToMonth(year, month, day);
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
};

/**
 * Tarihi güzel formatta gösterir (örn: "24 Aralık 2025")
 */
export const formatDateDisplay = (dateString: string): string => {
  const date = parseDate(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return date.toLocaleDateString('tr-TR', options);
};

/**
 * İki tarihi karşılaştırır
 */
export const isSameDate = (date1: string, date2: string): boolean => {
  return date1 === date2;
};

/**
 * Tarih bugün mü kontrol eder
 */
export const isToday = (dateString: string): boolean => {
  return isSameDate(dateString, getToday());
};

/**
 * Benzersiz ID üretir
 */
export const generateId = (): string => {
  return uuid.v4() as string;
};
