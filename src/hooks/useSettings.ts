import { useState } from 'react';
import { Settings } from '../types';
import * as storage from '../utils/storage';

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    askBeforeDeleteAll: true,
    darkMode: false,
    notificationsEnabled: true,
    notificationTime: '08:00',
  });

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await storage.saveSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Ayarlar güncellenirken hata:', error);
      throw error;
    }
  };

  return { settings, setSettings, updateSettings };
};
