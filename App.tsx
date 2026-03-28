import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationOptions } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useApp } from './src/context/AppContext';
import { DrawerProvider, useDrawer } from './src/context/DrawerContext';
import JSDrawer from './src/components/JSDrawer';
import Svg, { Line } from 'react-native-svg';
import { useEffect, useState } from 'react';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Ekranlar
import CreatePlanScreen from './src/screens/CreatePlanScreen';
import MultiDayViewScreen from './src/screens/MultiDayViewScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import PlanOverviewScreen from './src/screens/PlanOverviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { RootTabParamList } from './src/types';

const Stack = createStackNavigator<RootTabParamList>();

// Header'daki Menü Butonu (Modern Icon)
function MenuButton() {
  const { openDrawer } = useDrawer();
  const { theme } = useApp();
  return (
    <TouchableOpacity onPress={openDrawer} style={{ paddingLeft: 15 }}>
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Line x1="3" y1="6" x2="21" y2="6" stroke={theme.textOnGradient} strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="3" y1="12" x2="21" y2="12" stroke={theme.textOnGradient} strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="3" y1="18" x2="21" y2="18" stroke={theme.textOnGradient} strokeWidth="2.5" strokeLinecap="round" />
      </Svg>
    </TouchableOpacity>
  );
}

import { navigationRef } from './src/utils/navigationRef';

// Ana uygulama içeriği
function AppContent() {
  const { isLoading, theme, settings, username } = useApp();
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Web için global stil ayarı
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        html, body, #root {
          height: 100%;
          overflow: auto;
        }
        body {
          margin: 0;
          padding: 0;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Yükleniyor...</Text>
      </View>
    );
  }

  // Ortak Header ayarları
  const screenOptions: StackNavigationOptions = {
    headerStyle: {
      backgroundColor: theme.headerBackground,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTintColor: theme.textOnGradient,
    headerTitleStyle: {
      fontWeight: 'bold',
      fontSize: 20,
    },
    headerLeft: () => <MenuButton />, // Her ekranda menü butonu
  };

  // Onboarding: username yoksa ilk kullanım
  if (!username && !onboardingDone) {
    return (
      <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <JSDrawer>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen
            name="CreatePlan"
            component={CreatePlanScreen}
            options={{ title: '📝 Plan Oluştur' }}
          />
          <Stack.Screen
            name="MultiDayView"
            component={MultiDayViewScreen}
            options={{ title: '📅 Planlarım' }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{ title: '🗓️ Aylık Takvim' }}
          />
          <Stack.Screen
            name="PlanOverview"
            component={PlanOverviewScreen}
            options={{ title: '🔍 Genel Bakış' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: '⚙️ Ayarlar' }}
          />
        </Stack.Navigator>
      </JSDrawer>
      <StatusBar style={settings?.darkMode ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

// Context Provider ile sarmalanmış ana component
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <DrawerProvider>
          <AppContent />
        </DrawerProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
