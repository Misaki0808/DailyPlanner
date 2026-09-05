jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../src/services/supabase', () => ({
  isSupabaseConfigured: false,
  supabaseService: { backupData: jest.fn(), restoreData: jest.fn() },
  getSession: jest.fn(),
  signInWithEmailOtp: jest.fn(),
  signOut: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock('../../src/services/pairing', () => ({
  createHousehold: jest.fn(),
  getMyHousehold: jest.fn(),
  joinHousehold: jest.fn(),
  leaveHousehold: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

import { hasUserData } from '../../src/hooks/useCloudSync';

/**
 * hasUserData, otomatik bulut yedeklemesinin korumasıdır: yerelde veri yokken
 * ortak yedeğin üzerine yazılmasını engeller. Taze kurulmuş bir cihazın arka
 * plana geçmesi, eşin aylarca birikmiş planlarını siliyordu.
 */
describe('hasUserData (bulut yedekleme koruması)', () => {
  const empty = {
    version: 1,
    plans: {},
    settings: {} as any,
    recurringTasks: [],
    user: { username: null, gender: 'male' as const, aboutMe: '' },
    pomodoroStats: {},
  };

  it('taze kurulumu (hiç veri yok) boş sayar', () => {
    expect(hasUserData(empty)).toBe(false);
  });

  it('eksik/bozuk yedeği boş sayar', () => {
    expect(hasUserData(null)).toBe(false);
    expect(hasUserData(undefined)).toBe(false);
  });

  it('yalnız boş gün listeleri varsa boş sayar', () => {
    expect(hasUserData({ ...empty, plans: { '2026-09-05': [], '2026-09-06': [] } })).toBe(false);
  });

  it('tek bir görev bile olsa veri var sayar', () => {
    const withPlan = {
      ...empty,
      plans: { '2026-09-05': [{ id: '1', title: 'Spor yap', done: false }] },
    };
    expect(hasUserData(withPlan)).toBe(true);
  });

  it('yalnız tekrarlayan görev varsa veri var sayar', () => {
    const withRecurring = {
      ...empty,
      recurringTasks: [{
        id: 'r1',
        title: 'Kira öde',
        priority: 'high' as const,
        frequency: 'monthly' as const,
        monthDay: 31,
        isActive: true,
        createdAt: '2026-09-05',
      }],
    };
    expect(hasUserData(withRecurring)).toBe(true);
  });

  it('yalnız pomodoro istatistiği varsa veri var sayar', () => {
    expect(hasUserData({ ...empty, pomodoroStats: { '2026-09-05': 4 } })).toBe(true);
  });

  it('kullanıcı adı tek başına yedeklemeyi tetiklemez', () => {
    // Sadece onboarding tamamlanmış, henüz plan girilmemiş cihaz da
    // buluttaki dolu yedeği ezmemeli.
    expect(hasUserData({ ...empty, user: { username: 'Efe', gender: 'male', aboutMe: '' } })).toBe(false);
  });
});
