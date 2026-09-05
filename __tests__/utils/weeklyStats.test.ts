import { buildWeeklyStats } from '../../src/utils/weeklyStats';
import { getToday } from '../../src/utils/dateUtils';
import { Plans, Task } from '../../src/types';

const task = (id: string, done: boolean): Task => ({ id, title: `Görev ${id}`, done });

describe('buildWeeklyStats', () => {
  it('bugün dahil 7 gün döndürür ve en yeni sonda olur', () => {
    const days = buildWeeklyStats({}, '2026-09-07');

    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-09-01');
    expect(days[6].date).toBe('2026-09-07');
    expect(days[6].isToday).toBe(true);
    expect(days.filter(d => d.isToday)).toHaveLength(1);
  });

  it('tamamlanma sayısını ve yüzdesini hesaplar', () => {
    const plans: Plans = {
      '2026-09-07': [task('1', true), task('2', true), task('3', false), task('4', false)],
    };

    const today = buildWeeklyStats(plans, '2026-09-07')[6];

    expect(today.total).toBe(4);
    expect(today.completed).toBe(2);
    expect(today.percentage).toBe(50);
  });

  it('görevi olmayan günde yüzdeyi 0 verir (sıfıra bölme yok)', () => {
    const day = buildWeeklyStats({}, '2026-09-07')[6];
    expect(day.total).toBe(0);
    expect(day.percentage).toBe(0);
  });

  it('ay sınırını geriye doğru doğru geçer', () => {
    const days = buildWeeklyStats({}, '2026-03-03');
    expect(days[0].date).toBe('2026-02-25');
    expect(days.map(d => d.date)).toContain('2026-02-28');
    expect(days.map(d => d.date)).toContain('2026-03-01');
  });

  it('yıl sınırını geriye doğru doğru geçer', () => {
    const days = buildWeeklyStats({}, '2027-01-02');
    expect(days[0].date).toBe('2026-12-27');
    expect(days[6].date).toBe('2027-01-02');
  });

  it('gün adını tarihe göre üretir', () => {
    // 2026-09-07 Pazartesi
    const days = buildWeeklyStats({}, '2026-09-07');
    expect(days[6].dayName.toLocaleLowerCase('tr-TR')).toContain('pzt');
  });

  // Regresyon (R-004 / W-08): eski uygulama günleri toISOString() ile
  // anahtarlıyordu. jest.setup.js TZ'yi UTC+3'e sabitler; UTC 22:30'da yerel
  // gün çoktan ertesi güne geçmiştir. UTC anahtarlayan bir sürüm "bugün"
  // olarak bir önceki günü işaretlerdi.
  it('gece yarısından sonra bugünü YEREL güne göre işaretler', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-06T22:30:00Z')); // Istanbul: 07.09 01:30
    try {
      expect(new Date().toISOString().split('T')[0]).toBe('2026-09-06');
      expect(getToday()).toBe('2026-09-07');

      const plans: Plans = { '2026-09-07': [task('1', true)] };
      const days = buildWeeklyStats(plans); // today parametresi verilmiyor
      const todayEntry = days.find(d => d.isToday);

      expect(todayEntry?.date).toBe('2026-09-07');
      expect(todayEntry?.completed).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
