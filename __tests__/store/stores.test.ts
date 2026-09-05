import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { usePlansStore } from '../../src/store/plansStore';
import { useRecurringStore } from '../../src/store/recurringStore';
import { usePomodoroStore } from '../../src/store/pomodoroStore';
import { useUserStore } from '../../src/store/userStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { defaultSettings } from '../../src/utils/defaultSettings';
import { getTheme } from '../../src/utils/theme';
import * as storage from '../../src/utils/storage';
import { Task } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

// recurringStore ekleme sonrası appStore.syncRecurringForToday çağırıyor;
// bu test store'un kendi davranışına odaklandığı için sync mock'lanıyor.
jest.mock('../../src/store/appStore', () => ({
  syncRecurringForToday: jest.fn().mockResolvedValue(undefined),
}));

const task = (id: string, done = false): Task => ({ id, title: `Görev ${id}`, done });
const toastMock = Toast.show as jest.Mock;

describe('plansStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    usePlansStore.setState({ plans: {} });
    toastMock.mockClear();
  });

  it('savePlan hem store hem diski günceller', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1')]);

    expect(usePlansStore.getState().plans['2026-09-05']).toHaveLength(1);
    const raw = await AsyncStorage.getItem('@dp_plan_2026-09-05');
    expect(JSON.parse(raw || '[]')).toHaveLength(1);
  });

  it('deletePlan günü store ve diskten kaldırır', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1')]);
    await usePlansStore.getState().deletePlan('2026-09-05');

    expect(usePlansStore.getState().plans['2026-09-05']).toBeUndefined();
    expect(await AsyncStorage.getItem('@dp_plan_2026-09-05')).toBeNull();
  });

  it('updateTask yalnız hedef görevi değiştirir ve diğer günlere dokunmaz', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1'), task('2')]);
    await usePlansStore.getState().savePlan('2026-09-06', [task('3')]);

    await usePlansStore.getState().updateTask('2026-09-05', '2', { done: true });

    const plans = usePlansStore.getState().plans;
    expect(plans['2026-09-05'][0].done).toBe(false);
    expect(plans['2026-09-05'][1].done).toBe(true);
    expect(plans['2026-09-06'][0].done).toBe(false);
  });

  it('olmayan günde updateTask çökmez', async () => {
    await expect(
      usePlansStore.getState().updateTask('2026-01-01', 'x', { done: true })
    ).resolves.toBeUndefined();
  });

  // Regresyon (W-16 / R-021): yazma başarısız olduğunda kullanıcı arayüzde
  // veriyi kaydedilmiş görüyor ama uygulama yeniden açılınca kayboluyordu.
  // Başarısızlık artık en azından görünür olmalı.
  it('disk yazımı başarısız olursa kullanıcıya bildirim gösterir', async () => {
    const spy = jest.spyOn(storage, 'savePlan').mockResolvedValue(false);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await usePlansStore.getState().savePlan('2026-09-05', [task('1')]);

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Kaydedilemedi' })
      );
    } finally {
      spy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('yazma başarılıysa bildirim göstermez', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1')]);
    expect(toastMock).not.toHaveBeenCalled();
  });
});

describe('recurringStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useRecurringStore.setState({ recurringTasks: [] });
    toastMock.mockClear();
  });

  it('addRecurringTask id ve createdAt üretip diske yazar', async () => {
    await useRecurringStore.getState().addRecurringTask({
      title: 'Spor yap',
      priority: 'medium',
      frequency: 'daily',
      isActive: true,
    });

    const tasks = useRecurringStore.getState().recurringTasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBeTruthy();
    expect(tasks[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const raw = await AsyncStorage.getItem('@daily_planner_recurring_tasks');
    expect(JSON.parse(raw || '[]')).toHaveLength(1);
  });

  it('toggleRecurringTask yalnız hedefin isActive değerini çevirir', async () => {
    useRecurringStore.setState({
      recurringTasks: [
        { id: 'a', title: 'A', priority: 'low', frequency: 'daily', isActive: true, createdAt: '2026-09-01' },
        { id: 'b', title: 'B', priority: 'low', frequency: 'daily', isActive: true, createdAt: '2026-09-01' },
      ],
    });

    await useRecurringStore.getState().toggleRecurringTask('a');

    const tasks = useRecurringStore.getState().recurringTasks;
    expect(tasks.find(t => t.id === 'a')?.isActive).toBe(false);
    expect(tasks.find(t => t.id === 'b')?.isActive).toBe(true);
  });

  it('removeRecurringTask görevi store ve diskten siler', async () => {
    useRecurringStore.setState({
      recurringTasks: [
        { id: 'a', title: 'A', priority: 'low', frequency: 'daily', isActive: true, createdAt: '2026-09-01' },
      ],
    });

    await useRecurringStore.getState().removeRecurringTask('a');

    expect(useRecurringStore.getState().recurringTasks).toHaveLength(0);
    expect(JSON.parse((await AsyncStorage.getItem('@daily_planner_recurring_tasks')) || '[]')).toHaveLength(0);
  });
});

