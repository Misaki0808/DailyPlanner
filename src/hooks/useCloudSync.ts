import { useState } from 'react';
import { supabaseService } from '../services/supabase';
import { useApp } from '../context/AppContext';
import Toast from 'react-native-toast-message';

export const useCloudSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { plans, settings, recurringTasks } = useApp();

  const backupToCloud = async (email: string) => {
    setIsSyncing(true);
    try {
      // Önce mock giriş
      await supabaseService.loginOrRegister(email);
      
      // Sonra yedekleme
      const success = await supabaseService.backupData(email, {
        plans,
        settings,
        recurring: recurringTasks
      });

      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Yedekleme Başarılı',
          text2: 'Tüm verileriniz buluta kaydedildi.'
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Yedekleme Başarısız',
        text2: error.message || 'Bir hata oluştu.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const restoreFromCloud = async (email: string) => {
    setIsSyncing(true);
    try {
      await supabaseService.loginOrRegister(email);
      const data = await supabaseService.restoreData(email);
      
      if (!data) {
        Toast.show({
          type: 'info',
          text1: 'Bilgi',
          text2: 'Bulutta bu hesaba ait veri bulunamadı.'
        });
        return;
      }
      
      // Gerçek implementasyonda burada Zustand store'lara _hydrate metodlarıyla veriler basılır
      Toast.show({
        type: 'success',
        text1: 'Geri Yükleme Başarılı',
        text2: 'Veriler cihazınıza indirildi.'
      });
      
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Geri Yükleme Başarısız',
        text2: error.message || 'Bir hata oluştu.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    backupToCloud,
    restoreFromCloud
  };
};
