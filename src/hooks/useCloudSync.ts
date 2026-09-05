import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { CloudBackupData, CloudBackupRecord, getSession, isSupabaseConfigured, signInWithEmailOtp, signOut as supabaseSignOut, supabaseService, verifyOtp as supabaseVerifyOtp } from '../services/supabase';
import { createHousehold, getMyHousehold, joinHousehold as joinHouseholdByCode, leaveHousehold as leaveCurrentHousehold } from '../services/pairing';
import { HouseholdWithMembers } from '../services/supabase';
import { usePlansStore } from '../store/plansStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRecurringStore } from '../store/recurringStore';
import { useUserStore } from '../store/userStore';
import { usePomodoroStore } from '../store/pomodoroStore';
import * as storage from '../utils/storage';

const PLAN_PREFIX = '@dp_plan_';

type BackupResult = {
  ok: boolean;
  record?: CloudBackupRecord | null;
  reason?: 'not-configured' | 'not-signed-in' | 'not-paired' | 'no-backup' | 'empty-local' | 'empty-backup' | 'error';
  error?: unknown;
};

/**
 * Buluta YAZMAYA / buluttan GERİ YÜKLEMEYE değer, gerçek içerik var mı?
 *
 * Yalnız kullanıcının ürettiği asıl içeriğe bakar: planlar, tekrarlayan
 * görevler, pomodoro istatistikleri. Onboarding'de girilen ad gibi alanlar
 * bilinçli olarak DIŞARIDA: yalnız adı olan taze bir cihaz, eşin aylarca
 * birikmiş planlarının üzerine boş veri yazmamalı.
 */
export const hasSubstantiveContent = (data?: CloudBackupData | null): boolean => {
  if (!data) return false;
  return (
    Object.values(data.plans || {}).some(tasks => (tasks?.length || 0) > 0) ||
    (data.recurringTasks?.length || 0) > 0 ||
    Object.keys(data.pomodoroStats || {}).length > 0
  );
};

/**
 * Geri yükleme sırasında ÜZERİNE YAZILACAK herhangi bir kalıcı kullanıcı
 * verisi var mı?
 *
 * persistRestoredData; kullanıcı adını, "Hakkımda" metnini ve profili de
 * yedekteki değerlerle değiştiriyor. Bu yüzden koruma, asıl içeriğe ek
 * olarak bu alanları da kapsamalı: yalnız "Hakkımda" metni girmiş bir
 * cihazda boş bir yedeği geri yüklemek o metni sessizce siliyordu.
 *
 * `gender` ve `settings` bilerek sayılmaz: ikisi de her cihazda varsayılan
 * bir değerle geldiği için sayılsalardı hiçbir cihaz "boş" görünmez ve
 * koruma tamamen etkisiz kalırdı.
 */
export const hasUserData = (data?: CloudBackupData | null): boolean => {
  if (!data) return false;
  if (hasSubstantiveContent(data)) return true;
  return Boolean(data.user?.username?.trim()) || Boolean(data.user?.aboutMe?.trim());
};

const buildCloudBackupData = (): CloudBackupData => ({
  version: 1,
  plans: usePlansStore.getState().plans,
  settings: useSettingsStore.getState().settings,
  recurringTasks: useRecurringStore.getState().recurringTasks,
  user: {
    username: useUserStore.getState().username,
    gender: useUserStore.getState().gender,
    aboutMe: useUserStore.getState().aboutMe,
  },
  pomodoroStats: usePomodoroStore.getState().pomodoroStats,
});

const persistRestoredData = async (backup: CloudBackupData) => {
  const incomingPlans = backup.plans || {};

  // ÖNCE yaz, SONRA yalnız yedekte bulunmayan eski günleri sil. Eskiden tüm
  // plan anahtarları silinip ardından yazılıyordu; araya bir hata girerse
  // cihazda hiç plan kalmıyordu.
  await Promise.all([
    ...Object.entries(incomingPlans).map(([date, tasks]) => storage.savePlan(date, tasks)),
    storage.saveSettings(backup.settings),
    storage.saveRecurringTasks(backup.recurringTasks || []),
    backup.user?.username !== undefined && backup.user?.username !== null
      ? storage.saveUserName(backup.user.username)
      : Promise.resolve(true),
    backup.user?.gender ? storage.saveGender(backup.user.gender) : Promise.resolve(true),
    backup.user?.aboutMe !== undefined ? storage.saveAboutMe(backup.user.aboutMe) : Promise.resolve(true),
    storage.savePomodoroStats(backup.pomodoroStats || {}),
  ]);

  const incomingKeys = new Set(Object.keys(incomingPlans).map(date => `${PLAN_PREFIX}${date}`));
  const staleKeys = (await AsyncStorage.getAllKeys())
    .filter(key => key.startsWith(PLAN_PREFIX) && !incomingKeys.has(key));
  if (staleKeys.length > 0) {
    await AsyncStorage.multiRemove(staleKeys);
  }
};

