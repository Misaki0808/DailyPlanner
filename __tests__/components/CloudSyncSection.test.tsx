import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import CloudSyncSection from '../../src/components/settings/CloudSyncSection';
import { useCloudSync } from '../../src/hooks/useCloudSync';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../src/context/AppContext', () => ({
  useTheme: () => require('../../src/utils/theme').lightTheme,
}));

jest.mock('../../src/hooks/useCloudSync', () => ({ useCloudSync: jest.fn() }));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

// Onaylar web'de Alert.alert ile sessiz kalıyordu; testler web yolunu ölçüyor.
(Platform as unknown as { OS: string }).OS = 'web';

const useCloudSyncMock = useCloudSync as jest.Mock;

const baseState = {
  isConfigured: true,
  isLoading: false,
  isSyncing: false,
  sessionEmail: 'a@b.com',
  household: {
    id: 'h1',
    invite_code: 'ABC123',
    created_by: 'u1',
    created_at: '2026-09-05T10:00:00.000Z',
    members: [{ user_id: 'u1' }, { user_id: 'u2' }],
  },
  isPaired: true,
  isHouseholdCreator: true,
  isBackupPaused: false,
  memberLimit: 2,
  inviteExpiresAt: null,
  isInviteExpired: false,
  backupRecord: { household_id: 'h1', updated_at: '2026-09-06T09:00:00.000Z', updated_by: 'u1', data: null },
  refresh: jest.fn(),
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
  signOut: jest.fn(),
  createInvite: jest.fn(),
  refreshInvite: jest.fn(),
  joinHousehold: jest.fn(),
  leaveHousehold: jest.fn(),
  backupToCloud: jest.fn(),
  restoreFromCloud: jest.fn(),
  deleteBackup: jest.fn(),
};

const renderWith = (overrides: Partial<typeof baseState> = {}) => {
  const state = { ...baseState, ...overrides };
  useCloudSyncMock.mockReturnValue(state);
  return { ...render(<CloudSyncSection />), state };
};

describe('CloudSyncSection — web onayları', () => {
  const confirmSpy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    confirmSpy.mockReset().mockReturnValue(true);
    (globalThis as unknown as { confirm: unknown }).confirm = confirmSpy;
    (globalThis as unknown as { window: unknown }).window = { confirm: confirmSpy };
  });

  it('"Şimdi Yedekle" web onayından geçince çalışır', () => {
    const { getByText, state } = renderWith();

    fireEvent.press(getByText('Şimdi Yedekle'));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toContain('BİRLEŞTİRİLİR');
    expect(state.backupToCloud).toHaveBeenCalledTimes(1);
  });

  it('"Buluttan Geri Yükle" onayı reddedilirse çalışmaz', () => {
    confirmSpy.mockReturnValue(false);
    const { getByText, state } = renderWith();

    fireEvent.press(getByText('Buluttan Geri Yükle'));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(state.restoreFromCloud).not.toHaveBeenCalled();
  });

  it('"Eşleştirmeden Ayrıl" web onayından geçince çalışır', () => {
    const { getByText, state } = renderWith();

    fireEvent.press(getByText('Eşleştirmeden Ayrıl'));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(state.leaveHousehold).toHaveBeenCalledTimes(1);
  });

  it('"Bulut Yedeğini Sil" onayı ortak yedek uyarısını gösterir', () => {
    const { getByText, state } = renderWith();

    fireEvent.press(getByText('Bulut Yedeğini Sil'));

    expect(confirmSpy.mock.calls[0][0]).toContain('ORTAK');
    expect(state.deleteBackup).toHaveBeenCalledTimes(1);
  });
});

describe('CloudSyncSection — duraklatma uyarısı (R2-007)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('otomatik yedekleme duraklatıldıysa kalıcı uyarı gösterir', () => {
    const { getByText } = renderWith({ isBackupPaused: true });

    expect(getByText('⏸ Otomatik yedekleme duraklatıldı')).toBeTruthy();
  });

  it('duraklatma yokken uyarı çizilmez', () => {
    const { queryByText } = renderWith({ isBackupPaused: false });

    expect(queryByText('⏸ Otomatik yedekleme duraklatıldı')).toBeNull();
  });
});
