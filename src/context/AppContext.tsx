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

export const useApp = () => {
  const user = useUserStore();
  const settings = useSettingsStore();
  const plans = usePlansStore();
  const pomodoro = usePomodoroStore();
  const recurring = useRecurringStore();
  const app = useAppStore();

  return {
    ...user,
    ...settings,
    ...plans,
    ...pomodoro,
    ...recurring,
    isLoading: app.isLoading,
  };
};