describe('pomodoroStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    usePomodoroStore.setState({ pomodoroStats: {} });
    toastMock.mockClear();
  });

  it('addPomodoroSession günün sayacını artırır', async () => {
    await usePomodoroStore.getState().addPomodoroSession('2026-09-05');
    await usePomodoroStore.getState().addPomodoroSession('2026-09-05');

    expect(usePomodoroStore.getState().pomodoroStats['2026-09-05']).toBe(2);
  });

  it('farklı günleri ayrı sayar ve diske yazar', async () => {
    await usePomodoroStore.getState().addPomodoroSession('2026-09-05');
    await usePomodoroStore.getState().addPomodoroSession('2026-09-06');

    const raw = await AsyncStorage.getItem('@daily_planner_pomodoro_stats');
    expect(JSON.parse(raw || '{}')).toEqual({ '2026-09-05': 1, '2026-09-06': 1 });
  });
});

describe('userStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useUserStore.setState({ username: null, gender: 'male', aboutMe: '' });
    toastMock.mockClear();
  });

  it('setUsername store ve diski günceller', async () => {
    await useUserStore.getState().setUsername('Efe');

    expect(useUserStore.getState().username).toBe('Efe');
    expect(await AsyncStorage.getItem('@daily_planner_user_name')).toBe('Efe');
  });

  it('saveAboutMe metni saklar', async () => {
    await useUserStore.getState().saveAboutMe('React Native öğreniyorum');

    expect(useUserStore.getState().aboutMe).toBe('React Native öğreniyorum');
    expect(await AsyncStorage.getItem('@daily_planner_about_me')).toBe('React Native öğreniyorum');
  });
});

describe('settingsStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState({ settings: defaultSettings, theme: getTheme(defaultSettings.darkMode) });
    toastMock.mockClear();
  });

  it('updateSettings kısmi güncelleme yapar ve diğer alanları korur', async () => {
    await useSettingsStore.getState().updateSettings({ pomodoroFocusTime: 50 });

    const settings = useSettingsStore.getState().settings;
    expect(settings.pomodoroFocusTime).toBe(50);
    expect(settings.notificationTime).toBe(defaultSettings.notificationTime);
  });

  it('darkMode değişince tema da güncellenir', async () => {
    await useSettingsStore.getState().updateSettings({ darkMode: false });

    expect(useSettingsStore.getState().theme).toBe(getTheme(false));
  });

  // Regresyon: eski sürümde kaydedilmiş/buluttan gelen eksik alanlar
  // varsayılanla tamamlanmalı, undefined kalmamalı.
  it('_hydrate eksik alanları varsayılanla tamamlar', () => {
    useSettingsStore.getState()._hydrate({ darkMode: false, notificationTime: '09:00' });

    const settings = useSettingsStore.getState().settings;
    expect(settings.notificationTime).toBe('09:00');
    expect(settings.pomodoroFocusTime).toBe(defaultSettings.pomodoroFocusTime);
    expect(settings.weeklyTaskGoal).toBe(defaultSettings.weeklyTaskGoal);
    expect(settings.autoCleanOldPlans).toBe(false);
  });

  it('_hydrate null ile çağrılınca mevcut ayarları bozmaz', () => {
    useSettingsStore.getState()._hydrate(null);
    expect(useSettingsStore.getState().settings).toEqual(defaultSettings);
  });
});
