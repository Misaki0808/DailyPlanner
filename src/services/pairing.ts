import { getCurrentUser, HouseholdMember, HouseholdWithMembers, isSupabaseConfigured, supabase } from './supabase';
import { normalizeInviteCode } from '../utils/normalize';

const INVITE_CODE_LENGTH = 6;
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateInviteCode = () => {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
};

/**
 * Davet kodunun ömrü (R-010). SQL karşılığı public.invite_code_ttl();
 * değer değişecekse ikisi birlikte güncellenmeli.
 */
export const INVITE_CODE_TTL_HOURS = 24;

/**
 * Bir hanedeki azami üye sayısı (R-010). SQL karşılığı
 * public.household_member_limit(). Asıl zorlama sunucuda (join_household RPC)
 * yapılır; buradaki sabit arayüz metinleri ve buton durumları içindir.
 */
export const HOUSEHOLD_MEMBER_LIMIT = 2;

type DatabaseError = { code?: string; message?: string };

/**
 * 0002 migration'ı öncesi şemada invite_code_expires_at kolonu yoktur; alan boş
 * gelirse kod süresiz sayılır ve eski davranış korunur.
 */
export const isInviteCodeExpired = (expiresAt?: string | null, now: Date = new Date()): boolean => {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return false;
  return expiry <= now.getTime();
};

/**
 * 0002 uygulanmadan önce yeni RPC ve kolon yoktur. PostgREST bunu şema
 * önbelleğinden (PGRST202/PGRST204), PostgreSQL ise 42883/42703 ile bildirir.
 */
export const isMissingDbObjectError = (error: unknown): boolean => {
  const code = (error as DatabaseError | null)?.code ?? '';
  return code === 'PGRST202' || code === 'PGRST204' || code === '42883' || code === '42703';
};

const JOIN_ERROR_MESSAGES: Record<string, string> = {
  invite_code_expired: `Davet kodunun süresi dolmuş. Kodu oluşturan kişi "Yeni Kod Oluştur" ile ${INVITE_CODE_TTL_HOURS} saatlik yeni bir kod üretmeli.`,
  household_full: `Bu ev grubu dolu (en fazla ${HOUSEHOLD_MEMBER_LIMIT} kişi). Önce mevcut üyelerden biri eşleştirmeden ayrılmalı.`,
  invalid_invite_code: 'Davet kodu geçersiz. Kodu kontrol edip tekrar deneyin.',
  not_authenticated: 'Oturumunuz sonlanmış. Tekrar giriş yapın.',
};

/** join_household RPC'sinin ham hatasını kullanıcıya gösterilebilir metne çevirir. */
export const describeJoinError = (error: unknown): string => {
  const message = (error as DatabaseError | null)?.message ?? '';
  const key = Object.keys(JOIN_ERROR_MESSAGES).find(candidate => message.includes(candidate));
  return key ? JOIN_ERROR_MESSAGES[key] : 'Eşleştirme başarısız. Davet kodunu kontrol edin.';
};

const fetchHouseholdById = async (householdId: string): Promise<HouseholdWithMembers | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  const client = supabase;

  const { data: household, error: householdError } = await client
    .from('households')
    // '*' bilinçli: invite_code_expires_at kolonu yalnız 0002 sonrası var, adıyla
    // seçmek migration uygulanmamış projelerde isteği hataya düşürürdü.
    .select('*')
    .eq('id', householdId)
    .maybeSingle();

  if (householdError) throw householdError;
  if (!household) return null;

  const { data: members, error: membersError } = await client
    .from('household_members')
    .select('household_id, user_id, joined_at')
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true });

  if (membersError) throw membersError;

  const membersWithProfiles = await Promise.all((members ?? []).map(async (member) => {
    const { data: profile } = await client
      .from('profiles')
      .select('id, email, display_name, updated_at')
      .eq('id', member.user_id)
      .maybeSingle();

    return { ...member, profile: profile ?? null } as HouseholdMember;
  }));

  return { ...household, members: membersWithProfiles };
};

export async function getMyHousehold(): Promise<HouseholdWithMembers | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const client = supabase;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data: membership, error } = await client
    .from('household_members')
    .select('household_id, user_id, joined_at')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!membership) return null;

  return fetchHouseholdById(membership.household_id);
}

