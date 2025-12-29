import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Bildirim ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Bildirim izni iste
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.error('Bildirim izni alınırken hata:', error);
    return false;
  }
};

/**
 * Günlük bildirim planla
 * @param hour - Saat (0-23)
 * @param minute - Dakika (0-59)
 * @param tasksCount - Görev sayısı
 */
export const scheduleDailyNotification = async (
  hour: number,
  minute: number,
  tasksCount: number = 0
): Promise<string | null> => {
  try {
    // Önce mevcut bildirimleri iptal et
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // İzin kontrolü
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Bildirim izni verilmedi');
      return null;
    }
    
    // Bildirim içeriği
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📝 Bugünkü Planın Hazır!',
        body: tasksCount > 0 
          ? `${tasksCount} görevin seni bekliyor! Hadi başlayalım 🚀`
          : 'Bugün için plan oluşturmayı unutma! 💪',
        data: { type: 'daily-reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true, // Her gün tekrarla
      },
    });
    
    return notificationId;
  } catch (error) {
    console.error('Bildirim planlanırken hata:', error);
    return null;
  }
};

/**
 * Tüm bildirimleri iptal et
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Bildirimler iptal edilirken hata:', error);
  }
};

/**
 * Planlı bildirimleri getir
 */
export const getScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Bildirimler alınırken hata:', error);
    return [];
  }
};

/**
 * Bildirim izni var mı kontrol et
 */
export const checkNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Bildirim izni kontrol edilirken hata:', error);
    return false;
  }
};
