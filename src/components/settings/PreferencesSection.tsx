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
import { createSharedStyles } from '../../utils/sharedStyles';
import { useApp } from '../../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const { theme } = useApp();
  const themed = createSharedStyles(theme);
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

  // Tüm Verileri Sıfırla
  const handleClearData = () => {
    Alert.alert(
      '⚠️ Tüm Verileri Sıfırla',
      'Emin misin? Girdiğin görevler, ismin, sistem kayıtları ve istatistikler kalıcı olarak silinecek. (Test etmek için bu işlemi yapıyorsan Onaylaya bas).',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Evet, Sıfırla', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Sıfırlandı!', 'Lütfen uygulamayı yeniden başlatın (Terminalde r tuşuna basabilirsin).');
            } catch (error) {
              Alert.alert('Hata', 'Veriler sıfırlanırken hata oluştu.');
            }
          }
        }
      ]
    );
  };

  return (
    <View>
      {/* Hakkında */}
      <View style={styles.aboutSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>ℹ️ Hakkında</Text>
        <View style={themed.glassCard}>
          <View style={styles.infoCard}>
            <Text style={[styles.appName, { color: theme.text }]}>DailyPlanner</Text>
            <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Versiyon 1.0.0</Text>
            <Text style={[styles.appDescription, { color: theme.text }]}>
              Günlük planlarınızı oluşturun, yönetin ve takip edin.
            </Text>
          </View>
        </View>
      </View>

      {/* Tercihler */}
      <View style={styles.preferencesSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>⚙️ Tercihler</Text>

        {/* Dark Mode */}
        <View style={themed.glassCard}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={[styles.preferenceTitle, { color: theme.text }]}>🌙 Karanlık Tema</Text>
              <Text style={[styles.preferenceDescription, { color: theme.textSecondary }]}>
                Gözlerinizi yormayan karanlık tema
              </Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => onUpdateSettings({ darkMode: value })}
              trackColor={{ false: theme.switchTrackOff, true: theme.switchTrackOn }}
              thumbColor={settings.darkMode ? theme.switchThumbOn : theme.switchThumbOff}
            />
          </View>
        </View>

        {/* Bildirimler */}
        <View style={[themed.glassCard, { marginTop: 12 }]}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={[styles.preferenceTitle, { color: theme.text }]}>🔔 Günlük Bildirimler</Text>
              <Text style={[styles.preferenceDescription, { color: theme.textSecondary }]}>
                Her gün belirlediğiniz saatte bildirim alın
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: theme.switchTrackOff, true: theme.switchTrackOn }}
              thumbColor={settings.notificationsEnabled ? theme.switchThumbOn : theme.switchThumbOff}
            />
          </View>

          {/* Bildirim Saati */}
          {settings.notificationsEnabled ? (
            <View style={[styles.timePickerContainer, { borderTopColor: theme.border }]}>
              <Text style={[styles.timePickerLabel, { color: theme.text }]}>Bildirim Saati:</Text>
              <View style={styles.timeInputRow}>
                <View style={styles.timeInputWrapper}>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: theme.accentLight, color: theme.text }]}
                    value={notificationHour}
                    onChangeText={setNotificationHour}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="08"
                    placeholderTextColor={theme.textMuted}
                  />
                  <Text style={[styles.timeInputLabel, { color: theme.textSecondary }]}>Saat</Text>
                </View>
                <Text style={[styles.timeSeparator, { color: theme.text }]}>:</Text>
                <View style={styles.timeInputWrapper}>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: theme.accentLight, color: theme.text }]}
                    value={notificationMinute}
                    onChangeText={setNotificationMinute}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={theme.textMuted}
                  />
                  <Text style={[styles.timeInputLabel, { color: theme.textSecondary }]}>Dakika</Text>
                </View>
                <TouchableOpacity
                  style={[styles.saveTimeButton, { backgroundColor: theme.success }]}
                  onPress={handleSaveNotificationTime}
                >
                  <Text style={styles.saveTimeButtonText}>✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.timePickerContainer, { borderTopColor: theme.border, opacity: 0.6 }]}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                Bildirimler kapalı. Günlük planlarınız için hatırlatıcı almayacaksınız.
              </Text>
            </View>
          )}
        </View>

        {/* Diğer Tercihler */}
        <View style={[themed.glassCard, { marginTop: 12 }]}>
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceTextContainer}>
              <Text style={[styles.preferenceTitle, { color: theme.text }]}>Tüm planları silerken daima sor</Text>
              <Text style={[styles.preferenceDescription, { color: theme.textSecondary }]}>
                Bir günün tüm görevlerini silmeden önce onay istenir
              </Text>
            </View>
            <Switch
              value={settings.askBeforeDeleteAll}
              onValueChange={(value) => onUpdateSettings({ askBeforeDeleteAll: value })}
              trackColor={{ false: theme.switchTrackOff, true: theme.switchTrackOn }}
              thumbColor={settings.askBeforeDeleteAll ? theme.switchThumbOn : theme.switchThumbOff}
            />
          </View>
        </View>

        {/* --- TEHLİKELİ ALAN --- */}
        <View style={{ marginTop: 32, marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: '#ef4444', fontSize: 18 }]}>🚨 Veri Yönetimi</Text>
          <TouchableOpacity 
            style={[themed.glassCard, { backgroundColor: '#ef444420', borderColor: '#ef444450' }]} 
            onPress={handleClearData}
          >
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceTextContainer}>
                <Text style={[styles.preferenceTitle, { color: '#ef4444' }]}>Tüm Verileri Sıfırla</Text>
                <Text style={[styles.preferenceDescription, { color: theme.textSecondary }]}>
                  İsim, ayarlar, görevler silinir. Onboarding'i tekrar görmek için tıkla.
                </Text>
              </View>
              <Text style={{ fontSize: 24 }}>🗑️</Text>
            </View>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
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
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 16,
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
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  timePickerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 12,
    width: 60,
    height: 60,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  timeInputLabel: {
    fontSize: 11,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  saveTimeButton: {
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
