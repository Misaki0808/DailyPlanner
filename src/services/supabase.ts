import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { Plans, RecurringTask, Settings, Gender } from '../types';
import { normalizeEmail } from '../utils/normalize';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export type CloudBackupData = {
  version: 1;
  plans: Plans;
  settings: Settings;
  recurringTasks: RecurringTask[];
  user?: {
    username: string | null;
    gender: Gender;
    aboutMe: string;
  };
  pomodoroStats?: Record<string, number>;
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  updated_at: string | null;
};

export type Household = {
  id: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  /**
   * Davet kodunun son kullanma zamanı (R-010). Kolon 0002 migration'ı ile
   * geliyor; migration uygulanmadan önce şemada yok ve alan undefined kalır.
   * Bu durumda kod süresiz sayılır (bkz. isInviteCodeExpired).
   */
  invite_code_expires_at?: string | null;
};

export type HouseholdMember = {
  household_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile | null;
};

export type HouseholdWithMembers = Household & {
  members: HouseholdMember[];
};

/**
 * Yazma sonucu. 'conflict', okuduğumuz sürümün artık geçerli olmadığını
 * söyler: araya eşin cihazı yazmıştır ve birleştirme yeniden yapılmalıdır.
 */
export type BackupWriteResult = 'written' | 'conflict' | 'failed';

/**
 * Silme sonucu. 'not-found' ile 'deleted' ayrımı bilinçli: satırı GÖREMEMEK
 * (RLS) silmiş olmakla aynı şey değil (R2-005).
 */
export type BackupDeleteResult = 'deleted' | 'not-found' | 'policy-missing';

export type CloudBackupRecord = {
  household_id: string;
  data: CloudBackupData;
  updated_at: string;
  updated_by: string;
  updatedByProfile?: Profile | null;
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

const getConfiguredClient = () => supabase;


export async function signInWithEmailOtp(email: string): Promise<boolean> {
  const client = getConfiguredClient();
  if (!client) return false;

  const { error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true },
  });

  if (error) throw error;
  return true;
}

export async function verifyOtp(email: string, token: string): Promise<Session | null> {
  const client = getConfiguredClient();
  if (!client) return null;

  const { data, error } = await client.auth.verifyOtp({
    email: normalizeEmail(email),
    token: token.trim(),
    type: 'email',
  });

  if (error) throw error;
  await ensureProfile(data.user ?? null);
  return data.session;
}

export async function signOut(): Promise<boolean> {
  const client = getConfiguredClient();
  if (!client) return false;

  const { error } = await client.auth.signOut();
  if (error) throw error;
  lastEnsuredProfileUserId = null;
  return true;
}

/**
 * En son profili yazılan kullanıcı. getSession; refresh, yedekleme, geri
 * yükleme ve getCurrentUser üzerinden sık çağrılıyor ve her çağrı bir
 * `profiles` upsert isteği üretiyordu. Profil yalnız oturum kimliği
 * değiştiğinde yazılır.
 */
let lastEnsuredProfileUserId: string | null = null;

