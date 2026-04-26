import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Bildirim Handler (Foreground'da göster) ─────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── İzin İsteme ─────────────────────────────────────────────────
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

// ─── İzin Kontrolü ───────────────────────────────────────────────
export const checkNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

// ─── Günlük Özet Bildirimi (Her akşam 20:00) ────────────────────
const DAILY_NOTIFICATION_ID_KEY = '@dp_daily_notif_id';

export const scheduleDailySummaryNotification = async (
  hour: number = 20,
  minute: number = 0
): Promise<string | null> => {
  if (Platform.OS === 'web') return null;

  try {
    // Eski günlük bildirimi iptal et
    await cancelDailySummaryNotification();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Günün Özeti',
        body: 'Bugünkü görevlerini kontrol et! Yarına hazır mısın?',
        data: { type: 'daily_summary' },
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await AsyncStorage.setItem(DAILY_NOTIFICATION_ID_KEY, id);
    return id;
  } catch (e) {
    console.log('Daily notification schedule error:', e);
    return null;
  }
};

export const cancelDailySummaryNotification = async (): Promise<void> => {
  try {
    const existingId = await AsyncStorage.getItem(DAILY_NOTIFICATION_ID_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(DAILY_NOTIFICATION_ID_KEY);
    }
  } catch (e) {
    console.log('Cancel daily notification error:', e);
  }
};

// ─── Tek Seferlik Alarm Bildirimi ────────────────────────────────
export const scheduleAlarmNotification = async (
  title: string,
  body: string,
  date: Date
): Promise<string | null> => {
  if (Platform.OS === 'web') return null;

  try {
    const secondsUntil = Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'alarm' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
      },
    });

    return id;
  } catch (e) {
    console.log('Alarm notification error:', e);
    return null;
  }
};

// ─── Tüm Bildirimleri İptal Et ──────────────────────────────────
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(DAILY_NOTIFICATION_ID_KEY);
  } catch (e) {
    console.log('Cancel all notifications error:', e);
  }
};

// ─── Planlı Bildirimleri Getir ───────────────────────────────────
export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (e) {
    return [];
  }
};
