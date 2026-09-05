import { hasSubstantiveContent, hasUserData } from '../../src/hooks/useCloudSync';
import { CloudBackupData } from '../../src/services/supabase';
import { defaultSettings } from '../../src/utils/defaultSettings';

// jest.mock çağrıları import'ların üstüne hoist edilir; bu yüzden burada
// durmaları güvenlidir (depodaki diğer testlerle aynı düzen).
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

/**
 * hasUserData, otomatik bulut yedeklemesinin korumasıdır: yerelde veri yokken
 * ortak yedeğin üzerine yazılmasını engeller. Taze kurulmuş bir cihazın arka
 * plana geçmesi, eşin aylarca birikmiş planlarını siliyordu.
 */
describe('hasUserData (bulut yedekleme koruması)', () => {
  const empty: CloudBackupData = {
    version: 1,
    plans: {},
    settings: defaultSettings,
    recurringTasks: [],
    user: { username: null, gender: 'male', aboutMe: '' },
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

  // Regresyon (R-032): koruma yalnız plan/rutin/pomodoro'ya bakıyordu.
  // persistRestoredData "Hakkımda" metnini ve kullanıcı adını da yedekteki
  // değerle DEĞİŞTİRDİĞİ için, yalnız Hakkımda metni girmiş bir cihazda boş
  // bir yedeği geri yüklemek o metni sessizce siliyordu.
  it('yalnız "Hakkımda" metni olan cihazı boş SAYMAZ', () => {
    const withAboutMe = { ...empty, user: { username: null, gender: 'male' as const, aboutMe: 'React Native öğreniyorum' } };
    expect(hasUserData(withAboutMe)).toBe(true);
  });

  it('yalnız kullanıcı adı olan cihazı boş SAYMAZ', () => {
    const withName = { ...empty, user: { username: 'Efe', gender: 'male' as const, aboutMe: '' } };
    expect(hasUserData(withName)).toBe(true);
  });

  it('yalnız boşluktan oluşan ad/Hakkımda metnini veri saymaz', () => {
    const blank = { ...empty, user: { username: '   ', gender: 'male' as const, aboutMe: '  ' } };
    expect(hasUserData(blank)).toBe(false);
  });

  it('cinsiyet ve ayarlar tek başına veri sayılmaz', () => {
    // İkisi de her cihazda varsayılan bir değerle gelir; sayılsalardı hiçbir
    // cihaz "boş" görünmez ve koruma tamamen etkisiz kalırdı.
    expect(hasUserData({ ...empty, user: { username: null, gender: 'female', aboutMe: '' } })).toBe(false);
    expect(hasUserData({ ...empty, settings: { ...defaultSettings, darkMode: false } })).toBe(false);
  });
});

/**
 * hasSubstantiveContent, "buluta yazmaya / buluttan geri yüklemeye değer
 * içerik var mı" sorusunu yanıtlar. hasUserData'dan farkı: onboarding'de
 * girilen ad gibi alanları saymaz — yalnız adı olan taze bir cihaz eşin
 * aylarca birikmiş planlarının üzerine boş veri yazmamalı (W-02).
 */
describe('hasSubstantiveContent (yükleme koruması)', () => {
  const empty = {
    version: 1 as const,
    plans: {},
    settings: defaultSettings,
    recurringTasks: [],
    user: { username: null, gender: 'male' as const, aboutMe: '' },
    pomodoroStats: {},
  };

  it('kullanıcı adı tek başına içerik sayılmaz', () => {
    expect(hasSubstantiveContent({ ...empty, user: { username: 'Efe', gender: 'male', aboutMe: '' } })).toBe(false);
  });

  it('"Hakkımda" metni tek başına içerik sayılmaz', () => {
    expect(hasSubstantiveContent({ ...empty, user: { username: null, gender: 'male', aboutMe: 'metin' } })).toBe(false);
  });

  it('plan, rutin veya pomodoro varsa içerik sayar', () => {
    expect(hasSubstantiveContent({ ...empty, plans: { '2026-09-05': [{ id: '1', title: 'A', done: false }] } })).toBe(true);
    expect(hasSubstantiveContent({ ...empty, pomodoroStats: { '2026-09-05': 1 } })).toBe(true);
  });

  it('tamamen boş veriyi ve eksik girdiyi boş sayar', () => {
    expect(hasSubstantiveContent(empty)).toBe(false);
    expect(hasSubstantiveContent(null)).toBe(false);
  });
});