export async function createHousehold(): Promise<HouseholdWithMembers | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const client = supabase;

  const existing = await getMyHousehold();
  if (existing) return existing;

  const user = await getCurrentUser();
  if (!user) return null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data: household, error: householdError } = await client
      .from('households')
      .insert({ invite_code: inviteCode, created_by: user.id })
      .select('id, invite_code, created_by, created_at')
      .single();

    if (householdError) {
      if (householdError.code === '23505') continue;
      throw householdError;
    }

    const { error: memberError } = await client
      .from('household_members')
      .insert({ household_id: household.id, user_id: user.id });

    if (memberError) throw memberError;
    return fetchHouseholdById(household.id);
  }

  throw new Error('Davet kodu oluşturulamadı. Lütfen tekrar deneyin.');
}

export async function joinHousehold(code: string): Promise<HouseholdWithMembers | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const client = supabase;

  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) throw new Error('Davet kodu boş olamaz.');

  const { data, error } = await client.rpc('join_household', { p_invite_code: normalizedCode });
  // Süresi dolmuş kod ve dolu hane reddi RPC'den ham anahtar olarak gelir.
  if (error) throw new Error(describeJoinError(error));

  const householdId = data?.[0]?.household_id;
  if (!householdId) return null;

  return fetchHouseholdById(householdId);
}

/**
 * Davet kodunu yeniler ve geçerlilik süresini sıfırdan başlatır (R-010).
 * Yalnız haneyi kuran kişi yenileyebilir; R-011 ile households UPDATE yetkisi de
 * kurucuya daraltıldı. 0002 uygulanmamışsa RPC yoktur, eski şemadaki doğrudan
 * UPDATE yoluna düşülür ve kod (eski davranıştaki gibi) süresiz kalır.
 */
export async function refreshInviteCode(): Promise<HouseholdWithMembers | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const client = supabase;

  const user = await getCurrentUser();
  if (!user) return null;

  const household = await getMyHousehold();
  if (!household) return null;
  if (household.created_by !== user.id) {
    throw new Error('Davet kodunu yalnız ev grubunu kuran kişi yenileyebilir.');
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data, error } = await client.rpc('rotate_invite_code', { p_invite_code: inviteCode });

    if (!error) {
      // İkinci savunma: sunucu beklenenden başka bir haneyi yenilediyse (ya da
      // hiç satır dönmediyse) başarı gösterme. Aksi halde ekranda eski kod
      // kalırken kullanıcıya "yeni kod hazır" denirdi.
      const rotatedHouseholdId = data?.[0]?.id;
      if (rotatedHouseholdId !== household.id) {
        throw new Error('Davet kodu yenilenemedi: sunucu beklenen ev grubunu döndürmedi. Ayarları yenileyip tekrar deneyin.');
      }
      return fetchHouseholdById(household.id);
    }
    if (error.code === '23505') continue;
    if (!isMissingDbObjectError(error)) throw error;

    // R2-002: yalnız kodu yazmak, geçmiş bir son kullanma tarihini yeni koda
    // devrettiriyordu — migration uygulandıktan hemen sonra PostgREST şema
    // önbelleği bayatsa bu yola düşülür ve kod doğar doğmaz süresi dolmuş
    // olurdu. Kolon varsa süre de tazelenir. Zaman burada cihazdan gelir;
    // sunucu saatini kullanan asıl yol rotate_invite_code RPC'sidir.
    const expiresAt = new Date(Date.now() + INVITE_CODE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const withExpiry = await client
      .from('households')
      .update({ invite_code: inviteCode, invite_code_expires_at: expiresAt })
      .eq('id', household.id);

    let updateError = withExpiry.error;
    if (updateError && isMissingDbObjectError(updateError)) {
      // Kolon henüz yok (0002 uygulanmamış): eski şemada kodlar zaten süresiz.
      const legacyUpdate = await client
        .from('households')
        .update({ invite_code: inviteCode })
        .eq('id', household.id);
      updateError = legacyUpdate.error;
    }

    if (!updateError) return fetchHouseholdById(household.id);
    if (updateError.code !== '23505') throw updateError;
  }

  throw new Error('Davet kodu oluşturulamadı. Lütfen tekrar deneyin.');
}

export async function leaveHousehold(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const client = supabase;

  const user = await getCurrentUser();
  if (!user) return false;

  const { error } = await client
    .from('household_members')
    .delete()
    .eq('user_id', user.id);

  if (error) throw error;
  return true;
}
