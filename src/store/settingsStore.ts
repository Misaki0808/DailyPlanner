import { create } from 'zustand';
import { Settings } from '../types';
import * as storage from '../utils/storage';
import { Theme, getTheme } from '../utils/theme';

interface SettingsState {
  settings: Settings;
  theme: Theme;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  _hydrate: (data: Settings | null) => void;
}

const defaultSettings: Settings = {
  askBeforeDeleteAll: true,
  darkMode: true,
  notificationsEnabled: true,
  notificationTime: '20:00',
  pomodoroFocusTime: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroSoundEnabled: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  theme: getTheme(true),
  updateSettings: async (newSettings: Partial<Settings>) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated, theme: getTheme(updated.darkMode) });
    await storage.saveSettings(updated);
  },
  _hydrate: (data) => {
    if (data) {
      set({ settings: data, theme: getTheme(data.darkMode) });
    }
  },
}));
