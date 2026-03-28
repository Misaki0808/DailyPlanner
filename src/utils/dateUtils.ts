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
