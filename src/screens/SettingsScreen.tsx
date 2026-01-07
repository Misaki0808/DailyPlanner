import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { scheduleDailyNotification, cancelAllNotifications, requestNotificationPermissions } from '../utils/notificationService';

export default function SettingsScreen() {
  const { username, setUsername, plans, gender, setGender, settings, updateSettings, theme } = useApp();
  const [nameInput, setNameInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [notificationHour, setNotificationHour] = useState('08');
  const [notificationMinute, setNotificationMinute] = useState('00');
  const [isInitialized, setIsInitialized] = useState(false);

  // İlk açılışta kullanıcı adı yoksa düzenleme modunu aç
  useEffect(() => {
    if (!username) {
      setIsEditing(true);
    } else {
      setNameInput(username);
    }
  }, [username]);

  // Bildirim saatini ayarlardan al - sadece ilk yüklemede
  useEffect(() => {
    if (!isInitialized && settings.notificationTime) {
      const [hour, minute] = settings.notificationTime.split(':');
      setNotificationHour(hour || '08');
      setNotificationMinute(minute || '00');
      setIsInitialized(true);
    }
  }, [settings.notificationTime, isInitialized]);

  // Kullanıcı adını kaydet
  const handleSaveName = async () => {
    if (nameInput.trim() === '') {
      Alert.alert('Uyarı', 'Lütfen bir isim girin');
      return;
    }

    try {
      await setUsername(nameInput.trim());
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Hata', 'İsim kaydedilemedi');
    }
  };

  // İstatistikler hesapla
  const calculateStats = () => {
    const planDates = Object.keys(plans);
    const totalPlans = planDates.length;
    
    let totalTasks = 0;
    let completedTasks = 0;

    planDates.forEach(date => {
      const tasks = plans[date] || [];
      totalTasks += tasks.length;
      completedTasks += tasks.filter(task => task.done).length;
    });

    return { totalPlans, totalTasks, completedTasks };
  };

  // Gender değiştir
  const handleGenderChange = async (newGender: 'male' | 'female') => {
    try {
      await setGender(newGender);
    } catch (error) {
      Alert.alert('Hata', 'Profil resmi değiştirilemedi');
    }
  };

  // Bildirimleri aç/kapat
  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert('İzin Gerekli', 'Bildirimler için izin vermeniz gerekiyor.');
        return;
      }
      
      // Bildirimi planla
      const hour = parseInt(notificationHour);
      const minute = parseInt(notificationMinute);
      await scheduleDailyNotification(hour, minute);
      await updateSettings({ notificationsEnabled: true });
    } else {
      // Bildirimleri iptal et
      await cancelAllNotifications();
      await updateSettings({ notificationsEnabled: false });
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
    await updateSettings({ notificationTime: timeString });
    
    // Eğer bildirimler açıksa, yeni saate göre yeniden planla
    if (settings.notificationsEnabled) {
      await scheduleDailyNotification(hour, minute);
      Alert.alert('Başarılı', `Bildirim saati ${timeString} olarak güncellendi!`);
    } else {
      Alert.alert('Başarılı', 'Bildirim saati kaydedildi. Bildirimleri açtığınızda bu saat kullanılacak.');
    }
  };

  const stats = calculateStats();

  // Tema renklerini al
  const gradientColors = settings.darkMode 
    ? ['#2a2d5a', '#1a1a2e', '#0f0f1e'] as const
    : ['#fa709a', '#fee140', '#30cfd0'] as const;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.content}>
          {/* Profil Bölümü */}
          <View style={styles.profileSection}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={['#fa709a', '#fee140']}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>
                  {gender === 'male' ? '👨‍💼' : '👩‍💼'}
                </Text>
              </LinearGradient>

              {/* Gender Seçici */}
              <View style={styles.genderSelector}>
                <Text style={styles.genderLabel}>Profil Resmi:</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      gender === 'male' && styles.genderButtonActive,
                    ]}
                    onPress={() => handleGenderChange('male')}
                  >
                    <Text style={styles.genderIcon}>👨‍💼</Text>
                    <Text style={styles.genderText}>Erkek</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      gender === 'female' && styles.genderButtonActive,
                    ]}
                    onPress={() => handleGenderChange('female')}
                  >
                    <Text style={styles.genderIcon}>👩‍💼</Text>
                    <Text style={styles.genderText}>Kadın</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!isEditing ? (
                // İsim Gösterimi
                <View style={styles.nameDisplay}>
                  <Text style={styles.greeting}>Merhaba,</Text>
                  <Text style={styles.userName}>{username || 'Kullanıcı'}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <View style={styles.editButtonInner}>
                      <Text style={styles.editButtonText}>✏️ İsmi Değiştir</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                // İsim Düzenleme
                <View style={styles.nameEdit}>
                  <Text style={styles.label}>İsminiz:</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="İsminizi girin"
                      placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      value={nameInput}
                      onChangeText={setNameInput}
                      autoFocus
                    />
                  </View>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
                    <LinearGradient
                      colors={['#4facfe', '#00f2fe']}
                      style={styles.saveButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.saveButtonText}>💾 Kaydet</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* İstatistikler */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>📊 İstatistikler</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCardWrapper}>
                <View style={styles.glassCard}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.statCardGradient}
                  >
                    <Text style={styles.statValue}>{stats.totalPlans}</Text>
                    <Text style={styles.statLabel}>Toplam Plan</Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={styles.glassCard}>
                  <LinearGradient
                    colors={['#f093fb', '#f5576c']}
                    style={styles.statCardGradient}
                  >
                    <Text style={styles.statValue}>{stats.totalTasks}</Text>
                    <Text style={styles.statLabel}>Toplam Görev</Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.statCardWrapper}>
                <View style={styles.glassCard}>
                  <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    style={styles.statCardGradient}
                  >
                    <Text style={styles.statValue}>{stats.completedTasks}</Text>
                    <Text style={styles.statLabel}>Tamamlanan</Text>
                  </LinearGradient>
                </View>
              </View>

              {stats.totalTasks > 0 && (
                <View style={styles.statCardWrapper}>
                  <View style={styles.glassCard}>
                    <LinearGradient
                      colors={['#43e97b', '#38f9d7']}
                      style={styles.statCardGradient}
                    >
                      <Text style={styles.statValue}>
                        {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
                      </Text>
                      <Text style={styles.statLabel}>Başarı Oranı</Text>
                    </LinearGradient>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Hakkında */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>ℹ️ Hakkında</Text>
            <View style={styles.glassCard}>
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
            <Text style={styles.sectionTitle}>⚙️ Tercihler</Text>
            
            {/* Dark Mode */}
            <View style={styles.glassCard}>
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceTextContainer}>
                  <Text style={styles.preferenceTitle}>🌙 Karanlık Tema</Text>
                  <Text style={styles.preferenceDescription}>
                    Gözlerinizi yormayan karanlık tema
                  </Text>
                </View>
                <Switch
                  value={settings.darkMode}
                  onValueChange={(value) => updateSettings({ darkMode: value })}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: 'rgba(67, 233, 123, 0.7)' }}
                  thumbColor={settings.darkMode ? '#43e97b' : '#f4f3f4'}
                  ios_backgroundColor="rgba(255, 255, 255, 0.3)"
                />
              </View>
            </View>

            {/* Bildirimler */}
            <View style={[styles.glassCard, { marginTop: 12 }]}>
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
              {settings.notificationsEnabled && (
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
              )}
            </View>

            {/* Diğer Tercihler */}
            <View style={[styles.glassCard, { marginTop: 12 }]}>
              <View style={styles.preferenceItem}>
                <View style={styles.preferenceTextContainer}>
                  <Text style={styles.preferenceTitle}>Tüm planları silerken daima sor</Text>
                  <Text style={styles.preferenceDescription}>
                    Bir günün tüm görevlerini silmeden önce onay istenir
                  </Text>
                </View>
                <Switch
                  value={settings.askBeforeDeleteAll}
                  onValueChange={(value) => updateSettings({ askBeforeDeleteAll: value })}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: 'rgba(67, 233, 123, 0.7)' }}
                  thumbColor={settings.askBeforeDeleteAll ? '#43e97b' : '#f4f3f4'}
                  ios_backgroundColor="rgba(255, 255, 255, 0.3)"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  profileSection: {
    marginBottom: 24,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  genderSelector: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 24,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textAlign: 'center',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  genderButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  genderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  nameDisplay: {
    alignItems: 'center',
    width: '100%',
    padding: 24,
  },
  greeting: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  editButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  editButtonInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  editButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  nameEdit: {
    width: '100%',
    padding: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    marginBottom: 16,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCardWrapper: {
    width: '48%',
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 20,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
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
