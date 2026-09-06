import AsyncStorage from '@react-native-async-storage/async-storage';
import { backupToCloudSilently } from '../../src/hooks/useCloudSync';
import { supabaseService } from '../../src/services/supabase';
import { usePlansStore } from '../../src/store/plansStore';
import { useUserStore } from '../../src/store/userStore';
import * as storage from '../../src/utils/storage';
import { defaultSettings } from '../../src/utils/defaultSettings';
import type { CloudBackupData } from '../../src/services/supabase';
import type { Plans, Task } from '../../src/types';

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
    backupData: jest.fn().mockResolvedValue('written'),
    restoreData: jest.fn(),
    deleteBackup: jest.fn(),
    getBackupDeletion: jest.fn().mockResolvedValue(null),
    markBackupDeleted: jest.fn(),
    clearBackupDeletion: jest.fn(),
  },
}));

jest.mock('../../src/services/pairing', () => ({
  getMyHousehold: jest.fn().mockResolvedValue({
    id: 'h1',
    invite_code: 'ABC123',
    created_by: 'u1',
    members: [{ user_id: 'u1' }, { user_id: 'u2' }],
  }),
  createHousehold: jest.fn(),
  joinHousehold: jest.fn(),
  leaveHousehold: jest.fn(),
  refreshInviteCode: jest.fn(),
  isInviteCodeExpired: () => false,
  HOUSEHOLD_MEMBER_LIMIT: 2,
  INVITE_CODE_TTL_HOURS: 24,
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const task = (id: string, title: string, extra: Partial<Task> = {}): Task => ({ id, title, done: false, ...extra });

const cloudData = (plans: Plans): CloudBackupData => ({
  version: 1,
  plans,
  settings: { ...defaultSettings },
  recurringTasks: [],
  user: { username: null, gender: 'male', aboutMe: '' },
  pomodoroStats: {},
});

const cloudRecord = (plans: Plans, updatedAt = '2026-09-05T12:00:00.000Z') => ({
  household_id: 'h1',
  updated_at: updatedAt,
  updated_by: 'u2',
  data: cloudData(plans),
});

const restoreDataMock = supabaseService.restoreData as jest.Mock;
const backupDataMock = supabaseService.backupData as jest.Mock;
const getDeletionMock = supabaseService.getBackupDeletion as jest.Mock;
const clearDeletionMock = supabaseService.clearBackupDeletion as jest.Mock;

/** Son backupData çağrısında buluta yazılan veri. */
const lastWrittenData = (): CloudBackupData => backupDataMock.mock.calls.at(-1)?.[1];

const localDays = () => Object.keys(usePlansStore.getState().plans).sort();

beforeEach(async () => {
  await AsyncStorage.clear();
  usePlansStore.setState({ plans: {} });
  useUserStore.setState({ username: null, gender: 'male', aboutMe: '' });
  restoreDataMock.mockReset();
  backupDataMock.mockReset().mockResolvedValue('written');
  getDeletionMock.mockReset().mockResolvedValue(null);
  clearDeletionMock.mockReset().mockResolvedValue(true);
});

describe('bulut birleştirme akışı', () => {
  it('iki cihazın farklı günlerini birleştirip hem buluta hem cihaza uygular', async () => {
    await usePlansStore.getState().savePlan('2026-09-02', [task('2', 'Yerel görev')]);
    restoreDataMock.mockResolvedValue(cloudRecord({ '2026-09-03': [task('3', 'Eşin görevi')] }));

    const result = await backupToCloudSilently();

    expect(result.ok).toBe(true);
    expect(Object.keys(lastWrittenData().plans).sort()).toEqual(['2026-09-02', '2026-09-03']);
    // Birleşim cihaza da uygulanır: senkron tek yönlü yedekleme değil.
    expect(localDays()).toEqual(['2026-09-02', '2026-09-03']);
    expect(await AsyncStorage.getItem('@dp_plan_2026-09-03')).not.toBeNull();
  });

  it('aynı günde iki cihazın görevlerini kaybetmeden birleştirir', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    restoreDataMock.mockResolvedValue(cloudRecord({ '2026-09-05': [task('2', 'Eşin görevi')] }));

    await backupToCloudSilently();

    expect(lastWrittenData().plans['2026-09-05'].map(t => t.title)).toEqual(['Benim görevim', 'Eşin görevi']);
  });

  // Silme yayılımı yalnız taban varken mümkün: taban, "yoklukta silme mi var"
  // sorusunun tek cevabı.
  it('taban varken eşin sildiği görevi yerelden de düşürür', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Eşin sildiği')]);
    await storage.saveSyncBase('h1', cloudData({ '2026-09-05': [task('1', 'Eşin sildiği')] }), '2026-09-05T10:00:00.000Z');
    restoreDataMock.mockResolvedValue(cloudRecord({}));

    await backupToCloudSilently();

    expect(lastWrittenData().plans).toEqual({});
    expect(localDays()).toEqual([]);
    expect(await AsyncStorage.getItem('@dp_plan_2026-09-05')).toBeNull();
  });

  it('taban yokken hiçbir şeyi silmez', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Yerel')]);
    restoreDataMock.mockResolvedValue(cloudRecord({}));

    await backupToCloudSilently();

    expect(localDays()).toEqual(['2026-09-05']);
    expect(lastWrittenData().plans['2026-09-05']).toHaveLength(1);
  });

  // Kayıp güncelleme koruması: araya eşin cihazı yazdıysa yazma reddedilir,
  // yeniden okunup birleştirilir.
  it('çakışmada yeniden okuyup birleştirir', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    restoreDataMock
      .mockResolvedValueOnce(cloudRecord({}, '2026-09-05T12:00:00.000Z'))
      .mockResolvedValue(cloudRecord({ '2026-09-06': [task('9', 'Araya giren')] }, '2026-09-05T13:00:00.000Z'));
    backupDataMock.mockResolvedValueOnce('conflict').mockResolvedValue('written');

    const result = await backupToCloudSilently();

    expect(result.ok).toBe(true);
    expect(backupDataMock).toHaveBeenCalledTimes(2);
    // İkinci deneme, araya giren değişikliği de içeren birleşimi yazar.
    expect(Object.keys(lastWrittenData().plans).sort()).toEqual(['2026-09-05', '2026-09-06']);
    expect(backupDataMock.mock.calls[1][2]).toBe('2026-09-05T13:00:00.000Z');
  });

  it('çakışma sürerse yazmayı bırakır', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    restoreDataMock.mockResolvedValue(cloudRecord({}));
    backupDataMock.mockResolvedValue('conflict');

    const result = await backupToCloudSilently();

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('conflict');
  });

  it('başarılı eşitlemeden sonra tabanı kaydeder', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    restoreDataMock.mockResolvedValue(cloudRecord({}, '2026-09-05T12:00:00.000Z'));

    await backupToCloudSilently();

    const base = await storage.getSyncBase('h1');
    expect(base?.plans['2026-09-05']).toHaveLength(1);
    // Taban hane kimliğine bağlı: başka haneye geçildiyse kullanılmaz.
    expect(await storage.getSyncBase('h2')).toBeNull();
  });
});

