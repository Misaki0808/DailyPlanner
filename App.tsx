import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppProvider, useApp } from './src/context/AppContext';
import { DrawerProvider, useDrawer } from './src/context/DrawerContext';
import JSDrawer from './src/components/JSDrawer';
import Svg, { Line } from 'react-native-svg';
import { useEffect } from 'react';

// Ekranlar
import CreatePlanScreen from './src/screens/CreatePlanScreen';
import MultiDayViewScreen from './src/screens/MultiDayViewScreen';
import PlanOverviewScreen from './src/screens/PlanOverviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();

// Header'daki Menü Butonu (Modern Icon)
function MenuButton() {
  const { openDrawer } = useDrawer();
  return (
    <TouchableOpacity onPress={openDrawer} style={{ paddingLeft: 15 }}>
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Line x1="3" y1="6" x2="21" y2="6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="3" y1="12" x2="21" y2="12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="3" y1="18" x2="21" y2="18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </Svg>
    </TouchableOpacity>
  );
}

import { navigationRef } from './src/utils/navigationRef';

// Ana uygulama içeriği
function AppContent() {
  const { isLoading } = useApp();

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // Ortak Header ayarları
  const screenOptions = {
    headerStyle: {
      backgroundColor: '#667eea',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
      fontSize: 20,
    },
    headerLeft: () => <MenuButton />, // Her ekranda menü butonu
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <JSDrawer>
        <Stack.Navigator screenOptions={screenOptions as any}>
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
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

// Context Provider ile sarmalanmış ana component
export default function App() {
  return (
    <AppProvider>
      <DrawerProvider>
        <AppContent />
      </DrawerProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
