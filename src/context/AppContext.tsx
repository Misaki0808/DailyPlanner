import React, { useEffect, ReactNode } from 'react';
import { useUserStore } from '../store/userStore';
import { useSettingsStore } from '../store/settingsStore';
import { usePlansStore } from '../store/plansStore';
import { usePomodoroStore } from '../store/pomodoroStore';
import { useRecurringStore } from '../store/recurringStore';
import { useAppStore } from '../store/appStore';

// ─── ESKİ GENEL CONTEXT (Geriye Uyumluluk İçin Zustand Proxy) ────────

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const initializeApp = useAppStore(s => s.initializeApp);
  
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return <>{children}</>;
};

// ─── HOOKS (Proxy to Zustand) ──────────────────────────────────────────

export const useUserContext = () => useUserStore();
export const useSettingsContext = () => useSettingsStore();
export const usePlansContext = () => usePlansStore();
export const usePomodoroContext = () => usePomodoroStore();
export const useRecurringContext = () => useRecurringStore();

/**
 * Yalnız TEMAYA abone olur.
 *
 * Burada eskiden bir `useApp()` vardı: altı store'u da selector'sız çağırıp
 * sonucu spread ediyordu. Bu yüzden herhangi bir store'daki herhangi bir
 * değişiklik — tek bir görevin işaretlenmesi bile — onu kullanan her bileşeni
 * yeniden render ediyordu. Tüm çağrı yerleri alan bazlı hook'lara geçirildi ve
 * `useApp()` kaldırıldı; yeni kodda ihtiyaç duyulan alanın hook'u kullanılmalı.
 *
 * Tema nesnesi referans olarak sabittir (getTheme iki modül sabitinden birini
 * döndürür), bu yüzden render yalnız tema gerçekten değiştiğinde tetiklenir.
 */
export const useTheme = () => useSettingsStore(s => s.theme);

/** Yalnız açılış yükleme durumuna abone olur. */
export const useIsAppLoading = () => useAppStore(s => s.isLoading);