describe('silinen yedek dirilmiyor (R2-006)', () => {
  it('yerel silme işareti varken otomatik yedekleme yazmaz', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    await storage.saveBackupDeletedAt('h1', '2026-09-05T12:00:00.000Z');
    restoreDataMock.mockResolvedValue(null);

    const result = await backupToCloudSilently();

    expect(result.reason).toBe('deleted-by-user');
    expect(backupDataMock).not.toHaveBeenCalled();
  });

  it('buluttaki silme işareti eşin cihazında da otomatik yedeklemeyi durdurur', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    getDeletionMock.mockResolvedValue('2026-09-05T12:00:00.000Z');
    restoreDataMock.mockResolvedValue(null);

    const result = await backupToCloudSilently();

    expect(result.reason).toBe('deleted-by-user');
    expect(backupDataMock).not.toHaveBeenCalled();
  });

  it('kullanıcı açıkça yedeklerse işaret kalkar ve yazma yapılır', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    await storage.saveBackupDeletedAt('h1', '2026-09-05T12:00:00.000Z');
    restoreDataMock.mockResolvedValue(null);

    const result = await backupToCloudSilently({ explicit: true });

    expect(result.ok).toBe(true);
    expect(backupDataMock).toHaveBeenCalledTimes(1);
    expect(await storage.getBackupDeletedAt('h1')).toBeNull();
    expect(clearDeletionMock).toHaveBeenCalledWith('h1');
  });
});

describe('geriye uyum', () => {
  // 0003 uygulanmamışsa silme işareti tablosu yoktur; okuma hatası eşitlemeyi
  // durdurmamalı, bugünkü davranış sürmeli.
  it('silme işareti tablosu yoksa yedekleme normal çalışır', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
      getDeletionMock.mockRejectedValue({ code: 'PGRST205', message: 'table not found' });
      restoreDataMock.mockResolvedValue(null);

      const result = await backupToCloudSilently();

      expect(result.ok).toBe(true);
      expect(backupDataMock).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  // Bulutta satır yoksa birleştirilecek bir şey de yoktur: yerel veri
  // doğrudan yazılır (0002/0003 uygulanmamış kurulumların yolu).
  it('bulutta satır yokken yerel veriyi olduğu gibi yazar', async () => {
    await usePlansStore.getState().savePlan('2026-09-05', [task('1', 'Benim görevim')]);
    restoreDataMock.mockResolvedValue(null);

    const result = await backupToCloudSilently();

    expect(result.ok).toBe(true);
    expect(backupDataMock).toHaveBeenCalledWith('h1', expect.objectContaining({ version: 1 }), null);
    expect(lastWrittenData().plans['2026-09-05']).toHaveLength(1);
  });
});
