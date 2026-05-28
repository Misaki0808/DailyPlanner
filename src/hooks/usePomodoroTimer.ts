import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, AppStateStatus, Vibration, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useApp } from '../context/AppContext';
import { getToday } from '../utils/dateUtils';
import { Task } from '../types';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export const MODES: Record<TimerMode, { label: string; emoji: string; duration: number }> = {
  focus: { label: 'Odak', emoji: '🎯', duration: 25 * 60 },
  shortBreak: { label: 'Kısa Mola', emoji: '☕', duration: 5 * 60 },
  longBreak: { label: 'Uzun Mola', emoji: '🌿', duration: 15 * 60 },
};

export const AMBIENT_SOUNDS = [
  { id: 'none', name: 'Sessiz 🔇', url: '' },
  { id: 'rain', name: 'Yağmur 🌧️', url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3' },
  { id: 'sea', name: 'Deniz 🌊', url: 'https://cdn.pixabay.com/audio/2021/08/09/audio_dc39bde701.mp3' },
  { id: 'fire', name: 'Şömine 🔥', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_f5f6bdde41.mp3' },
  { id: 'forest', name: 'Orman 🌲', url: 'https://cdn.pixabay.com/audio/2021/09/06/audio_3f766e4a2a.mp3' },
  { id: 'lofi', name: 'Lo-Fi 📖', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf7f6.mp3' },
];

const DING_SOUND_URL = 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3';

export function usePomodoroTimer() {
  const { settings, pomodoroStats, addPomodoroSession, plans, updateTask } = useApp();

  const dynamicModes = {
    focus: { ...MODES.focus, duration: (settings?.pomodoroFocusTime || 25) * 60 },
    shortBreak: { ...MODES.shortBreak, duration: (settings?.pomodoroShortBreak || 5) * 60 },
    longBreak: { ...MODES.longBreak, duration: (settings?.pomodoroLongBreak || 15) * 60 },
  };

  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(dynamicModes.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Settings for Modal
  const [tempFocus, setTempFocus] = useState(settings?.pomodoroFocusTime || 25);
  const [tempShortBreak, setTempShortBreak] = useState(settings?.pomodoroShortBreak || 5);
  const [tempLongBreak, setTempLongBreak] = useState(settings?.pomodoroLongBreak || 15);

  // Audio State
  const [selectedAmbient, setSelectedAmbient] = useState<string>('none');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.5);
  const [tempSoundEnabled, setTempSoundEnabled] = useState(settings?.pomodoroSoundEnabled ?? false);
  const ambientSoundRef = useRef<Audio.Sound | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  const today = getToday();
  const completedSessionsCount = pomodoroStats[today] || 0;

  // Streak logic
  const streak = (() => {
    let s = 0;
    const d = new Date();
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (pomodoroStats[dateStr] > 0) {
        s++;
        d.setDate(d.getDate() - 1);
      } else {
        if (s === 0 && dateStr === today) {
           d.setDate(d.getDate() - 1);
           continue;
        }
        break;
      }
    }
    return s;
  })();

  const todayTasks = plans[today] || [];
  const selectedTask = todayTasks.find((t: Task) => t.id === selectedTaskId);
  
  const totalDuration = dynamicModes[mode].duration;
  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => {
      if (ambientSoundRef.current) ambientSoundRef.current.unloadAsync();
    };
  }, []);

  useEffect(() => {
    const loadAmbient = async () => {
      if (ambientSoundRef.current) {
        await ambientSoundRef.current.unloadAsync();
        ambientSoundRef.current = null;
      }
      if (selectedAmbient === 'none') return;
      const soundObj = AMBIENT_SOUNDS.find(s => s.id === selectedAmbient);
      if (!soundObj) return;

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: soundObj.url },
          { isLooping: true, volume: ambientVolume }
        );
        ambientSoundRef.current = sound;
        if (isRunning) {
          await sound.playAsync();
        }
      } catch (e) {
        console.log("Ambient load error", e);
      }
    };
    loadAmbient();
  }, [selectedAmbient]);

  useEffect(() => {
    if (ambientSoundRef.current) {
      ambientSoundRef.current.setVolumeAsync(ambientVolume);
    }
  }, [ambientVolume]);

  useEffect(() => {
    if (!ambientSoundRef.current) return;
    if (isRunning) {
      ambientSoundRef.current.playAsync().catch(() => {});
    } else {
      ambientSoundRef.current.pauseAsync().catch(() => {});
    }
  }, [isRunning]);

  const playDingSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: DING_SOUND_URL });
      await sound.playAsync();
      setTimeout(() => sound.unloadAsync(), 5000);
    } catch (e) {
      console.log('Error playing ding:', e);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isRunning && backgroundTimeRef.current !== null) {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - backgroundTimeRef.current) / 1000);
          setTimeLeft((prev) => Math.max(0, prev - elapsedSeconds));
        }
        backgroundTimeRef.current = null;
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (isRunning) {
          backgroundTimeRef.current = Date.now();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(dynamicModes[mode].duration);
    }
  }, [settings?.pomodoroFocusTime, settings?.pomodoroShortBreak, settings?.pomodoroLongBreak, mode]);

  const scheduleTimerNotification = async (seconds: number) => {
    try {
      if (Platform.OS === 'web') return;
      if (notificationIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
      }
      const title = mode === 'focus' ? '🎯 Odak Bitti!' : '⏰ Mola Bitti!';
      const body = mode === 'focus' 
        ? 'Harika bir oturum çıkardın. Dinlenme vakti!' 
        : 'Tekrar odaklanmaya hazır mısın?';

      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true, priority: Notifications.AndroidNotificationPriority.HIGH },
        trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
      });
      notificationIdRef.current = id;
    } catch (e) {
      console.log('Bildirim kurulamadi', e);
    }
  };

  const cancelTimerNotification = async () => {
    try {
      if (notificationIdRef.current && Platform.OS !== 'web') {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        notificationIdRef.current = null;
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    cancelTimerNotification();
    setMode(newMode);
    setTimeLeft(dynamicModes[newMode].duration);
  }, [dynamicModes]);

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400]);
    if (settings?.pomodoroSoundEnabled) playDingSound();

    if (mode === 'focus') {
      addPomodoroSession(today);
      if (selectedTask) {
        updateTask(today, selectedTask.id, { pomodoroCount: (selectedTask.pomodoroCount || 0) + 1 });
      }
      const newCount = completedSessionsCount + 1;
      const nextMode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak';
      Alert.alert(
        '🎉 Tebrikler!',
        `Odak süren bitti! ${newCount}. oturum tamamlandı.\n${
          nextMode === 'longBreak' ? 'Uzun bir mola hak ettin!' : 'Kısa bir mola ver.'
        }`,
        [{ text: 'Molaya Geç', onPress: () => switchMode(nextMode) }, { text: 'Kapat', style: 'cancel' }],
      );
    } else {
      Alert.alert('⏰ Mola Bitti!', 'Tekrar odaklanmaya hazır mısın?', [
        { text: 'Odaklan', onPress: () => switchMode('focus') },
        { text: 'Kapat', style: 'cancel' },
      ]);
    }
  }, [mode, completedSessionsCount, selectedTask, today, addPomodoroSession, updateTask, switchMode, settings?.pomodoroSoundEnabled]);

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleTimerEnd();
    }
  }, [timeLeft, isRunning, handleTimerEnd]);

  const toggleTimer = () => {
    setIsRunning((prev) => {
      const nextRunning = !prev;
      if (nextRunning) scheduleTimerNotification(timeLeft);
      else cancelTimerNotification();
      return nextRunning;
    });
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    cancelTimerNotification();
    setTimeLeft(dynamicModes[mode].duration);
  };

  const handleReset = () => {
    if (timeLeft < dynamicModes[mode].duration || isRunning) {
      Alert.alert(
        '🔄 Eşitliği Sıfırla',
        'Zamanlayıcıyı sıfırlamak istediğine emin misin?',
        [{ text: 'Evet, Sıfırla', onPress: resetTimer, style: 'destructive' }, { text: 'İptal', style: 'cancel' }]
      );
    } else {
      resetTimer();
    }
  };

  const handleSkip = () => {
    const nextMode: TimerMode = mode === 'focus' ? 'shortBreak' : mode === 'shortBreak' ? 'longBreak' : 'focus';
    if (mode === 'focus' && timeLeft < dynamicModes[mode].duration) {
      Alert.alert(
        '⏭️ Oturumu Bitir',
        'Bu odak oturumunu tamamlanmış olarak saymak ister misin?',
        [
          {
            text: 'Evet, Sayılsın ✅',
            onPress: () => {
              addPomodoroSession(today);
              if (selectedTask) updateTask(today, selectedTask.id, { pomodoroCount: (selectedTask.pomodoroCount || 0) + 1 });
              const newCount = completedSessionsCount + 1;
              const breakMode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak';
              switchMode(breakMode);
            },
          },
          { text: 'Hayır, Geç', onPress: () => switchMode(nextMode) },
          { text: 'İptal', style: 'cancel' },
        ]
      );
    } else {
      switchMode(nextMode);
    }
  };

  const addManualSession = () => addPomodoroSession(today);

  return {
    mode, setMode, timeLeft, isRunning, toggleTimer, handleReset, handleSkip, switchMode,
    dynamicModes, progress, totalDuration: dynamicModes[mode].duration, completedSessionsCount, streak, today,
    selectedTaskId, setSelectedTaskId, selectedTask, todayTasks,
    tempFocus, setTempFocus, tempShortBreak, setTempShortBreak, tempLongBreak, setTempLongBreak,
    selectedAmbient, setSelectedAmbient, ambientVolume, setAmbientVolume,
    tempSoundEnabled, setTempSoundEnabled, addManualSession
  };
}