const hydrateStoresFromBackup = (backup: CloudBackupData) => {
  usePlansStore.getState()._hydrate(backup.plans || {});
  useSettingsStore.getState()._hydrate(backup.settings);
  useRecurringStore.getState()._hydrate(backup.recurringTasks || []);
  useUserStore.getState()._hydrate({
    username: backup.user?.username ?? useUserStore.getState().username,
    gender: backup.user?.gender ?? useUserStore.getState().gender,
    aboutMe: backup.user?.aboutMe ?? useUserStore.getState().aboutMe,
  });
  usePomodoroStore.getState()._hydrate(backup.pomodoroStats || {});
};

export const isHouseholdPaired = (household: HouseholdWithMembers | null) => (household?.members.length || 0) >= 2;

export async function fetchCloudBackupRecord(): Promise<CloudBackupRecord | null> {
  if (!isSupabaseConfigured) return null;

  const household = await getMyHousehold();
  if (!household) return null;

  return supabaseService.restoreData(household.id);
}

export async function backupToCloudSilently(): Promise<BackupResult> {
  try {
    if (!isSupabaseConfigured) return { ok: false, reason: 'not-configured' };

    const session = await getSession();
    if (!session) return { ok: false, reason: 'not-signed-in' };

    const household = await getMyHousehold();
    if (!household || !isHouseholdPaired(household)) return { ok: false, reason: 'not-paired' };

    const payload = buildCloudBackupData();

    // Yedek, household başına TEK bir satırda tutuluyor ve son yazan kazanıyor.
    // Bu yedekleme her arka plana geçişte otomatik tetiklendiği için, henüz
    // geri yükleme yapmamış taze bir cihaz eşin aylarca birikmiş verisini
    // uyarısız boş veriyle ezebiliyordu. Yerelde veri yokken bulutta veri
    // varsa yazma yapılmaz.
    if (!hasSubstantiveContent(payload)) {
      const existing = await supabaseService.restoreData(household.id);
      if (hasUserData(existing?.data)) {
        return { ok: false, reason: 'empty-local', record: existing };
      }
    }

    const success = await supabaseService.backupData(household.id, payload);
    if (!success) return { ok: false, reason: 'error' };

    const record = await supabaseService.restoreData(household.id);
    return { ok: true, record };
  } catch (error) {
    console.warn('Silent cloud backup failed:', error);
    return { ok: false, reason: 'error', error };
  }
}

