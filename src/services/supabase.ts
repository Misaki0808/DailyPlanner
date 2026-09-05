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
  return true;
}

export async function getSession(): Promise<Session | null> {
  const client = getConfiguredClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  await ensureProfile(data.session?.user ?? null);
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

export const supabaseService = {
  async loginOrRegister(email: string): Promise<boolean> {
    return signInWithEmailOtp(email);
  },

  async backupData(householdId: string, data: CloudBackupData): Promise<boolean> {
    const client = getConfiguredClient();
    if (!client) return false;

    const session = await getSession();
    const userId = session?.user.id;
    if (!userId) return false;

    const { error } = await client
      .from('plan_backups')
      .upsert({
        household_id: householdId,
        data,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }, { onConflict: 'household_id' });

    if (error) throw error;
    return true;
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
};
