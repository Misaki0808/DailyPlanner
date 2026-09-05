import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultSettings, withSettingsDefaults } from '../../src/utils/defaultSettings';
import { getSettings, saveSettings } from '../../src/utils/storage';
import { Settings } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const SETTINGS_KEY = '@daily_planner_settings';

describe('withSettingsDefaults', () => {
  it('eksik alanları varsayılanla tamamlar', () => {
    // v1 kurulumunda pomodoro alanları henüz yoktu
    const legacy = {
      askBeforeDeleteAll: false,
      darkMode: false,
      notificationsEnabled: false,
      notificationTime: '09:30',
    };

    const merged = withSettingsDefaults(legacy);

    expect(merged.notificationTime).toBe('09:30');
    expect(merged.darkMode).toBe(false);
    expect(merged.pomodoroFocusTime).toBe(defaultSettings.pomodoroFocusTime);
    expect(merged.pomodoroShortBreak).toBe(defaultSettings.pomodoroShortBreak);
    expect(merged.pomodoroLongBreak).toBe(defaultSettings.pomodoroLongBreak);
    expect(merged.pomodoroSoundEnabled).toBe(defaultSettings.pomodoroSoundEnabled);
  });

  it('kullanıcının kaydettiği değerleri varsayılanların üzerine yazar', () => {
    const stored: Settings = { ...defaultSettings, pomodoroFocusTime: 50, darkMode: false };
    expect(withSettingsDefaults(stored)).toEqual(stored);
  });

  it('bozuk/eksik veride varsayılanlara döner', () => {
    expect(withSettingsDefaults(null)).toEqual(defaultSettings);
    expect(withSettingsDefaults(undefined)).toEqual(defaultSettings);
    expect(withSettingsDefaults('bozuk')).toEqual(defaultSettings);
    expect(withSettingsDefaults([1, 2, 3])).toEqual(defaultSettings);
  });

  it('varsayılan nesnenin kendisini döndürmez (mutasyon koruması)', () => {
    const merged = withSettingsDefaults(null);
    merged.darkMode = !merged.darkMode;
    expect(defaultSettings.darkMode).toBe(true);
  });
});

describe('getSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('hiç kayıt yoksa varsayılanları döndürür', async () => {
    await expect(getSettings()).resolves.toEqual(defaultSettings);
  });

  it('eski sürümden kalan eksik alanları varsayılanla doldurur', async () => {
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ askBeforeDeleteAll: true, darkMode: true, notificationsEnabled: true, notificationTime: '20:00' })
    );

    const settings = await getSettings();

    expect(settings.pomodoroFocusTime).toBe(defaultSettings.pomodoroFocusTime);
    expect(settings.pomodoroSoundEnabled).toBe(defaultSettings.pomodoroSoundEnabled);
  });

  it('bozuk JSON kaydında varsayılanlara döner', async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, '{bozuk-json');
    await expect(getSettings()).resolves.toEqual(defaultSettings);
  });

  it('kaydedilen ayarları aynen geri okur', async () => {
    const custom: Settings = { ...defaultSettings, pomodoroFocusTime: 45, notificationTime: '07:15' };
    await saveSettings(custom);
    await expect(getSettings()).resolves.toEqual(custom);
  });
});