export async function restoreFromCloudSilently(): Promise<BackupResult> {
  try {
    if (!isSupabaseConfigured) return { ok: false, reason: 'not-configured' };

    const session = await getSession();
    if (!session) return { ok: false, reason: 'not-signed-in' };

    const household = await getMyHousehold();
    if (!household) return { ok: false, reason: 'not-paired' };

    const record = await supabaseService.restoreData(household.id);
    if (!record) return { ok: false, reason: 'no-backup' };

    // Boş bir yedeği geri yüklemek, cihazdaki tüm planları silip yerine
    // hiçbir şey yazmamak demektir. Yerelde veri varken buluttaki yedek boşsa
    // bu neredeyse her zaman istenmeyen bir durumdur (eşleşen taze bir cihaz
    // ortak satırı boş veriyle ezmiş olabilir), bu yüzden reddedilir.
    if (!hasSubstantiveContent(record.data) && hasUserData(buildCloudBackupData())) {
      return { ok: false, reason: 'empty-backup', record };
    }

    await persistRestoredData(record.data);
    hydrateStoresFromBackup(record.data);
    return { ok: true, record };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export const useCloudSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [household, setHousehold] = useState<HouseholdWithMembers | null>(null);
  const [backupRecord, setBackupRecord] = useState<CloudBackupRecord | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSessionEmail(null);
      setHousehold(null);
      setBackupRecord(null);
      return;
    }

    setIsLoading(true);
    try {
      const session = await getSession();
      setSessionEmail(session?.user.email ?? null);

      if (!session) {
        setHousehold(null);
        setBackupRecord(null);
        return;
      }

      const currentHousehold = await getMyHousehold();
      setHousehold(currentHousehold);
      setBackupRecord(currentHousehold ? await supabaseService.restoreData(currentHousehold.id) : null);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Bulut Durumu Alınamadı', text2: errorMessage(error, 'Lütfen tekrar deneyin.') });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendOtp = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailOtp(email);
      Toast.show({ type: 'success', text1: 'Kod Gönderildi', text2: 'E-postanızdaki 6 haneli kodu girin.' });
      return true;
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Kod Gönderilemedi', text2: errorMessage(error, 'E-posta adresini kontrol edin.') });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    setIsLoading(true);
    try {
      const session = await supabaseVerifyOtp(email, token);
      setSessionEmail(session?.user.email ?? null);
      await refresh();
      Toast.show({ type: 'success', text1: 'Giriş Başarılı', text2: 'Bulut hesabınız hazır.' });
      return true;
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Doğrulama Başarısız', text2: errorMessage(error, 'Kodun süresi dolmuş veya hatalı olabilir.') });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  const createInvite = useCallback(async () => {
    setIsLoading(true);
    try {
      const created = await createHousehold();
      setHousehold(created);
      setBackupRecord(created ? await supabaseService.restoreData(created.id) : null);
      return created;
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Davet Kodu Oluşturulamadı', text2: errorMessage(error, 'Lütfen tekrar deneyin.') });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinHousehold = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const joined = await joinHouseholdByCode(code);
      setHousehold(joined);
      setBackupRecord(joined ? await supabaseService.restoreData(joined.id) : null);
      Toast.show({ type: 'success', text1: 'Eşleştirme Tamamlandı', text2: 'Ortak yedekleme alanınız hazır.' });
      return true;
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Eşleştirme Başarısız', text2: errorMessage(error, 'Davet kodunu kontrol edin.') });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaveHousehold = useCallback(async () => {
    setIsLoading(true);
    try {
      await leaveCurrentHousehold();
      setHousehold(null);
      setBackupRecord(null);
      Toast.show({ type: 'success', text1: 'Eşleştirme Kaldırıldı' });
      return true;
    } catch (error) {
      Toast.show({ type: 'error', text1: 'İşlem Başarısız', text2: errorMessage(error, 'Lütfen tekrar deneyin.') });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabaseSignOut();
      setSessionEmail(null);
      setHousehold(null);
      setBackupRecord(null);
      Toast.show({ type: 'success', text1: 'Çıkış Yapıldı' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Çıkış Yapılamadı', text2: errorMessage(error, 'Lütfen tekrar deneyin.') });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const backupToCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await backupToCloudSilently();
      if (!result.ok) {
        const text2 = result.reason === 'empty-local'
          ? 'Bu cihazda yedeklenecek veri yok. Buluttaki yedeğin üzerine yazılmadı; önce "Buluttan Geri Yükle" yapın.'
          : 'Giriş ve eşleştirme durumunu kontrol edin.';
        Toast.show({ type: 'error', text1: 'Yedekleme Yapılmadı', text2 });
        return false;
      }

      setBackupRecord(result.record ?? null);
      Toast.show({ type: 'success', text1: 'Yedekleme Başarılı', text2: 'Yerel veriler buluta kaydedildi.' });
      return true;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const restoreFromCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await restoreFromCloudSilently();
      if (!result.ok) {
        const text2 = result.reason === 'no-backup'
          ? 'Bulutta geri yüklenecek yedek bulunamadı.'
          : result.reason === 'empty-backup'
            ? 'Buluttaki yedek boş. Bu cihazdaki planlar silinmedi; önce diğer cihazdan yedekleme yapın.'
            : 'Giriş ve eşleştirme durumunu kontrol edin.';
        Toast.show({ type: 'error', text1: 'Geri Yükleme Yapılmadı', text2 });
        return false;
      }

      setBackupRecord(result.record ?? null);
      Toast.show({ type: 'success', text1: 'Geri Yükleme Başarılı', text2: 'Bulut yedeği bu cihaza uygulandı.' });
      return true;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isConfigured: isSupabaseConfigured,
    isLoading,
    isSyncing,
    sessionEmail,
    household,
    isPaired: isHouseholdPaired(household),
    backupRecord,
    refresh,
    sendOtp,
    verifyOtp,
    signOut,
    createInvite,
    joinHousehold,
    leaveHousehold,
    backupToCloud,
    restoreFromCloud,
  };
};
