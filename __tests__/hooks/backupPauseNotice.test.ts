import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backupToCloudSilently, useCloudSync } from '../../src/hooks/useCloudSync';
import { supabaseService } from '../../src/services/supabase';
import * as storage from '../../src/utils/storage';

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
    restoreData: jest.fn().mockResolvedValue(null),
    deleteBackup: jest.fn(),
    getBackupDeletion: jest.fn(),
    markBackupDeleted: jest.fn(),
    clearBackupDeletion: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../src/services/pairing', () => ({
  ...jest.requireActual('../../src/services/pairing'),
  getMyHousehold: jest.fn().mockResolvedValue({
    id: 'h1',
    invite_code: 'ABC123',
    created_by: 'u1',
    created_at: '2026-09-05T10:00:00.000Z',
    members: [{ user_id: 'u1' }, { user_id: 'u2' }],
  }),
  createHousehold: jest.fn(),
  joinHousehold: jest.fn(),
  leaveHousehold: jest.fn(),
  refreshInviteCode: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const getDeletionMock = supabaseService.getBackupDeletion as jest.Mock;

describe('duraklatma uyarısı arka plan senkronuyla tazeleniyor (R2-011)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    getDeletionMock.mockReset();
  });

  // Eskiden uyarı yalnız refresh()'te hesaplanıyordu: arka plan senkronu bayat
  // işareti temizlese bile ekran açıkken uyarı asılı kalıyordu.
  it('arka plan senkronu işareti temizleyince uyarı kendiliğinden kalkar', async () => {
    await storage.saveBackupDeletedAt('h1', '2026-09-06T10:00:00.000Z');
    getDeletionMock.mockResolvedValue({ supported: true, deletedAt: '2026-09-06T10:00:00.000Z' });

    const { result } = renderHook(() => useCloudSync());
    await waitFor(() => expect(result.current.isBackupPaused).toBe(true));

    // Eş "Şimdi Yedekle" dedi: buluttaki işaret kalktı.
    getDeletionMock.mockResolvedValue({ supported: true, deletedAt: null });

    await act(async () => {
      await backupToCloudSilently();
    });

    expect(result.current.isBackupPaused).toBe(false);
    expect(await storage.getBackupDeletedAt('h1')).toBeNull();
  });

  it('arka plan senkronu duraklatmayı görürse uyarı açılır', async () => {
    getDeletionMock.mockResolvedValue({ supported: true, deletedAt: null });

    const { result } = renderHook(() => useCloudSync());
    await waitFor(() => expect(result.current.household).not.toBeNull());
    expect(result.current.isBackupPaused).toBe(false);

    // Eş yedeği sildi: buluttaki işaret göründü.
    getDeletionMock.mockResolvedValue({ supported: true, deletedAt: '2026-09-06T12:00:00.000Z' });

    await act(async () => {
      await backupToCloudSilently();
    });

    expect(result.current.isBackupPaused).toBe(true);
  });
});
