import { getWeekStart, getWeekDates } from '../../src/utils/weekUtils';
import {
  calculateTaskStreak,
  countCompletedTasks,
  getWeeklyGoalProgress,
} from '../../src/utils/weeklyGoal';
import { getToday } from '../../src/utils/dateUtils';
import { defaultSettings, withSettingsDefaults } from '../../src/utils/defaultSettings';
import { Plans, Task } from '../../src/types';

const task = (id: string, done: boolean): Task => ({ id, title: `Görev ${id}`, done });
const day = (doneCount: number, openCount = 0): Task[] => [
  ...Array.from({ length: doneCount }, (_, i) => task(`d${i}`, true)),
  ...Array.from({ length: openCount }, (_, i) => task(`o${i}`, false)),
];

describe('getWeekStart', () => {
  it('haftayı Pazartesi başlatır', () => {
    // 2026-09-07 Pazartesi, 2026-09-13 Pazar
    expect(getWeekStart('2026-09-07')).toBe('2026-09-07');
    expect(getWeekStart('2026-09-10')).toBe('2026-09-07');
    expect(getWeekStart('2026-09-13')).toBe('2026-09-07');
  });

  it('Pazar gününü BİR ÖNCEKİ Pazartesiye bağlar', () => {
    // Pazar getDay() === 0; yanlış ele alınırsa hafta bir gün kayar
    expect(getWeekStart('2026-09-06')).toBe('2026-08-31');
  });

  it('ay ve yıl sınırını geçer', () => {
    expect(getWeekStart('2026-03-01')).toBe('2026-02-23'); // Pazar
    expect(getWeekStart('2027-01-01')).toBe('2026-12-28'); // Cuma
  });
});

describe('getWeekDates', () => {
  it('Pazartesiden Pazara 7 gün döndürür', () => {
    expect(getWeekDates('2026-09-10')).toEqual([
      '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10',
      '2026-09-11', '2026-09-12', '2026-09-13',
    ]);
  });
});

describe('countCompletedTasks', () => {
  it('yalnız tamamlananları sayar', () => {
    const plans: Plans = { '2026-09-07': day(2, 3), '2026-09-08': day(1, 1) };
    expect(countCompletedTasks(plans, ['2026-09-07', '2026-09-08'])).toBe(3);
  });

  it('olmayan günleri 0 sayar', () => {
    expect(countCompletedTasks({}, ['2026-09-07'])).toBe(0);
  });
});

describe('getWeeklyGoalProgress', () => {
  const plans: Plans = {
    '2026-09-07': day(3),
    '2026-09-09': day(2, 4),
    '2026-09-13': day(1),
    // Hafta DIŞI — sayılmamalı
    '2026-09-06': day(9),
    '2026-09-14': day(9),
  };

  it('yalnız içinde bulunulan haftayı sayar', () => {
    const progress = getWeeklyGoalProgress(plans, 20, '2026-09-10');
    expect(progress.completed).toBe(6);
  });

  it('yüzde ve kalanı hesaplar', () => {
    const progress = getWeeklyGoalProgress(plans, 12, '2026-09-10');
    expect(progress.percentage).toBe(50);
    expect(progress.remaining).toBe(6);
    expect(progress.reached).toBe(false);
  });

  it('hedefe ulaşınca reached olur ve kalan 0 iner', () => {
    const progress = getWeeklyGoalProgress(plans, 6, '2026-09-10');
    expect(progress.reached).toBe(true);
    expect(progress.remaining).toBe(0);
    expect(progress.percentage).toBe(100);
  });

  it('hedef aşılsa bile yüzde 100de durur', () => {
    const progress = getWeeklyGoalProgress(plans, 3, '2026-09-10');
    expect(progress.percentage).toBe(100);
  });

  it('hedef 0 veya negatifse kapalı sayılır', () => {
    expect(getWeeklyGoalProgress(plans, 0, '2026-09-10')).toMatchObject({ goal: 0, reached: false });
    expect(getWeeklyGoalProgress(plans, -5, '2026-09-10')).toMatchObject({ goal: 0 });
  });

  // R-033: özellik varsayılan olarak KAPALI gelmeli; mevcut kullanıcılarda
  // kendiliğinden bir hedef belirmemeli.
  it('varsayılan ayarlarda kapalıdır', () => {
    expect(defaultSettings.weeklyTaskGoal).toBe(0);

    const progress = getWeeklyGoalProgress(plans, defaultSettings.weeklyTaskGoal ?? 0, '2026-09-10');
    expect(progress.goal).toBe(0);
    expect(progress.reached).toBe(false);
    expect(progress.percentage).toBe(0);
  });

  it('ayarı hiç kaydedilmemiş kullanıcıda da kapalı gelir', () => {
    // withSettingsDefaults eksik alanı varsayılanla doldurur.
    const migrated = withSettingsDefaults({ darkMode: true, notificationTime: '20:00' });
    expect(migrated.weeklyTaskGoal).toBe(0);
  });

  it('hiç görev yoksa sıfıra bölme yapmaz', () => {
    const progress = getWeeklyGoalProgress({}, 20, '2026-09-10');
    expect(progress.completed).toBe(0);
    expect(progress.percentage).toBe(0);
    expect(progress.remaining).toBe(20);
  });
});

describe('calculateTaskStreak', () => {
  it('üst üste tamamlanan günleri sayar', () => {
    const plans: Plans = {
      '2026-09-08': day(1),
      '2026-09-09': day(2),
      '2026-09-10': day(1),
    };
    expect(calculateTaskStreak(plans, '2026-09-10')).toBe(3);
  });

  it('bugün henüz tamamlanmadıysa seriyi bozmaz', () => {
    const plans: Plans = {
      '2026-09-08': day(1),
      '2026-09-09': day(1),
      '2026-09-10': day(0, 3), // sadece açık görevler
    };
    expect(calculateTaskStreak(plans, '2026-09-10')).toBe(2);
  });

  it('araya boş gün girerse durur', () => {
    const plans: Plans = {
      '2026-09-06': day(5),
      '2026-09-08': day(1),
      '2026-09-09': day(1),
      '2026-09-10': day(1),
    };
    expect(calculateTaskStreak(plans, '2026-09-10')).toBe(3);
  });

  it('hiç tamamlanan yoksa 0 döner', () => {
    expect(calculateTaskStreak({}, '2026-09-10')).toBe(0);
  });

  it('ay ve yıl sınırını geçer', () => {
    const plans: Plans = {
      '2025-12-30': day(1),
      '2025-12-31': day(1),
      '2026-01-01': day(1),
    };
    expect(calculateTaskStreak(plans, '2026-01-01')).toBe(3);
  });

  // Regresyon koruması: hesap YEREL tarihe göre gezilmeli (planlar öyle
  // anahtarlanıyor). jest.setup.js TZ'yi UTC+3'e sabitler.
  it('gece yarısından sonra yerel günü esas alır', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-09T21:30:00Z')); // Istanbul: 10.09 00:30
    try {
      expect(getToday()).toBe('2026-09-10');
      const plans: Plans = { '2026-09-09': day(1), '2026-09-10': day(1) };
      expect(calculateTaskStreak(plans)).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
