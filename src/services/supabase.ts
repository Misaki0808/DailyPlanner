/**
 * Supabase Backend Integration (Draft)
 * 
 * Bu dosya, ileride gerçek bir Supabase projesi kurulduğunda kullanılmak üzere tasarlanmıştır.
 * Şu anda mock (sahte) veri döner.
 * 
 * Kurulum için: 
 * 1. npm install @supabase/supabase-js
 * 2. .env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY ekle.
 */

// import { createClient } from '@supabase/supabase-js';
import { Plans, Settings, RecurringTask } from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseService = {
  /**
   * Kullanıcı oturumu açar veya oluşturur (Mock)
   */
  async loginOrRegister(email: string): Promise<boolean> {
    console.log(`[Supabase Mock] ${email} için giriş/kayıt işlemi başlatıldı.`);
    // Gerçekte: return await supabase.auth.signInWithOtp({ email })
    return new Promise((resolve) => setTimeout(() => resolve(true), 1500));
  },

  /**
   * Yerel verileri buluta yedekler (Mock)
   */
  async backupData(userId: string, data: { plans: Plans; settings: Settings; recurring: RecurringTask[] }): Promise<boolean> {
    console.log(`[Supabase Mock] ${userId} kullanıcısının verileri buluta yedekleniyor...`, data);
    // Gerçekte: supabase.from('user_backups').upsert({ user_id: userId, data })
    return new Promise((resolve) => setTimeout(() => resolve(true), 2000));
  },

  /**
   * Buluttaki verileri cihaza indirir (Mock)
   */
  async restoreData(userId: string): Promise<any | null> {
    console.log(`[Supabase Mock] ${userId} kullanıcısının verileri buluttan çekiliyor...`);
    // Gerçekte: supabase.from('user_backups').select('data').eq('user_id', userId).single()
    return new Promise((resolve) => setTimeout(() => resolve(null), 2000)); // null for mock empty
  }
};
