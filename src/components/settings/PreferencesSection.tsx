import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Settings } from '../../types';
import { sharedStyles } from '../../utils/sharedStyles';
import {
  scheduleDailyNotification,
  cancelAllNotifications,
  requestNotificationPermissions,
} from '../../utils/notificationService';

interface PreferencesSectionProps {
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => Promise<void>;
}

export default function PreferencesSection({
  settings,
  onUpdateSettings,
}: PreferencesSectionProps) {
  const [notificationHour, setNotificationHour] = useState('08');
  const [notificationMinute, setNotificationMinute] = useState('00');
  const [isInitialized, setIsInitialized] = useState(false);

  // Bildirim saatini ayarlardan al - sadece ilk yüklemede
  useEffect(() => {
    if (!isInitialized && settings.notificationTime) {
      const [hour, minute] = settings.notificationTime.split(':');
      setNotificationHour(hour || '08');
      setNotificationMinute(minute || '00');
      setIsInitialized(true);
    }
  }, [settings.notificationTime, isInitialized]);

  // Bildirimleri aç/kapat
  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert('İzin Gerekli', 'Bildirimler için izin vermeniz gerekiyor.');
        return;
      }
      const hour = parseInt(notificationHour);
      const minute = parseInt(notificationMinute);
      await scheduleDailyNotification(hour, minute);
      await onUpdateSettings({ notificationsEnabled: true });
    } else {
      await cancelAllNotifications();
      await onUpdateSettings({ notificationsEnabled: false });
    }
  };

  // Bildirim saatini kaydet
  const handleSaveNotificationTime = async () => {
    const hour = parseInt(notificationHour);
    const minute = parseInt(notificationMinute);

    if (isNaN(hour) || hour < 0 || hour > 23) {
      Alert.alert('Hata', 'Saat 0-23 arasında olmalı');
      return;
    }
    if (isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('Hata', 'Dakika 0-59 arasında olmalı');
      return;
    }

    const timeString = `${notificationHour.padStart(2, '0')}:${notificationMinute.padStart(2, '0')}`;
    await onUpdateSettings({ notificationTime: timeString });

    if (settings.notificationsEnabled) {
      await scheduleDailyNotification(hour, minute);
      Alert.alert('Başarılı', `Bildirim saati ${timeString} olarak güncellendi!`);
    } else {
      Alert.alert('Başarılı', 'Bildirim saati kaydedildi. Bildirimleri açtığınızda bu saat kullanılacak.');
    }
  };

  return (
    <View>
      {/* Hakkında */}
      <View style={styles.aboutSection}>
        <Text style={sharedStyles.sectionTitle}>ℹ️ Hakkında</Text>
        <View style={sharedStyles.glassCard}>
          <View style={styles.infoCard}>
            <Text style={styles.appName}>DailyPlanner</Text>
            <Text style={styles.appVersion}>Versiyon 1.0.0</Text>
            <Text style={styles.appDescription}>
              Günlük planlarınızı oluşturun, yönetin ve takip edin.
            </Text>
          </View>
        </View>
      </View>

      {/* Tercihler */}
      <View style={styles.preferencesSection}>
        <Text style={sharedStyles.sectionTitle}>⚙️ Tercihler</Text>

        {/* Dark Mode */}
        <View style={sharedStyles.glassCard}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>🌙 Karanlık Tema</Text>
              <Text style={styles.preferenceDescription}>
                Gözlerinizi yormayan karanlık tema
              </Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => onUpdateSettings({ darkMode: value })}
              trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: 'rgba(67, 233, 123, 0.7)' }}
              thumbColor={settings.darkMode ? '#43e97b' : '#f4f3f4'}
              ios_backgroundColor="rgba(255, 255, 255, 0.3)"
            />
          </View>
        </View>

        {/* Bildirimler */}
        <View style={[sharedStyles.glassCard, { marginTop: 12 }]}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>🔔 Günlük Bildirimler</Text>
              <Text style={styles.preferenceDescription}>
                Her gün belirlediğiniz saatte bildirim alın
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: 'rgba(67, 233, 123, 0.7)' }}
              thumbColor={settings.notificationsEnabled ? '#43e97b' : '#f4f3f4'}
              ios_backgroundColor="rgba(255, 255, 255, 0.3)"
            />
          </View>

          {/* Bildirim Saati */}
          {settings.notificationsEnabled ? (
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerLabel}>Bildirim Saati:</Text>
              <View style={styles.timeInputRow}>
                <View style={styles.timeInputWrapper}>
                  <TextInput
                    style={styles.timeInput}
                    value={notificationHour}
                    onChangeText={setNotificationHour}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="08"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                  <Text style={styles.timeInputLabel}>Saat</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeInputWrapper}>
                  <TextInput
                    style={styles.timeInput}
                    value={notificationMinute}
                    onChangeText={setNotificationMinute}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                  <Text style={styles.timeInputLabel}>Dakika</Text>
                </View>
                <TouchableOpacity
                  style={styles.saveTimeButton}
                  onPress={handleSaveNotificationTime}
                >
                  <Text style={styles.saveTimeButtonText}>✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.timePickerContainer, { opacity: 0.6 }]}>
              <Text style={{ color: '#fff', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                Bildirimler kapalı. Günlük planlarınız için hatırlatıcı almayacaksınız.
              </Text>
            </View>
          )}
        </View>

        {/* Diğer Tercihler */}
        <View style={[sharedStyles.glassCard, { marginTop: 12 }]}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceTitle}>Tüm planları silerken daima sor</Text>
              <Text style={styles.preferenceDescription}>
                Bir günün tüm görevlerini silmeden önce onay istenir
              </Text>
            </View>
            <Switch
              value={settings.askBeforeDeleteAll}
              onValueChange={(value) => onUpdateSettings({ askBeforeDeleteAll: value })}
              trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: 'rgba(67, 233, 123, 0.7)' }}
              thumbColor={settings.askBeforeDeleteAll ? '#43e97b' : '#f4f3f4'}
              ios_backgroundColor="rgba(255, 255, 255, 0.3)"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  aboutSection: {
    marginBottom: 24,
  },
  infoCard: {
    padding: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  preferencesSection: {
    marginBottom: 24,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  preferenceTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  timePickerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInputWrapper: {
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 60,
    height: 60,
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  timeInputLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  saveTimeButton: {
    backgroundColor: 'rgba(67, 233, 123, 0.8)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveTimeButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
});
