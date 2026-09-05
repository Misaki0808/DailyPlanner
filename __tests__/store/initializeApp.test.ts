import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../src/store/appStore';
import { usePlansStore } from '../../src/store/plansStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useRecurringStore } from '../../src/store/recurringStore';
import { usePomodoroStore } from '../../src/store/pomodoroStore';
import { useUserStore } from '../../src/store/userStore';
import * as notificationService from '../../src/utils/notificationService';
import * as cloudSync from '../../src/hooks/useCloudSync';
import * as storage from '../../src/utils/storage';
import { defaultSettings } from '../../src/utils/defaultSettings';
import { Settings, Task } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../src/utils/notificationService', () => ({
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
  scheduleDailySummaryNotification: jest.fn().mockResolvedValue('id-1'),
}));

jest.mock('../../src/hooks/useCloudSync', () => ({
  backupToCloudSilently: jest.fn().mockResolvedValue({ ok: false }),
  fetchCloudBackupRecord: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const task = (id: string): Task => ({ id, title: `Görev ${id}`, done: false });

const scheduleMock = notificationService.scheduleDailySummaryNotification as jest.Mock;
const permissionMock = notificationService.requestNotificationPermissions as jest.Mock;
const cloudStatusMock = cloudSync.fetchCloudBackupRecord as jest.Mock;

/** Diske doğrudan yazarak "önceki oturumdan kalan veri" durumu kurar. */
const seedDisk = async (opts: {
  plans?: Record<string, Task[]>;
  settings?: Partial<Settings>;
  username?: string;
}) => {
  for (const [date, tasks] of Object.entries(opts.plans || {})) {
    await AsyncStorage.setItem(`@dp_plan_${date}`, JSON.stringify(tasks));
  }
  if (opts.settings) {
    await AsyncStorage.setItem('@daily_planner_settings', JSON.stringify(opts.settings));
  }
  if (opts.username) {
    await AsyncStorage.setItem('@daily_planner_user_name', opts.username);
  }
};

const resetStores = () => {
  usePlansStore.setState({ plans: {} });
  useRecurringStore.setState({ recurringTasks: [] });
  usePomodoroStore.setState({ pomodoroStats: {} });
  useUserStore.setState({ username: null, gender: 'male', aboutMe: '' });
  useSettingsStore.setState({ settings: defaultSettings });
  useAppStore.setState({ isLoading: true });
};

describe('initializeApp', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetStores();
    scheduleMock.mockClear();
    permissionMock.mockClear().mockResolvedValue(true);
    cloudStatusMock.mockClear().mockResolvedValue(null);
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 5, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('diskteki veriyi store"lara yükler ve yüklemeyi bitirir', async () => {
    await seedDisk({
      plans: { '2026-09-05': [task('1')] },
      username: 'Efe',
      settings: { ...defaultSettings, darkMode: false },
    });

    await useAppStore.getState().initializeApp();

    expect(usePlansStore.getState().plans['2026-09-05']).toHaveLength(1);
    expect(useUserStore.getState().username).toBe('Efe');
    expect(useSettingsStore.getState().settings.darkMode).toBe(false);
    expect(useAppStore.getState().isLoading).toBe(false);
  });

  it('hata olsa bile yükleme ekranında takılı kalmaz', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const spy = jest.spyOn(storage, 'getAllPlans').mockRejectedValue(new Error('disk yok'));
    try {
      await useAppStore.getState().initializeApp();
      expect(useAppStore.getState().isLoading).toBe(false);
    } finally {
      spy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // Regresyon (R-002): temizlik eskiden AYARLAR OKUNMADAN, koşulsuz
  // çalışıyordu ve 90 günden eski planları uyarısız siliyordu.
  it('otomatik temizlik KAPALIYKEN eski planları silmez', async () => {
    await seedDisk({
      plans: { '2020-01-01': [task('eski')], '2026-09-05': [task('yeni')] },
      settings: { ...defaultSettings, autoCleanOldPlans: false },
    });

    await useAppStore.getState().initializeApp();

    expect(usePlansStore.getState().plans['2020-01-01']).toHaveLength(1);
    expect(await AsyncStorage.getItem('@dp_plan_2020-01-01')).not.toBeNull();
  });

  it('varsayılan ayarlarla (hiç kayıt yokken) da silmez', async () => {
    await seedDisk({ plans: { '2020-01-01': [task('eski')] } });

    await useAppStore.getState().initializeApp();

    expect(usePlansStore.getState().plans['2020-01-01']).toHaveLength(1);
  });

  it('otomatik temizlik AÇIKKEN siler ve store"u diskten tazeler', async () => {
    await seedDisk({
      plans: { '2020-01-01': [task('eski')], '2026-09-05': [task('yeni')] },
      settings: { ...defaultSettings, autoCleanOldPlans: true, autoCleanThresholdDays: 90 },
    });

    await useAppStore.getState().initializeApp();

    // Silinen gün store"da da kalmamalı; eskiden store silinen günleri
    // göstermeye devam ediyordu.
    expect(usePlansStore.getState().plans['2020-01-01']).toBeUndefined();
    expect(usePlansStore.getState().plans['2026-09-05']).toHaveLength(1);
    expect(await AsyncStorage.getItem('@dp_plan_2020-01-01')).toBeNull();
  });

  describe('günlük bildirim', () => {
    it('ayardaki saatle kurulur', async () => {
      await seedDisk({
        settings: { ...defaultSettings, notificationsEnabled: true, notificationTime: '09:15' },
      });

      await useAppStore.getState().initializeApp();

      expect(scheduleMock).toHaveBeenCalledWith(9, 15);
    });

    it('bildirimler kapalıysa kurulmaz', async () => {
      await seedDisk({ settings: { ...defaultSettings, notificationsEnabled: false } });

      await useAppStore.getState().initializeApp();

      expect(scheduleMock).not.toHaveBeenCalled();
    });

    it('izin verilmediyse kurulmaz', async () => {
      permissionMock.mockResolvedValue(false);
      await seedDisk({ settings: { ...defaultSettings, notificationsEnabled: true } });

      await useAppStore.getState().initializeApp();

      expect(scheduleMock).not.toHaveBeenCalled();
    });
  });

  // Regresyon (W-11): bu çağrı eskiden await ediliyor ve isLoading"i
  // bloklıyordu; sonucu hiçbir ekran okumuyor, ağ yavaşsa açılış dakikalarca
  // bekliyordu.
  it('bulut durumu sorgusu açılışı bloklamaz', async () => {
    let resolveCloud: (v: null) => void = () => {};
    cloudStatusMock.mockImplementation(() => new Promise(resolve => { resolveCloud = resolve; }));

    await useAppStore.getState().initializeApp();

    // Bulut çağrısı hâlâ askıdayken bile yükleme bitmiş olmalı
    expect(useAppStore.getState().isLoading).toBe(false);
    expect(cloudStatusMock).toHaveBeenCalled();
    resolveCloud(null);
  });
});
