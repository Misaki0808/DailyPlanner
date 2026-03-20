import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import ProfileSection from '../components/settings/ProfileSection';
import StatsSection from '../components/settings/StatsSection';
import RecurringTasksSection from '../components/settings/RecurringTasksSection';
import PreferencesSection from '../components/settings/PreferencesSection';

export default function SettingsScreen() {
  const {
    username,
    setUsername,
    plans,
    gender,
    setGender,
    settings,
    theme,
    updateSettings,
    recurringTasks,
    addRecurringTask,
    removeRecurringTask,
    toggleRecurringTask,
  } = useApp();

  const handleGenderChange = async (newGender: 'male' | 'female') => {
    try {
      await setGender(newGender);
    } catch (error) {
      Alert.alert('Hata', 'Profil resmi değiştirilemedi');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={theme.settingsGradient}
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
          <ProfileSection
            username={username}
            gender={gender}
            onSaveUsername={setUsername}
            onChangeGender={handleGenderChange}
          />

          <StatsSection
            plans={plans}
            username={username}
          />

          <RecurringTasksSection
            recurringTasks={recurringTasks}
            onAddRecurringTask={addRecurringTask}
            onRemoveRecurringTask={removeRecurringTask}
            onToggleRecurringTask={toggleRecurringTask}
          />

          <PreferencesSection
            settings={settings}
            onUpdateSettings={updateSettings}
          />
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
});
