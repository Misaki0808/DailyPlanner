import { calculatePomodoroStreak } from '../../src/utils/pomodoroStats';
import { getToday } from '../../src/utils/dateUtils';

describe('calculatePomodoroStreak', () => {
  it('counts consecutive days including today', () => {
    expect(calculatePomodoroStreak({
      '2026-06-29': 1,
      '2026-06-30': 2,
      '2026-07-01': 1,
    }, '2026-07-01')).toBe(3);
  });

  it('continues from yesterday when today has no sessions', () => {
    expect(calculatePomodoroStreak({
      '2026-06-29': 1,
      '2026-06-30': 2,
    }, '2026-07-01')).toBe(2);
  });

  it('stops at the first empty day before the streak', () => {
    expect(calculatePomodoroStreak({
      '2026-06-27': 3,
      '2026-06-29': 1,
      '2026-06-30': 1,
      '2026-07-01': 1,
    }, '2026-07-01')).toBe(3);
  });

  it('hiç oturum yoksa 0 döner', () => {
    expect(calculatePomodoroStreak({}, '2026-07-01')).toBe(0);
  });

  it('yıl sınırını geçen seriyi doğru sayar', () => {
    expect(calculatePomodoroStreak({
      '2025-12-30': 1,
      '2025-12-31': 1,
      '2026-01-01': 1,
    }, '2026-01-01')).toBe(3);
  });

  it('ay sınırını geçen seriyi doğru sayar', () => {
    expect(calculatePomodoroStreak({
      '2026-02-27': 1,
      '2026-02-28': 1,
      '2026-03-01': 1,
    }, '2026-03-01')).toBe(3);
  });

  // Regresyon: eski StatsSection kopyası günleri toISOString() ile (UTC)
  // anahtarlıyordu. jest.setup.js TZ'yi UTC+3'e sabitler; UTC 21:00'de yerel
  // gün çoktan ertesi güne geçmiştir. UTC anahtarlayan bir uygulama bugünün
  // kaydını bulamaz ve seriyi 0 sayardı.
  it('yerel gün UTC gününden ileriyken seriyi bozmaz', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-05T21:00:00Z')); // Istanbul: 06.09 00:00
    try {
      const stats = {
        '2026-09-04': 2,
        '2026-09-05': 3,
        '2026-09-06': 1,
      };
      expect(new Date().toISOString().split('T')[0]).toBe('2026-09-05');
      expect(getToday()).toBe('2026-09-06');
      expect(calculatePomodoroStreak(stats, getToday())).toBe(3);
    } finally {
      jest.useRealTimers();
    }
  });
});
