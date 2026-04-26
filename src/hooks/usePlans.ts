import { useState } from 'react';
import { Platform } from 'react-native';
import { Plans, Task } from '../types';
import * as storage from '../utils/storage';

// Widget güncelleme fonksiyonunu güvenli şekilde çağır
const triggerWidgetUpdate = () => {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    requestWidgetUpdate({
      widgetName: 'DailyPlannerWidget',
    });
  } catch (e) {
    // Expo Go'da veya widget kurulu değilse sessizce geç
  }
};

export const usePlans = () => {
  const [plans, setPlans] = useState<Plans>({});

  const refreshPlans = async () => {
    try {
      const savedPlans = await storage.getAllPlans();
      setPlans(savedPlans);
    } catch (error) {
      console.error('Planlar yenilenirken hata:', error);
    }
  };

  const savePlan = async (date: string, tasks: Task[]) => {
    try {
      await storage.savePlan(date, tasks);
      setPlans(prev => ({ ...prev, [date]: tasks }));
      triggerWidgetUpdate();
    } catch (error) {
      console.error('Plan kaydetme hatası:', error);
      throw error;
    }
  };

  const deletePlan = async (date: string) => {
    try {
      await storage.deletePlan(date);
      setPlans(prev => {
        const newPlans = { ...prev };
        delete newPlans[date];
        return newPlans;
      });
      triggerWidgetUpdate();
    } catch (error) {
      console.error('Plan silme hatası:', error);
      throw error;
    }
  };

  const updateTask = async (date: string, taskId: string, updates: Partial<Task>) => {
    try {
      const updatedTasks = await storage.updateTask(date, taskId, updates);
      if (updatedTasks) {
        setPlans(prev => ({ ...prev, [date]: updatedTasks }));
        triggerWidgetUpdate();
      }
    } catch (error) {
      console.error('Görev güncelleme hatası:', error);
      throw error;
    }
  };

  return { plans, setPlans, refreshPlans, savePlan, deletePlan, updateTask };
};
