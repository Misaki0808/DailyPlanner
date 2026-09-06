import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncRecurringForToday } from '../../src/store/appStore';
import { usePlansStore } from '../../src/store/plansStore';
import { useRecurringStore } from '../../src/store/recurringStore';
import { RecurringTask, Task } from '../../src/types';
import { getToday } from '../../src/utils/dateUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// appStore -> notificationService -> expo-notifications zincirini testte kurma
jest.mock('../../src/utils/notificationService', () => ({
  requestNotificationPermissions: jest.fn().mockResolvedValue(false),
  scheduleDailySummaryNotification: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/hooks/useCloudSync', () => ({
  backupToCloudSilently: jest.fn().mockResolvedValue({ ok: false }),
  fetchCloudBackupRecord: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const recurring = (over: Partial<RecurringTask> = {}): RecurringTask => ({
  id: 'r1',
  title: 'Spor yap',
  priority: 'medium',
  frequency: 'daily',
  isActive: true,
  createdAt: '2026-01-01',
  ...over,
});

const titlesForToday = () => (usePlansStore.getState().plans[getToday()] || []).map(t => t.title);

/** Sistem saatini belirli bir YEREL güne sabitler. */
const freezeLocalDate = (year: number, month: number, day: number) => {
  jest.useFakeTimers().setSystemTime(new Date(year, month - 1, day, 12, 0, 0));
};

describe('syncRecurringForToday', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    usePlansStore.setState({ plans: {} });
    useRecurringStore.setState({ recurringTasks: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('frekans dalları', () => {
    it('günlük görevi bugüne ekler', async () => {
      freezeLocalDate(2026, 9, 7); // Pazartesi
      useRecurringStore.setState({ recurringTasks: [recurring({ frequency: 'daily' })] });

      await syncRecurringForToday({ force: true });

      expect(titlesForToday()).toEqual(['Spor yap']);
    });

    it('haftalık görevi yalnız seçilen günlerde ekler', async () => {
      freezeLocalDate(2026, 9, 7); // Pazartesi (getDay() === 1)
      useRecurringStore.setState({
        recurringTasks: [recurring({ frequency: 'weekly', weekDays: [1, 3, 5] })],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual(['Spor yap']);
    });

    it('haftalık görevi seçilmeyen günde eklemez', async () => {
      freezeLocalDate(2026, 9, 8); // Salı (getDay() === 2)
      useRecurringStore.setState({
        recurringTasks: [recurring({ frequency: 'weekly', weekDays: [1, 3, 5] })],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual([]);
    });

    it('eski tek günlük weekDay alanını da destekler', async () => {
      freezeLocalDate(2026, 9, 7); // Pazartesi
      useRecurringStore.setState({
        recurringTasks: [recurring({ frequency: 'weekly', weekDay: 1 })],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual(['Spor yap']);
    });

    it('aylık görevi hedef gününde ekler', async () => {
      freezeLocalDate(2026, 9, 15);
      useRecurringStore.setState({
        recurringTasks: [recurring({ frequency: 'monthly', monthDay: 15 })],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual(['Spor yap']);
    });

    // Regresyon (W-10): tam eşitlik arandığı için "her ayın 31'i" kısa aylarda
    // hiç tetiklenmiyordu — yılın 12 ayının yalnız 7'sinde çalışıyordu.
    it('"her ayın 31i" kısa ayda ayın SON gününde tetiklenir', async () => {
      freezeLocalDate(2026, 9, 30); // Eylül 30 çeker
      useRecurringStore.setState({
        recurringTasks: [recurring({ frequency: 'monthly', monthDay: 31 })],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual(['Spor yap']);
    });

    it('"her ayın 31i" kısa ayda son günden önce tetiklenmez', async () => {
      freezeLocalDate(2026, 9, 29);
      useRecurringStore.setState({
        recurringTasks: [recurring({ frequency: 'monthly', monthDay: 31 })],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual([]);
    });

    // R-026: esnek görev BİLEREK otomatik eklenmiyor. Kullanıcı haftalık
    // hedefini koyar ve hangi günlerde yapacağını "ESNEK GÖREV HAVUZU"
    // kartından kendisi seçer; otomatik eklemek hedefi kullanıcı seçmeden
    // doldurur ve havuzdaki ekleme düğmesini anlamsız kılardı.
    it('esnek görevi otomatik eklemez', async () => {
      freezeLocalDate(2026, 9, 7);
      useRecurringStore.setState({
        recurringTasks: [recurring({ frequency: 'flexible', flexibleTarget: 3 })],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual([]);
    });

    it('hedefi eksik esnek görevi de otomatik eklemez', async () => {
      freezeLocalDate(2026, 9, 7);
      useRecurringStore.setState({
        recurringTasks: [recurring({ frequency: 'flexible', flexibleTarget: undefined })],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual([]);
    });

    it('esnek görev diğer frekansların eklenmesini engellemez', async () => {
      freezeLocalDate(2026, 9, 7);
      useRecurringStore.setState({
        recurringTasks: [
          recurring({ id: 'f', title: 'Yüzme', frequency: 'flexible', flexibleTarget: 2 }),
          recurring({ id: 'd', title: 'Su iç', frequency: 'daily' }),
        ],
      });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual(['Su iç']);
    });

    it('pasif görevi eklemez', async () => {
      freezeLocalDate(2026, 9, 7);
      useRecurringStore.setState({ recurringTasks: [recurring({ isActive: false })] });

      await syncRecurringForToday({ force: true });
      expect(titlesForToday()).toEqual([]);
    });
  });

  describe('mükerrer başlık koruması', () => {
    it('aynı başlık zaten varsa tekrar eklemez', async () => {
      freezeLocalDate(2026, 9, 7);
      const existing: Task = { id: 't1', title: 'Spor yap', done: false };
      usePlansStore.setState({ plans: { [getToday()]: [existing] } });
      useRecurringStore.setState({ recurringTasks: [recurring()] });

      await syncRecurringForToday({ force: true });

      expect(titlesForToday()).toEqual(['Spor yap']);
    });

    it('büyük/küçük harf farkını Türkçe kurallarına göre yok sayar', async () => {
      freezeLocalDate(2026, 9, 7);
      usePlansStore.setState({
        plans: { [getToday()]: [{ id: 't1', title: 'SPOR YAP', done: false }] },
      });
      useRecurringStore.setState({ recurringTasks: [recurring({ title: 'Spor yap' })] });

      await syncRecurringForToday({ force: true });

      expect(titlesForToday()).toEqual(['SPOR YAP']);
    });

    it('mevcut görevleri silmeden sonuna ekler', async () => {
      freezeLocalDate(2026, 9, 7);
      usePlansStore.setState({
        plans: { [getToday()]: [{ id: 't1', title: 'Rapor yaz', done: true }] },
      });
      useRecurringStore.setState({ recurringTasks: [recurring()] });

      await syncRecurringForToday({ force: true });

      expect(titlesForToday()).toEqual(['Rapor yaz', 'Spor yap']);
      expect(usePlansStore.getState().plans[getToday()][0].done).toBe(true);
    });
  });

  describe('günlük çalışma kilidi', () => {
    it('aynı gün ikinci kez çalışmaz', async () => {
      freezeLocalDate(2026, 9, 7);
      useRecurringStore.setState({ recurringTasks: [recurring()] });

      await syncRecurringForToday({ force: true });
      // Kullanıcı eklenen görevi sildi
      usePlansStore.setState({ plans: { [getToday()]: [] } });

      await syncRecurringForToday(); // force yok

      expect(titlesForToday()).toEqual([]);
    });

    it('force ile kilidi aşar', async () => {
      freezeLocalDate(2026, 9, 7);
      useRecurringStore.setState({ recurringTasks: [recurring()] });

      await syncRecurringForToday({ force: true });
      usePlansStore.setState({ plans: { [getToday()]: [] } });

      await syncRecurringForToday({ force: true });

      expect(titlesForToday()).toEqual(['Spor yap']);
    });

    it('hiç tekrarlayan görev yoksa günü işaretleyip çıkar', async () => {
      freezeLocalDate(2026, 9, 7);
      await syncRecurringForToday({ force: true });
      expect(usePlansStore.getState().plans[getToday()]).toBeUndefined();
    });
  });

  it('eklenen görev diske de yazılır', async () => {
    freezeLocalDate(2026, 9, 7);
    useRecurringStore.setState({ recurringTasks: [recurring()] });

    await syncRecurringForToday({ force: true });

    const raw = await AsyncStorage.getItem(`@dp_plan_${getToday()}`);
    expect(JSON.parse(raw || '[]')).toHaveLength(1);
  });
});