export async function getSession(): Promise<Session | null> {
  const client = getConfiguredClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) throw error;

  const user = data.session?.user ?? null;
  if (!user) {
    lastEnsuredProfileUserId = null;
  } else if (user.id !== lastEnsuredProfileUserId) {
    await ensureProfile(user);
    lastEnsuredProfileUserId = user.id;
  }

  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export async function ensureProfile(user?: User | null): Promise<Profile | null> {
  const client = getConfiguredClient();
  if (!client || !user) return null;

  const email = user.email ?? null;
  const { data, error } = await client
    .from('profiles')
    .upsert({ id: user.id, email, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('id, email, display_name, updated_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * 0003 uygulanmadan önce silme işareti tablosu yoktur; PostgREST bunu şema
 * önbelleğinden (PGRST205), PostgreSQL ise 42P01 ile bildirir.
 */
const isMissingRelationError = (error: { code?: string } | null): boolean => {
  const code = error?.code ?? '';
  return code === 'PGRST205' || code === 'PGRST202' || code === '42P01';
};

export const supabaseService = {
  async loginOrRegister(email: string): Promise<boolean> {
    return signInWithEmailOtp(email);
  },

  /**
   * Ortak yedeği yazar. `expectedUpdatedAt`, birleştirmenin dayandığı bulut
   * sürümüdür: yazma yalnız satır hâlâ o sürümdeyse geçer. Araya eşin cihazı
   * yazdıysa 0 satır etkilenir ve 'conflict' döner; çağıran yeniden okuyup
   * birleştirir. Eskiden koşulsuz upsert yapılıyordu ve arada yazılan
   * değişiklikler sessizce kayboluyordu (kayıp güncelleme).
   *
   * Yeni kolon/RPC gerektirmez; 0002/0003 uygulanmamış şemada da çalışır.
   */
  async backupData(
    householdId: string,
    data: CloudBackupData,
    expectedUpdatedAt: string | null = null,
  ): Promise<BackupWriteResult> {
    const client = getConfiguredClient();
    if (!client) return 'failed';

    const session = await getSession();
    const userId = session?.user.id;
    if (!userId) return 'failed';

    const payload = {
      household_id: householdId,
      data,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (!expectedUpdatedAt) {
      // Bulutta satır olmadığını gördük: ekle. Aynı anda eşin cihazı eklediyse
      // birincil anahtar çakışması döner ve bu da bir çakışmadır.
      const { error } = await client.from('plan_backups').insert(payload);
      if (!error) return 'written';
      if (error.code === '23505') return 'conflict';
      throw error;
    }

    const { data: updatedRows, error } = await client
      .from('plan_backups')
      .update(payload)
      .eq('household_id', householdId)
      .eq('updated_at', expectedUpdatedAt)
      .select('household_id');

    if (error) throw error;
    return updatedRows && updatedRows.length > 0 ? 'written' : 'conflict';
  },

  async restoreData(householdId: string): Promise<CloudBackupRecord | null> {
    const client = getConfiguredClient();
    if (!client) return null;

    const { data, error } = await client
      .from('plan_backups')
      .select('household_id, data, updated_at, updated_by')
      .eq('household_id', householdId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const { data: profile } = await client
      .from('profiles')
      .select('id, email, display_name, updated_at')
      .eq('id', data.updated_by)
      .maybeSingle();

    return { ...data, updatedByProfile: profile ?? null };
  },

  /**
   * Hanenin ORTAK bulut yedeğini siler (R-009).
   *
   * Silinen satırlar `.select()` ile geri istenir: gerçekten silindiğinin tek
   * doğrudan kanıtı budur. Satır dönmezse iki ayrı durum vardır ve bunlar
   * karıştırılmaz (R2-005): satır hâlâ okunabiliyorsa DELETE politikası yok
   * demektir ('policy-missing', 0002 uygulanmamış); okunamıyorsa silinecek bir
   * şey görünmüyordur ('not-found') — bu "sildim" DEĞİLDİR.
   */
  async deleteBackup(householdId: string): Promise<BackupDeleteResult> {
    const client = getConfiguredClient();
    if (!client) return 'not-found';

    const { data: deletedRows, error } = await client
      .from('plan_backups')
      .delete()
      .eq('household_id', householdId)
      .select('household_id');

    if (error) throw error;
    if (deletedRows && deletedRows.length > 0) return 'deleted';

    const { data: remaining, error: verifyError } = await client
      .from('plan_backups')
      .select('household_id')
      .eq('household_id', householdId)
      .maybeSingle();

    if (verifyError) throw verifyError;
    return remaining ? 'policy-missing' : 'not-found';
  },

  /**
   * SİLME İŞARETİ (tombstone) — R2-006
   *
   * Yedek silindikten sonra otomatik yedeklemenin satırı diriltmemesi için
   * hane başına bir işaret tutulur. Tablo 0003 ile geliyor; migration
   * uygulanmamışsa okuma/yazma sessizce atlanır ve yalnız silen cihazdaki
   * yerel işaret çalışır (bkz. utils/storage).
   */
  async getBackupDeletion(householdId: string): Promise<string | null> {
    const client = getConfiguredClient();
    if (!client) return null;

    const { data, error } = await client
      .from('plan_backup_deletions')
      .select('deleted_at')
      .eq('household_id', householdId)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) return null;
      throw error;
    }

    return data?.deleted_at ?? null;
  },

  async markBackupDeleted(householdId: string): Promise<boolean> {
    const client = getConfiguredClient();
    if (!client) return false;

    const session = await getSession();
    const userId = session?.user.id;
    if (!userId) return false;

    const { error } = await client
      .from('plan_backup_deletions')
      .upsert({
        household_id: householdId,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      }, { onConflict: 'household_id' });

    if (error) {
      if (isMissingRelationError(error)) return false;
      throw error;
    }

    return true;
  },

  async clearBackupDeletion(householdId: string): Promise<boolean> {
    const client = getConfiguredClient();
    if (!client) return false;

    const { error } = await client
      .from('plan_backup_deletions')
      .delete()
      .eq('household_id', householdId);

    if (error) {
      if (isMissingRelationError(error)) return false;
      throw error;
    }

    return true;
  },
};
