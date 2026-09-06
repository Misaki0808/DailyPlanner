import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCloudSync } from '../../src/hooks/useCloudSync';
import { getMyHousehold } from '../../src/services/pairing';

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
    backupData: jest.fn(),
    restoreData: jest.fn().mockResolvedValue(null),
    deleteBackup: jest.fn(),
    getBackupDeletion: jest.fn().mockResolvedValue({ supported: true, deletedAt: null }),
    markBackupDeleted: jest.fn(),
    clearBackupDeletion: jest.fn(),
  },
}));

// isInviteCodeExpired gerçek uygulamasıyla kalmalı: test tam da onun zamanla
// değişen sonucunu ölçüyor.
jest.mock('../../src/services/pairing', () => ({
  ...jest.requireActual('../../src/services/pairing'),
  getMyHousehold: jest.fn(),
  createHousehold: jest.fn(),
  joinHousehold: jest.fn(),
  leaveHousehold: jest.fn(),
  refreshInviteCode: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const getMyHouseholdMock = getMyHousehold as jest.Mock;

const householdExpiringIn = (milliseconds: number) => ({
  id: 'h1',
  invite_code: 'ABC123',
  created_by: 'u1',
  created_at: '2026-09-05T10:00:00.000Z',
  invite_code_expires_at: new Date(Date.now() + milliseconds).toISOString(),
  members: [{ household_id: 'h1', user_id: 'u1', joined_at: '2026-09-05T10:00:00.000Z' }],
});

describe('davet kodu süresi ekran açıkken doluyor', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-06T12:00:00.000Z'));
    getMyHouseholdMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Eskiden "son geçerlilik" yalnız render anında hesaplanıyordu: ekran açık
  // dururken süre dolduğunda görünüm eski kalıyordu.
  it('süre dolduğunda görünüm kendiliğinden "süresi doldu"ya geçer', async () => {
    getMyHouseholdMock.mockResolvedValue(householdExpiringIn(60_000));

    const { result } = renderHook(() => useCloudSync());
    await waitFor(() => expect(result.current.household).not.toBeNull());
    expect(result.current.isInviteExpired).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    expect(result.current.isInviteExpired).toBe(true);
  });

  it('süresi zaten dolmuş kodda doğrudan dolmuş görünür', async () => {
    getMyHouseholdMock.mockResolvedValue(householdExpiringIn(-60_000));

    const { result } = renderHook(() => useCloudSync());

    await waitFor(() => expect(result.current.household).not.toBeNull());
    expect(result.current.isInviteExpired).toBe(true);
  });

  // Süre alanı yoksa (0002 uygulanmamış şema) kod süresizdir ve zamanlayıcı
  // kurulmaz; görünüm hiç "doldu"ya geçmemeli.
  it('süre alanı yoksa kod süresiz kalır', async () => {
    getMyHouseholdMock.mockResolvedValue({ ...householdExpiringIn(0), invite_code_expires_at: undefined });

    const { result } = renderHook(() => useCloudSync());
    await waitFor(() => expect(result.current.household).not.toBeNull());

    await act(async () => {
      jest.advanceTimersByTime(48 * 60 * 60 * 1000);
    });

    expect(result.current.isInviteExpired).toBe(false);
    expect(result.current.inviteExpiresAt).toBeNull();
  });
});
