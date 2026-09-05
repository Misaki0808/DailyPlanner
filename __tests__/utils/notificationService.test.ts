import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  cancelAllNotifications,
  cancelDailySummaryNotification,
  scheduleAlarmNotification,
  scheduleDailySummaryNotification,
} from '../../src/utils/notificationService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval' },
  AndroidNotificationPriority: { HIGH: 'high' },
}));

const DAILY_ID_KEY = '@dp_daily_notif_id';
const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelOneMock = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const cancelAllMock = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;

describe('scheduleDailySummaryNotification', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    scheduleMock.mockReset().mockResolvedValue('notif-1');
    cancelOneMock.mockClear();
  });

  it('verilen saat ve dakikayla günlük tetikleyici kurar', async () => {
    const id = await scheduleDailySummaryNotification(20, 30);

    expect(id).toBe('notif-1');
    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: { type: 'daily', hour: 20, minute: 30 },
      })
    );
  });

  it('planlanan bildirimin kimliğini saklar', async () => {
    await scheduleDailySummaryNotification(9, 0);
    expect(await AsyncStorage.getItem(DAILY_ID_KEY)).toBe('notif-1');
  });

  // Bu koruma olmazsa her açılışta yeni bir günlük bildirim eklenir ve
  // kullanıcı aynı özeti günde birden çok kez alır.
  it('yeni bildirimi kurmadan ÖNCE eskisini iptal eder', async () => {
    await scheduleDailySummaryNotification(20, 0);

    scheduleMock.mockResolvedValue('notif-2');
    await scheduleDailySummaryNotification(21, 0);

    expect(cancelOneMock).toHaveBeenCalledWith('notif-1');
    expect(await AsyncStorage.getItem(DAILY_ID_KEY)).toBe('notif-2');
  });

  it('ilk kurulumda iptal edecek bir şey aramaz', async () => {
    await scheduleDailySummaryNotification(20, 0);
    expect(cancelOneMock).not.toHaveBeenCalled();
  });

  it('planlama hata verirse null döner ve çökmez', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      scheduleMock.mockRejectedValue(new Error('bildirim servisi kapalı'));

      await expect(scheduleDailySummaryNotification(20, 0)).resolves.toBeNull();
      expect(await AsyncStorage.getItem(DAILY_ID_KEY)).toBeNull();
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe('cancelDailySummaryNotification', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    scheduleMock.mockReset().mockResolvedValue('notif-1');
    cancelOneMock.mockClear();
  });

  it('saklanan kimliği iptal edip anahtarı temizler', async () => {
    await scheduleDailySummaryNotification(20, 0);
    cancelOneMock.mockClear();

    await cancelDailySummaryNotification();

    expect(cancelOneMock).toHaveBeenCalledWith('notif-1');
    expect(await AsyncStorage.getItem(DAILY_ID_KEY)).toBeNull();
  });

  it('saklanan kimlik yoksa sessizce geçer', async () => {
    await expect(cancelDailySummaryNotification()).resolves.toBeUndefined();
    expect(cancelOneMock).not.toHaveBeenCalled();
  });
});

describe('cancelAllNotifications', () => {
  it('tüm planlı bildirimleri iptal eder ve günlük kimliği siler', async () => {
    scheduleMock.mockReset().mockResolvedValue('notif-1');
    await scheduleDailySummaryNotification(20, 0);

    await cancelAllNotifications();

    expect(cancelAllMock).toHaveBeenCalled();
    expect(await AsyncStorage.getItem(DAILY_ID_KEY)).toBeNull();
  });
});

describe('scheduleAlarmNotification', () => {
  beforeEach(() => {
    scheduleMock.mockReset().mockResolvedValue('alarm-1');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hedef zamana kalan saniyeyle tetikleyici kurar', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 5, 12, 0, 0));
    const target = new Date(2026, 8, 5, 12, 10, 0); // 10 dakika sonra

    await scheduleAlarmNotification('⏰ Toplantı', 'Planlanan saat: 12:10', target);

    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: { type: 'timeInterval', seconds: 600 },
      })
    );
  });

  // Geçmiş bir saate alarm kurulmak istenirse negatif süre üretilmemeli.
  it('geçmiş bir zaman verilirse en az 1 saniye kullanır', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 5, 12, 0, 0));
    const past = new Date(2026, 8, 5, 11, 0, 0);

    await scheduleAlarmNotification('Geçmiş', '', past);

    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: { type: 'timeInterval', seconds: 1 },
      })
    );
  });
});
