import { create } from 'zustand';
import { Settings } from '../types';
import * as storage from '../utils/storage';
import { Theme, getTheme } from '../utils/theme';
import { defaultSettings, withSettingsDefaults } from '../utils/defaultSettings';

interface SettingsState {
  settings: Settings;
  theme: Theme;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  _hydrate: (data: Partial<Settings> | null) => void;
}

export { defaultSettings };

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  theme: getTheme(defaultSettings.darkMode),
  updateSettings: async (newSettings: Partial<Settings>) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated, theme: getTheme(updated.darkMode) });
    await storage.saveSettings(updated);
  },
  _hydrate: (data) => {
    if (data) {
      // Eski sürümden/buluttan gelen eksik alanlar varsayılanla tamamlanır
      const merged = withSettingsDefaults(data);
      set({ settings: merged, theme: getTheme(merged.darkMode) });
    }
  },
}));
