import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Widget task handler — Android widget eventlerini yakalar
// Expo Go'da çökmemesi için try-catch ve dinamik require kullanıyoruz
try {
  if (Platform.OS === 'android') {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  }
} catch (e) {
  console.log('Widget task handler could not be registered (likely running in Expo Go).');
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
