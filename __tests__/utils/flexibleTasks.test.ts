import {
  DEFAULT_FLEXIBLE_TARGET,
  buildFlexibleTaskProgress,
  getFlexibleWeeklyTarget,
  normalizeTaskTitle,
} from '../../src/utils/flexibleTasks';
import { Plans, RecurringTask, Task } from '../../src/types';

const flexible = (over: Partial<RecurringTask> = {}): RecurringTask => ({
  id: 'f1',
  title: 'Spor yap',
  priority: 'medium',
  frequency: 'flexible',
  flexibleTarget: 3,
  isActive: true,
  createdAt: '2026-09-01',
  ...over,
});

const task = (title: string, extra: Partial<Task> & { recurringTaskId?: string } = {}): Task =>
  ({ id: `t-${title}`, title, done: false, ...extra }) as Task;

// 2026-09-07 Pazartesi … 2026-09-13 Pazar
const MONDAY = '2026-09-07';
const WEDNESDAY = '2026-09-09';

describe('getFlexibleWeeklyTarget', () => {
  it('tanımlı hedefi kullanır', () => {
    expect(getFlexibleWeeklyTarget(flexible({ flexibleTarget: 4 }))).toBe(4);
  });

  // Regresyon (R-026): hedefi eksik kayıt havuz filtresine takılıp hiç
  // görünmüyor, otomatik de eklenmediği için uygulamada tamamen kayboluyordu.
  it('hedef eksikse tabana düşer', () => {
    expect(getFlexibleWeeklyTarget(flexible({ flexibleTarget: undefined }))).toBe(DEFAULT_FLEXIBLE_TARGET);
  });

  it('geçersiz hedefleri tabana düşürür', () => {
    expect(getFlexibleWeeklyTarget(flexible({ flexibleTarget: 0 }))).toBe(DEFAULT_FLEXIBLE_TARGET);
    expect(getFlexibleWeeklyTarget(flexible({ flexibleTarget: -2 }))).toBe(DEFAULT_FLEXIBLE_TARGET);
    expect(getFlexibleWeeklyTarget(flexible({ flexibleTarget: NaN }))).toBe(DEFAULT_FLEXIBLE_TARGET);
  });

  it('ondalık hedefi aşağı yuvarlar', () => {
    expect(getFlexibleWeeklyTarget(flexible({ flexibleTarget: 2.9 }))).toBe(2);
  });
});

describe('buildFlexibleTaskProgress', () => {
  it('yalnız aktif esnek görevleri alır', () => {
    const tasks = [
      flexible({ id: 'a' }),
      flexible({ id: 'b', isActive: false }),
      flexible({ id: 'c', frequency: 'daily' }),
    ];

    const result = buildFlexibleTaskProgress(tasks, {}, WEDNESDAY);

    expect(result.map(r => r.id)).toEqual(['a']);
  });

  it('hedefi eksik görevi de havuzda gösterir', () => {
    const result = buildFlexibleTaskProgress([flexible({ flexibleTarget: undefined })], {}, WEDNESDAY);

    expect(result).toHaveLength(1);
    expect(result[0].target).toBe(DEFAULT_FLEXIBLE_TARGET);
  });

  it('haftadaki yapılmış günleri sayar', () => {
    const plans: Plans = {
      [MONDAY]: [task('Spor yap')],
      [WEDNESDAY]: [task('Spor yap')],
      '2026-09-06': [task('Spor yap')], // ÖNCEKİ hafta — sayılmamalı
    };

    const result = buildFlexibleTaskProgress([flexible()], plans, WEDNESDAY);

    expect(result[0].currentCount).toBe(2);
  });

  it('havuzdan eklenen görevi recurringTaskId ile eşler', () => {
    const plans: Plans = {
      [MONDAY]: [task('Bambaşka bir başlık', { recurringTaskId: 'f1' } as any)],
    };

    const result = buildFlexibleTaskProgress([flexible()], plans, WEDNESDAY);

    expect(result[0].currentCount).toBe(1);
  });

  it('başka bir rutine ait görevi saymaz', () => {
    const plans: Plans = {
      [MONDAY]: [task('Spor yap', { recurringTaskId: 'baska' } as any)],
    };

    const result = buildFlexibleTaskProgress([flexible()], plans, WEDNESDAY);

    expect(result[0].currentCount).toBe(0);
  });

  it('elle yazılmış aynı başlığı Türkçe harf/boşluk farkına rağmen sayar', () => {
    const plans: Plans = { [MONDAY]: [task('  SPOR YAP  ')] };

    const result = buildFlexibleTaskProgress([flexible()], plans, WEDNESDAY);

    expect(result[0].currentCount).toBe(1);
  });

  it('seçili güne eklenmişse işaretler', () => {
    const plans: Plans = { [WEDNESDAY]: [task('Spor yap')] };

    const result = buildFlexibleTaskProgress([flexible()], plans, WEDNESDAY);

    expect(result[0].isAddedToSelectedDay).toBe(true);
  });

  it('hedefi dolan görevi listeden düşürür', () => {
    const plans: Plans = {
      [MONDAY]: [task('Spor yap')],
      '2026-09-08': [task('Spor yap')],
      '2026-09-10': [task('Spor yap')],
    };

    const result = buildFlexibleTaskProgress([flexible({ flexibleTarget: 3 })], plans, WEDNESDAY);

    expect(result).toHaveLength(0);
  });

  it('hedef dolsa bile seçili güne eklendiyse listede kalır', () => {
    const plans: Plans = {
      [MONDAY]: [task('Spor yap')],
      '2026-09-08': [task('Spor yap')],
      [WEDNESDAY]: [task('Spor yap')],
    };

    const result = buildFlexibleTaskProgress([flexible({ flexibleTarget: 3 })], plans, WEDNESDAY);

    expect(result).toHaveLength(1);
    expect(result[0].isAddedToSelectedDay).toBe(true);
  });

  it('esnek görev yoksa boş liste döner', () => {
    expect(buildFlexibleTaskProgress([], {}, WEDNESDAY)).toEqual([]);
  });

  it('eksik gün listelerinde çökmez', () => {
    const plans = { [MONDAY]: undefined } as unknown as Plans;
    expect(() => buildFlexibleTaskProgress([flexible()], plans, WEDNESDAY)).not.toThrow();
  });
});

describe('normalizeTaskTitle', () => {
  it('Türkçe büyük harf ve boşlukları normalleştirir', () => {
    expect(normalizeTaskTitle('  SPOR YAP ')).toBe(normalizeTaskTitle('spor yap'));
    expect(normalizeTaskTitle('İLAÇ AL')).toBe(normalizeTaskTitle('ilaç al'));
  });
});
