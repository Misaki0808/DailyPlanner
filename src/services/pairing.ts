import { getCurrentUser, HouseholdMember, HouseholdWithMembers, isSupabaseConfigured, supabase } from './supabase';

const INVITE_CODE_LENGTH = 6;
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateInviteCode = () => {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
};

const normalizeInviteCode = (code: string) => code.trim().toLocaleUpperCase('tr-TR');

const fetchHouseholdById = async (householdId: string): Promise<HouseholdWithMembers | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  const client = supabase;

  const { data: household, error: householdError } = await client
    .from('households')
    .select('id, invite_code, created_by, created_at')
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
  if (error) throw error;

  const householdId = data?.[0]?.household_id;
  if (!householdId) return null;

  return fetchHouseholdById(householdId);
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
