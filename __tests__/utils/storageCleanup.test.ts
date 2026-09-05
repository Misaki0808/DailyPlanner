import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cleanOldPlans,
  getAllPlans,
  migratePlansIfNecessary,
  savePlan,
  updateTask,
} from '../../src/utils/storage';
import { Task } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const PLAN_PREFIX = '@dp_plan_';
const LAST_CLEANUP_KEY = '@daily_planner_last_cleanup_date';
const OLD_PLANS_KEY = '@daily_planner_plans';

const task = (id: string): Task => ({ id, title: `Görev ${id}`, done: false });

/** Sistem saatini belirli bir YEREL güne sabitler. */
const freezeLocalDate = (year: number, month: number, day: number, hour = 12) => {
  jest.useFakeTimers().setSystemTime(new Date(year, month - 1, day, hour, 0, 0));
};

const planKeys = async () =>
  (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PLAN_PREFIX)).sort();

describe('cleanOldPlans', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('eşikten eski planları siler, yenileri korur', async () => {
    freezeLocalDate(2026, 9, 5);
    await savePlan('2026-09-04', [task('yeni')]);      // 1 gün önce
    await savePlan('2026-06-08', [task('sinirda')]);   // 89 gün önce
    await savePlan('2026-06-06', [task('eski')]);      // 91 gün önce

    const removed = await cleanOldPlans(90);

    expect(removed).toBe(true);
    expect(await planKeys()).toEqual(['@dp_plan_2026-06-08', '@dp_plan_2026-09-04']);
  });

  // Regresyon (W-12): Math.ceil, yaz saati geçişlerinde 90.04 günü 91'e
  // yuvarlayıp planı eşikten BİR GÜN ÖNCE siliyordu.
  it('tam eşik günündeki planı silmez', async () => {
    freezeLocalDate(2026, 9, 5);
    await savePlan('2026-06-07', [task('tam90')]); // tam 90 gün önce

    await cleanOldPlans(90);

    expect(await planKeys()).toEqual(['@dp_plan_2026-06-07']);
  });

  it('gelecek tarihli planlara dokunmaz', async () => {
    freezeLocalDate(2026, 9, 5);
    await savePlan('2027-01-01', [task('gelecek')]);

    await cleanOldPlans(90);

    expect(await planKeys()).toEqual(['@dp_plan_2027-01-01']);
  });

  it('silinecek plan yoksa false döner', async () => {
    freezeLocalDate(2026, 9, 5);
    await savePlan('2026-09-04', [task('yeni')]);

    expect(await cleanOldPlans(90)).toBe(false);
  });

  it('aynı gün ikinci kez çalışmaz', async () => {
    freezeLocalDate(2026, 9, 5);
    await savePlan('2026-01-01', [task('eski')]);

    expect(await cleanOldPlans(90)).toBe(true);

    // Kilit devrede: yeni eklenen eski plan bugün artık silinmemeli
    await savePlan('2026-01-02', [task('eski2')]);
    expect(await cleanOldPlans(90)).toBe(false);
    expect(await planKeys()).toEqual(['@dp_plan_2026-01-02']);
  });

  // Regresyon (W-13): kilit toISOString() (UTC) kullanıyordu; UTC+3'te gece
  // yarısından sonra yerel gün ile UTC günü ayrıştığı için kilit kayıyordu.
  it('günlük kilidi YEREL tarihe göre yazar', async () => {
    // jest.setup.js TZ'yi Europe/Istanbul yapar. 01:30'da UTC günü hâlâ dün.
    freezeLocalDate(2026, 9, 5, 1);
    await savePlan('2026-01-01', [task('eski')]);

    await cleanOldPlans(90);

    expect(await AsyncStorage.getItem(LAST_CLEANUP_KEY)).toBe('2026-09-05');
    expect(new Date().toISOString().split('T')[0]).toBe('2026-09-04'); // UTC farklı
  });

  it('eşik büyütülünce daha az plan siler', async () => {
    freezeLocalDate(2026, 9, 5);
    await savePlan('2026-01-01', [task('247gun')]);

    expect(await cleanOldPlans(365)).toBe(false);
    expect(await planKeys()).toEqual(['@dp_plan_2026-01-01']);
  });
});

describe('migratePlansIfNecessary', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('eski tek parça yapıyı gün başına anahtarlara taşır', async () => {
    await AsyncStorage.setItem(OLD_PLANS_KEY, JSON.stringify({
      '2026-09-04': [task('a')],
      '2026-09-05': [task('b'), task('c')],
    }));

    await migratePlansIfNecessary();

    expect(await planKeys()).toEqual(['@dp_plan_2026-09-04', '@dp_plan_2026-09-05']);
    expect(await AsyncStorage.getItem(OLD_PLANS_KEY)).toBeNull();

    const plans = await getAllPlans();
    expect(plans['2026-09-05']).toHaveLength(2);
  });

  it('eski kayıt yoksa hiçbir şey yapmaz', async () => {
    await savePlan('2026-09-05', [task('a')]);

    await migratePlansIfNecessary();

    expect(await planKeys()).toEqual(['@dp_plan_2026-09-05']);
  });

  it('bozuk eski kayıtta çökmez ve mevcut planları bozmaz', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await savePlan('2026-09-05', [task('a')]);
      await AsyncStorage.setItem(OLD_PLANS_KEY, '{bozuk-json');

      await expect(migratePlansIfNecessary()).resolves.toBeUndefined();

      expect(await planKeys()).toEqual(['@dp_plan_2026-09-05']);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('updateTask', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('yalnız hedef görevi günceller', async () => {
    await savePlan('2026-09-05', [task('1'), task('2')]);

    const result = await updateTask('2026-09-05', '2', { done: true });

    expect(result).toHaveLength(2);
    expect(result?.[0].done).toBe(false);
    expect(result?.[1].done).toBe(true);
    const plans = await getAllPlans();
    expect(plans['2026-09-05'][1].done).toBe(true);
  });

  it('olmayan görev id için listeyi değiştirmez', async () => {
    await savePlan('2026-09-05', [task('1')]);

    const result = await updateTask('2026-09-05', 'yok', { done: true });

    expect(result).toHaveLength(1);
    expect(result?.[0].done).toBe(false);
  });

  it('olmayan gün için boş liste döndürür', async () => {
    await expect(updateTask('2026-01-01', '1', { done: true })).resolves.toEqual([]);
  });
});
