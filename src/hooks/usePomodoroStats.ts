import { useState } from 'react';
import * as storage from '../utils/storage';
import { getToday } from '../utils/dateUtils';

export const usePomodoroStats = () => {
  const [pomodoroStats, setPomodoroStats] = useState<Record<string, number>>({});

  const loadPomodoroStats = async () => {
    const stats = await storage.getPomodoroStats();
    setPomodoroStats(stats);
    return stats;
  };

  const addPomodoroSession = async (date: string = getToday()) => {
    setPomodoroStats((prev) => {
      const newStats = {
        ...prev,
        [date]: (prev[date] || 0) + 1,
      };
      storage.savePomodoroStats(newStats);
      return newStats;
    });
  };

  return {
    pomodoroStats,
    setPomodoroStats,
    loadPomodoroStats,
    addPomodoroSession,
  };
};
