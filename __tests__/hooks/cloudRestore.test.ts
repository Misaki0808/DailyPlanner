import AsyncStorage from '@react-native-async-storage/async-storage';
import { backupToCloudSilently, restoreFromCloudSilently } from '../../src/hooks/useCloudSync';
import { supabaseService } from '../../src/services/supabase';
import { usePlansStore } from '../../src/store/plansStore';
import { defaultSettings } from '../../src/utils/defaultSettings';
import { Plans, Task } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../src/services/supabase', () => ({
  isSupabaseConfigured: true,
  getSession: jest.fn().mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } }),
  signInWithEmailOtp: jest.fn(),
  signOut: jest.fn(),
  verifyOtp: jest.fn(),
  supabaseService: {
    backupData: jest.fn().mockResolvedValue(true),
    restoreData: jest.fn(),
  },
}));

jest.mock('../../src/services/pairing', () => ({
  getMyHousehold: jest.fn().mockResolvedValue({
    id: 'h1',
    invite_code: 'ABC123',
    members: [{ user_id: 'u1' }, { user_id: 'u2' }],
  }),
  createHousehold: jest.fn(),
  joinHousehold: jest.fn(),
  leaveHousehold: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const task = (id: string, title: string): Task => ({ id, title, done: false });

const backupWith = (plans: Plans) => ({
  household_id: 'h1',
  updated_at: '2026-09-05T12:00:00.000Z',
  updated_by: 'u2',
  data: {
    version: 1 as const,
    plans,
    settings: defaultSettings,
    recurringTasks: [],
    user: { username: 'Eş', gender: 'male' as const, aboutMe: '' },
    pomodoroStats: {},
  },
});

const restoreDataMock = supabaseService.restoreData as jest.Mock;
const backupDataMock = supabaseService.backupData as jest.Mock;

const localPlanKeys = async () =>
  (await AsyncStorage.getAllKeys()).filter(k => k.startsWith('@dp_plan_')).sort();

describe('bulut geri yükleme', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    usePlansStore.setState({ plans: {} });
    restoreDataMock.mockReset();
    backupDataMock.mockReset().mockResolvedValue(true);
  });

  // Regresyon (R-001 / W-02): boş yedek geri yüklendiğinde tüm plan
  // anahtarları siliniyor, yerine hiçbir şey yazılmıyordu.
  it('yerelde veri varken BOŞ yedeği geri yüklemeyi reddeder', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Spor yap')]);
    restoreDataMock.mockResolvedValue(backupWith({}));

    const result = await restoreFromCloudSilently();

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('empty-backup');
    expect(usePlansStore.getState().plans['2026-09-05']).toHaveLength(1);
    expect(await localPlanKeys()).toEqual(['@dp_plan_2026-09-05']);
  });

  it('yerelde de veri yoksa boş yedek reddedilmez', async () => {
    restoreDataMock.mockResolvedValue(backupWith({}));

    const result = await restoreFromCloudSilently();

    expect(result.ok).toBe(true);
  });

  it('dolu yedeği geri yükler ve store ile diski eşitler', async () => {
    restoreDataMock.mockResolvedValue(
      backupWith({ '2026-09-06': [task('9', 'Buluttan gelen')] })
    );

    const result = await restoreFromCloudSilently();

    expect(result.ok).toBe(true);
    expect(usePlansStore.getState().plans['2026-09-06']).toHaveLength(1);
    expect(await localPlanKeys()).toEqual(['@dp_plan_2026-09-06']);
  });

  it('yedekte olmayan yerel günleri siler, olanları korur', async () => {
    await usePlansStore.getState().savePlan('2026-09-01', [task('1', 'Eski gün')]);
    await usePlansStore.getState().savePlan('2026-09-05', [task('2', 'Ortak gün')]);
    restoreDataMock.mockResolvedValue(
      backupWith({ '2026-09-05': [task('2', 'Ortak gün (bulut)')] })
    );

    const result = await restoreFromCloudSilently();

    expect(result.ok).toBe(true);
    expect(await localPlanKeys()).toEqual(['@dp_plan_2026-09-05']);
    expect(usePlansStore.getState().plans['2026-09-05'][0].title).toBe('Ortak gün (bulut)');
    expect(usePlansStore.getState().plans['2026-09-01']).toBeUndefined();
  });

  it('bulutta hiç kayıt yoksa yerel veriye dokunmaz', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Spor yap')]);
    restoreDataMock.mockResolvedValue(null);

    const result = await restoreFromCloudSilently();

    expect(result.reason).toBe('no-backup');
    expect(await localPlanKeys()).toEqual(['@dp_plan_2026-09-05']);
  });
});

describe('bulut yedekleme koruması', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    usePlansStore.setState({ plans: {} });
    restoreDataMock.mockReset();
    backupDataMock.mockReset().mockResolvedValue(true);
  });

  // Regresyon (W-02): taze kurulmuş bir cihaz arka plana geçtiğinde eşin
  // aylarca birikmiş verisini boş yedekle eziyordu.
  it('yerel boşken buluttaki dolu yedeğin üzerine YAZMAZ', async () => {
    restoreDataMock.mockResolvedValue(
      backupWith({ '2026-09-05': [task('1', 'Eşin görevi')] })
    );

    const result = await backupToCloudSilently();

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('empty-local');
    expect(backupDataMock).not.toHaveBeenCalled();
  });

  it('yerelde veri varsa normal yedekler', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    restoreDataMock.mockResolvedValue(backupWith({}));

    const result = await backupToCloudSilently();

    expect(result.ok).toBe(true);
    expect(backupDataMock).toHaveBeenCalledTimes(1);
  });

  it('bulut da boşsa yerel boşken yedeklemeye izin verir', async () => {
    restoreDataMock.mockResolvedValue(backupWith({}));

    const result = await backupToCloudSilently();

    expect(result.ok).toBe(true);
    expect(backupDataMock).toHaveBeenCalledTimes(1);
  });
});
