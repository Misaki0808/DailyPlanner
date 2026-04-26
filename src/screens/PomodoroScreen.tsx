import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  Alert,
  Animated,
  Easing,
  LayoutChangeEvent,
  AppState,
  AppStateStatus,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { useApp } from '../context/AppContext';
import { getToday } from '../utils/dateUtils';
import { Task } from '../types';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const DEFAULT_MODES: Record<TimerMode, { label: string; emoji: string; duration: number }> = {
  focus: { label: 'Odak', emoji: '🎯', duration: 25 * 60 },
  shortBreak: { label: 'Kısa Mola', emoji: '☕', duration: 5 * 60 },
  longBreak: { label: 'Uzun Mola', emoji: '🌿', duration: 15 * 60 },
};

const AMBIENT_SOUNDS = [
  { id: 'none', name: 'Sessiz 🔇', url: '' },
  { id: 'rain', name: 'Yağmur 🌧️', url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3' },
  { id: 'sea', name: 'Deniz 🌊', url: 'https://cdn.pixabay.com/audio/2021/08/09/audio_dc39bde701.mp3' },
  { id: 'fire', name: 'Şömine 🔥', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_f5f6bdde41.mp3' },
  { id: 'forest', name: 'Orman 🌲', url: 'https://cdn.pixabay.com/audio/2021/09/06/audio_3f766e4a2a.mp3' },
  { id: 'lofi', name: 'Lo-Fi 📖', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf7f6.mp3' },
];
const DING_SOUND_URL = 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3';

// ─── SVG Icon Components ────────────────────────────────────────
const PlayIcon = ({ size = 28, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M8 5.14v13.72c0 .8.87 1.3 1.54.88l10.52-6.86a1 1 0 000-1.76L9.54 4.26C8.87 3.84 8 4.34 8 5.14z"
      fill={color}
    />
  </Svg>
);

const PauseIcon = ({ size = 28, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill={color} />
  </Svg>
);

const ResetIcon = ({ size = 22, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
      fill={color}
    />
  </Svg>
);

const SkipIcon = ({ size = 22, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" fill={color} />
  </Svg>
);

// ─── Mode-specific Background Gradients ─────────────────────────
const DARK_BG: Record<TimerMode, readonly [string, string, ...string[]]> = {
  focus: ['#0A0612', '#160B2E', '#0A0612'],
  shortBreak: ['#06120A', '#0B2E16', '#06120A'],
  longBreak: ['#060A12', '#0B162E', '#060A12'],
};

const LIGHT_BG: Record<TimerMode, readonly [string, string, ...string[]]> = {
  focus: ['#F8F5FF', '#F0E8FF', '#F8F5FF'],
  shortBreak: ['#F0FFF5', '#E0FAED', '#F0FFF5'],
  longBreak: ['#F0F5FF', '#E0EAFF', '#F0F5FF'],
};

export default function PomodoroScreen() {
  const { theme, settings, updateSettings, pomodoroStats, addPomodoroSession, plans, updateTask } = useApp();
  const isDark = settings?.darkMode ?? true;

  const MODES = React.useMemo<Record<TimerMode, { label: string; emoji: string; duration: number }>>(() => ({
    focus: { label: 'Odak', emoji: '🎯', duration: (settings?.pomodoroFocusTime || 25) * 60 },
    shortBreak: { label: 'Kısa Mola', emoji: '☕', duration: (settings?.pomodoroShortBreak || 5) * 60 },
    longBreak: { label: 'Uzun Mola', emoji: '🌿', duration: (settings?.pomodoroLongBreak || 15) * 60 },
  }), [settings?.pomodoroFocusTime, settings?.pomodoroShortBreak, settings?.pomodoroLongBreak]);

  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0); // Optional local fallback, mostly we rely on pomodoroStats
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIdRef = useRef<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isSoundModalVisible, setIsSoundModalVisible] = useState(false);

  // Settings local state for editing
  const [tempFocus, setTempFocus] = useState(settings?.pomodoroFocusTime || 25);
  const [tempShortBreak, setTempShortBreak] = useState(settings?.pomodoroShortBreak || 5);
  const [tempLongBreak, setTempLongBreak] = useState(settings?.pomodoroLongBreak || 15);

  // Audio State
  const [selectedAmbient, setSelectedAmbient] = useState<string>('none');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.5);
  const [tempSoundEnabled, setTempSoundEnabled] = useState(settings?.pomodoroSoundEnabled ?? false);
  const ambientSoundRef = useRef<Audio.Sound | null>(null);

  // Audio Setup
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => {
      if (ambientSoundRef.current) ambientSoundRef.current.unloadAsync();
    };
  }, []);

  // Ambient playback logic
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

  const today = getToday();
  const completedSessionsCount = pomodoroStats[today] || 0;

  const streak = React.useMemo(() => {
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
  }, [pomodoroStats, today]);
  
  const todayTasks = plans[today] || [];
  const uncompletedTasks = todayTasks.filter((t: Task) => !t.done);
  const sortedTasks = [...uncompletedTasks].sort((a, b) => {
    // İş/Proje category top priority
    const aIsPriority = a.category === 'is' || a.category === 'proje' || a.category?.includes('iş');
    const bIsPriority = b.category === 'is' || b.category === 'proje' || b.category?.includes('iş');
    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    return 0;
  });
  const selectedTask = todayTasks.find((t: Task) => t.id === selectedTaskId);

  const totalDuration = MODES[mode].duration;
  const progress = timeLeft / totalDuration;

  // ─── AppState background tracking ────────────────────────────────
  const appState = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        if (isRunning && backgroundTimeRef.current !== null) {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - backgroundTimeRef.current) / 1000);
          setTimeLeft((prev) => Math.max(0, prev - elapsedSeconds));
        }
        backgroundTimeRef.current = null;
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        if (isRunning) {
          backgroundTimeRef.current = Date.now();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // ─── Circle parameters ─────────────────────────────────────────
  const CIRCLE_SIZE = 260;
  const STROKE_WIDTH = 8;
  const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  // ─── Animation refs ────────────────────────────────────────────
  const glowAnim = useRef(new Animated.Value(0)).current;
  const playScaleAnim = useRef(new Animated.Value(1)).current;
  const resetScaleAnim = useRef(new Animated.Value(1)).current;
  const skipScaleAnim = useRef(new Animated.Value(1)).current;
  const sessionDotPulse = useRef(new Animated.Value(1)).current;
  const activeModePulse = useRef(new Animated.Value(1)).current;

  // Mode indicator
  const [buttonLayouts, setButtonLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(80)).current;

  // Background gradient opacities (stacked layers)
  const focusBgOpacity = useRef(new Animated.Value(1)).current;
  const shortBreakBgOpacity = useRef(new Animated.Value(0)).current;
  const longBreakBgOpacity = useRef(new Animated.Value(0)).current;

  const bgGradients = isDark ? DARK_BG : LIGHT_BG;

  // ─── Helpers ───────────────────────────────────────────────────
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeColor = (): string => {
    switch (mode) {
      case 'focus':
        return theme.accent;
      case 'shortBreak':
        return theme.success;
      case 'longBreak':
        return theme.info;
    }
  };

  const getModeGradient = (): readonly [string, string, ...string[]] => {
    switch (mode) {
      case 'focus':
        return theme.accentGradient;
      case 'shortBreak':
        return theme.successGradient;
      case 'longBreak':
        return theme.blueGradient;
    }
  };

  /** Ring color shifts yellow → red in the last 30 s of a focus session */
  const getRingColor = (): string => {
    if (mode === 'focus' && isRunning) {
      if (timeLeft <= 10) return theme.error;
      if (timeLeft <= 30) return theme.warning;
    }
    return getModeColor();
  };

  const activeColor = getModeColor();
  const ringColor = getRingColor();
  const currentSessionInCycle = completedSessionsCount % 4;

  // Update local times when settings modal opens
  useEffect(() => {
    if (isSettingsModalVisible) {
      setTempFocus(settings?.pomodoroFocusTime || 25);
      setTempShortBreak(settings?.pomodoroShortBreak || 5);
      setTempLongBreak(settings?.pomodoroLongBreak || 15);
    }
    if (isSoundModalVisible) {
      setTempSoundEnabled(settings?.pomodoroSoundEnabled ?? false);
    }
  }, [isSettingsModalVisible, isSoundModalVisible]);

  // When global setting changes, reset current timer if not running
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(MODES[mode].duration);
    }
  }, [MODES, mode]);

  const savePomodoroSettings = async () => {
    await updateSettings({
      pomodoroFocusTime: tempFocus,
      pomodoroShortBreak: tempShortBreak,
      pomodoroLongBreak: tempLongBreak,
    });
    setIsSettingsModalVisible(false);
  };
  
  const saveSoundSettings = async () => {
    await updateSettings({
      pomodoroSoundEnabled: tempSoundEnabled,
    });
    setIsSoundModalVisible(false);
  };

  // ─── Local notifications ──────────────────────────────────────────
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
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: seconds,
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        },
      });
      notificationIdRef.current = id;
    } catch (e) {
      console.log('Bildirim kurulamadi (Expo Go kisitlamasi olabilir)', e);
    }
  };

  const cancelTimerNotification = async () => {
    try {
      if (notificationIdRef.current && Platform.OS !== 'web') {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        notificationIdRef.current = null;
      }
    } catch (e) {
      console.log('Bildirim iptal edilemedi', e);
    }
  };

  // ─── Glow pulse (runs while timer is active) ───────────────────
  useEffect(() => {
    if (isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [isRunning]);

  // ─── Session dot heartbeat (current dot pulses during focus) ───
  useEffect(() => {
    if (isRunning && mode === 'focus') {
      const beat = Animated.loop(
        Animated.sequence([
          Animated.timing(sessionDotPulse, { toValue: 1.4, duration: 500, useNativeDriver: true }),
          Animated.timing(sessionDotPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      );
      beat.start();
      return () => beat.stop();
    } else {
      sessionDotPulse.setValue(1);
    }
  }, [isRunning, mode]);

  // ─── Background gradient crossfade on mode change ─────────────
  useEffect(() => {
    const map = { focus: focusBgOpacity, shortBreak: shortBreakBgOpacity, longBreak: longBreakBgOpacity };
    Animated.parallel(
      (Object.keys(map) as TimerMode[]).map((m) =>
        Animated.timing(map[m], {
          toValue: m === mode ? 1 : 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [mode]);

  // ─── Sliding indicator follows active mode button ──────────────
  useEffect(() => {
    const layout = buttonLayouts[mode];
    if (layout && layout.width > 0) {
      Animated.parallel([
        Animated.spring(indicatorLeft, {
          toValue: layout.x,
          useNativeDriver: false,
          friction: 8,
          tension: 80,
        }),
        Animated.spring(indicatorWidth, {
          toValue: layout.width,
          useNativeDriver: false,
          friction: 8,
          tension: 80,
        }),
      ]).start();
    }
  }, [mode, buttonLayouts]);

  // ─── Timer interval ────────────────────────────────────────────
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

  // ─── Timer completion ──────────────────────────────────────────
  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 400, 200, 400]);
    }
    if (settings?.pomodoroSoundEnabled) {
      playDingSound();
    }

    if (mode === 'focus') {
      addPomodoroSession(today); // Verileri kalıcı olarak kaydet
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
        [
          { text: 'Molaya Geç', onPress: () => switchMode(nextMode) },
          { text: 'Kapat', style: 'cancel' },
        ],
      );
    } else {
      Alert.alert('⏰ Mola Bitti!', 'Tekrar odaklanmaya hazır mısın?', [
        { text: 'Odaklan', onPress: () => switchMode('focus') },
        { text: 'Kapat', style: 'cancel' },
      ]);
    }
  }, [mode, completedSessions]);

  // ─── Animations for active elements ──────────────────────────────
  useEffect(() => {
    // Pulse animation for active mode text
    const activePulse = Animated.loop(
      Animated.sequence([
        Animated.timing(activeModePulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(activeModePulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    activePulse.start();
    return () => activePulse.stop();
  }, []);

  // ─── Component Lifecycle ───────────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleTimerEnd();
    }
  }, [timeLeft, isRunning, handleTimerEnd]);

  // ─── Mode / timer actions ──────────────────────────────────────
  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    cancelTimerNotification();
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
  };

  const toggleTimer = () => {
    setIsRunning((prev) => {
      const nextRunning = !prev;
      if (nextRunning) {
        scheduleTimerNotification(timeLeft);
      } else {
        cancelTimerNotification();
      }
      return nextRunning;
    });
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    cancelTimerNotification();
    setTimeLeft(MODES[mode].duration);
  };

  const handleReset = () => {
    if (timeLeft < MODES[mode].duration || isRunning) {
      Alert.alert(
        '🔄 Eşitliği Sıfırla',
        'Zamanlayıcıyı sıfırlamak istediğine emin misin?',
        [
          { text: 'Evet, Sıfırla', onPress: resetTimer, style: 'destructive' },
          { text: 'İptal', style: 'cancel' },
        ]
      );
    } else {
      resetTimer();
    }
  };

  /** Skip tuşu — focus modda oturumu saydır/sayma seçeneği sunar */
  const handleSkip = () => {
    const nextMode: TimerMode =
      mode === 'focus' ? 'shortBreak' : mode === 'shortBreak' ? 'longBreak' : 'focus';

    // Focus moddayken ve timer başlamışsa (timeLeft < totalDuration) sor
    if (mode === 'focus' && timeLeft < totalDuration) {
      Alert.alert(
        '⏭️ Oturumu Bitir',
        'Bu odak oturumunu tamamlanmış olarak saymak ister misin?',
        [
          {
            text: 'Evet, Sayılsın ✅',
            onPress: () => {
              addPomodoroSession(today);
              if (selectedTask) {
                updateTask(today, selectedTask.id, { pomodoroCount: (selectedTask.pomodoroCount || 0) + 1 });
              }
              const newCount = completedSessionsCount + 1;
              const breakMode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak';
              switchMode(breakMode);
            },
          },
          {
            text: 'Hayır, Geç',
            onPress: () => switchMode(nextMode),
          },
          { text: 'İptal', style: 'cancel' },
        ],
      );
    } else {
      switchMode(nextMode);
    }
  };

  /** Manuel oturum ekleme */
  const addManualSession = () => {
    addPomodoroSession(today);
  };

  // ─── Button bounce helper ─────────────────────────────────────
  const bounceAndRun = (anim: Animated.Value, fn: () => void) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 0.85, useNativeDriver: true, friction: 5, tension: 200 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    fn();
  };

  const handleModeLayout = (m: TimerMode, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setButtonLayouts((prev) => ({ ...prev, [m]: { x, width } }));
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {/* ── Top right settings & sound buttons ── */}
      <View style={styles.topRightControls}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setIsSoundModalVisible(true)}
        >
          <Text style={{ fontSize: 22 }}>{selectedAmbient !== 'none' ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setIsSettingsModalVisible(true)}
        >
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
      </View>
      {/* ── Animated background gradients (stacked, crossfade) ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: focusBgOpacity }]} pointerEvents="none">
        <LinearGradient colors={bgGradients.focus} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shortBreakBgOpacity }]} pointerEvents="none">
        <LinearGradient colors={bgGradients.shortBreak} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: longBreakBgOpacity }]} pointerEvents="none">
        <LinearGradient colors={bgGradients.longBreak} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>

      {/* ── Mode selector with sliding indicator ── */}
      <View style={styles.modeSelector}>
        {/* Indicator pill (rendered first → behind buttons) */}
        <Animated.View
          style={[
            styles.modeIndicator,
            {
              backgroundColor: activeColor + '20',
              borderColor: activeColor,
              left: indicatorLeft,
              width: indicatorWidth,
            },
          ]}
        />

        {(Object.keys(MODES) as TimerMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={styles.modeButton}
            onPress={() => switchMode(m)}
            onLayout={(e) => handleModeLayout(m, e)}
            activeOpacity={0.7}
          >
            <Text style={styles.modeEmoji}>{MODES[m].emoji}</Text>
            <Animated.Text
              style={[
                styles.modeLabel, 
                { color: theme.textSecondary }, 
                mode === m && { color: activeColor, fontWeight: '700' },
                mode === m && { transform: [{ scale: activeModePulse }] }
              ]}
            >
              {MODES[m].label}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Task Linking Chip ── */}
      <TouchableOpacity 
        style={[styles.taskChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.border }]} 
        onPress={() => setIsTaskModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.taskChipText, { color: theme.textSecondary }]}>
          {selectedTask ? `🎯 ${selectedTask.title}` : '🎯 Serbest Odak'}
        </Text>
        {selectedTask && (
          <TouchableOpacity 
            style={styles.taskChipClear} 
            onPress={(e) => { e.stopPropagation(); setSelectedTaskId(null); }}
          >
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>❌</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* ── Timer ring with neon glow ── */}
      <View style={styles.timerContainer}>
        {/* Glow layer */}
        <Animated.View
          style={[
            styles.glowCircle,
            {
              width: CIRCLE_SIZE + 40,
              height: CIRCLE_SIZE + 40,
              borderRadius: (CIRCLE_SIZE + 40) / 2,
              backgroundColor: ringColor + '10',
              opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }),
              transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }],
            },
          ]}
        />

        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          {/* Track */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={theme.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH + 1}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            strokeLinecap="round"
            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
          />
        </Svg>

        {/* Centred time display */}
        <View style={styles.timerTextContainer}>
          <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(timeLeft)}</Text>
          <Text style={[styles.timerSubtext, { color: theme.textMuted }]}>{MODES[mode].label}</Text>
        </View>
      </View>

      {/* ── Session dots (4-cycle pomodoro indicator) ── */}
      <View style={styles.sessionDots}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < currentSessionInCycle;
          const active = i === currentSessionInCycle && isRunning && mode === 'focus';
          return (
            <Animated.View
              key={i}
              style={[
                styles.sessionDot,
                {
                  backgroundColor: filled ? activeColor : 'transparent',
                  borderColor: filled || active ? activeColor : theme.border,
                },
                active && {
                  backgroundColor: activeColor + '50',
                  transform: [{ scale: sessionDotPulse }],
                },
              ]}
            />
          );
        })}
        <Text style={[styles.sessionCountText, { color: theme.textMuted }]}>{completedSessionsCount} oturum</Text>
        <TouchableOpacity onPress={addManualSession} style={[styles.addSessionButton, { borderColor: theme.border }]}>
          <Text style={[styles.addSessionText, { color: theme.textSecondary }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4th Session Success Banner ── */}
      {completedSessionsCount > 0 && currentSessionInCycle === 0 && mode !== 'focus' && (
        <Animated.View style={styles.successBanner}>
          <Text style={styles.successBannerText}>🌿 Uzun bir mola hak ettin!</Text>
        </Animated.View>
      )}

      {/* ── Control buttons ── */}
      <View style={styles.controls}>
        {/* Reset */}
        <TouchableOpacity onPress={() => bounceAndRun(resetScaleAnim, handleReset)} activeOpacity={1}>
          <Animated.View
            style={[
              styles.controlButton,
              {
                borderColor: theme.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                transform: [{ scale: resetScaleAnim }],
              },
            ]}
          >
            <ResetIcon size={20} color={theme.textSecondary} />
          </Animated.View>
        </TouchableOpacity>

        {/* Play / Pause */}
        <TouchableOpacity onPress={() => bounceAndRun(playScaleAnim, toggleTimer)} activeOpacity={1}>
          <Animated.View style={{ transform: [{ scale: playScaleAnim }] }}>
            <LinearGradient colors={getModeGradient()} style={styles.playButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {isRunning ? <PauseIcon size={30} color="#fff" /> : <PlayIcon size={30} color="#fff" />}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          onPress={() => bounceAndRun(skipScaleAnim, handleSkip)}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.controlButton,
              {
                borderColor: theme.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                transform: [{ scale: skipScaleAnim }],
              },
            ]}
          >
            <SkipIcon size={20} color={theme.textSecondary} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* ── Tip card ── */}
      <View style={[styles.tipCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
        <Text style={[styles.tipText, { color: theme.textMuted }]}>
          💡 Her 4 odak oturumundan sonra uzun mola önerilir.
        </Text>
      </View>

      {/* ── Stats Card ── */}
      <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
        <View style={styles.statsItem}>
          <Text style={[styles.statsValue, { color: theme.text }]}>🔥 {streak}</Text>
          <Text style={[styles.statsLabel, { color: theme.textMuted }]}>Günlük Seri</Text>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsItem}>
          <Text style={[styles.statsValue, { color: theme.text }]}>🍅 {completedSessionsCount}</Text>
          <Text style={[styles.statsLabel, { color: theme.textMuted }]}>Bugün</Text>
        </View>
      </View>

      {/* ── Settings Modal ── */}
      <Modal
        visible={isSettingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Süre Ayarları (Dk)</Text>
              <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Odak</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setTempFocus(Math.max(5, tempFocus - 5))} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>-</Text></TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{tempFocus}</Text>
                <TouchableOpacity onPress={() => setTempFocus(tempFocus + 5)} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>+</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Kısa Mola</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setTempShortBreak(Math.max(1, tempShortBreak - 1))} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>-</Text></TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{tempShortBreak}</Text>
                <TouchableOpacity onPress={() => setTempShortBreak(tempShortBreak + 1)} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>+</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Uzun Mola</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setTempLongBreak(Math.max(5, tempLongBreak - 5))} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>-</Text></TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{tempLongBreak}</Text>
                <TouchableOpacity onPress={() => setTempLongBreak(tempLongBreak + 5)} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>+</Text></TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveSettingsButton, { backgroundColor: theme.accent }]} 
              onPress={savePomodoroSettings}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Sound Settings Modal ── */}
      <Modal
        visible={isSoundModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSoundModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Ses Ayarları</Text>
              <TouchableOpacity onPress={() => setIsSoundModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Süre Bitiş Zili (Ding)</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: tempSoundEnabled ? theme.accent : 'transparent', borderColor: tempSoundEnabled ? theme.accent : theme.border }
                ]}
                onPress={() => setTempSoundEnabled(!tempSoundEnabled)}
              >
                <Text style={{ color: tempSoundEnabled ? '#fff' : theme.textSecondary, fontWeight: '600' }}>
                  {tempSoundEnabled ? 'AÇIK' : 'KAPALI'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.settingLabel, { color: theme.text, marginTop: 10, marginBottom: 15 }]}>Arka Plan Sesi</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {AMBIENT_SOUNDS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.soundOption,
                    { borderColor: theme.border },
                    selectedAmbient === s.id && { borderColor: theme.accent, backgroundColor: theme.accent + '20' }
                  ]}
                  onPress={() => setSelectedAmbient(s.id)}
                >
                  <Text style={{ color: theme.text, fontSize: 14 }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedAmbient !== 'none' && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: theme.textMuted, marginBottom: 10, fontSize: 13 }}>Ses Seviyesi</Text>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={1}
                  value={ambientVolume}
                  onValueChange={setAmbientVolume}
                  minimumTrackTintColor={theme.accent}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.accent}
                />
              </View>
            )}

            <TouchableOpacity 
              style={[styles.saveSettingsButton, { backgroundColor: theme.accent }]} 
              onPress={saveSoundSettings}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Task Select Modal ── */}
      <Modal
        visible={isTaskModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTaskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Görev Seç</Text>
              <TouchableOpacity onPress={() => setIsTaskModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>Kapat</Text>
              </TouchableOpacity>
            </View>
            
            {sortedTasks.length === 0 ? (
              <View style={styles.emptyTaskContainer}>
                <Text style={[styles.emptyTaskText, { color: theme.textMuted }]}>
                  Bugün için tamamlanmamış görev bulunmuyor. 🎉
                </Text>
              </View>
            ) : (
              <FlatList
                data={sortedTasks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.taskItem,
                      { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' },
                      selectedTaskId === item.id && { borderColor: theme.accent, backgroundColor: theme.accent + '15' }
                    ]}
                    onPress={() => {
                      setSelectedTaskId(item.id);
                      setIsTaskModalVisible(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.taskTitle, { color: theme.text }]}>{item.title}</Text>
                      <Text style={[styles.taskSub, { color: theme.textMuted }]}>
                        {item.category ? `📁 ${item.category}` : 'Genel'} • {item.pomodoroCount || 0} Pomodoro
                      </Text>
                    </View>
                    {selectedTaskId === item.id && (
                      <Text style={{ color: theme.accent, fontWeight: '700' }}>Seçili</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            
            <TouchableOpacity 
              style={[styles.modalClearButton, { borderColor: theme.border }]} 
              onPress={() => { setSelectedTaskId(null); setIsTaskModalVisible(false); }}
            >
              <Text style={{ color: theme.textSecondary }}>Bağlantıyı Kaldır (Serbest Odak)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
//  STYLES
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },

  /* ── Mode Selector ── */
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
    position: 'relative',
  },
  modeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  modeEmoji: {
    fontSize: 16,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Timer ── */
  timerContainer: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  glowCircle: {
    position: 'absolute',
  },
  timerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerSubtext: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  /* ── Session Dots ── */
  sessionDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  sessionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  sessionCountText: {
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  addSessionButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  addSessionText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  successBanner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#0a3622',
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#198754',
  },
  successBannerText: {
    color: '#d1e7dd',
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Controls ── */
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    marginBottom: 36,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  /* ── Tip ── */
  tipCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 13,
    textAlign: 'center',
  },

  /* ── Task Chip & Modal ── */
  taskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 20,
    minWidth: 160,
    justifyContent: 'center',
  },
  taskChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  taskChipClear: {
    padding: 2,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '70%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  emptyTaskContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTaskText: {
    fontSize: 14,
    textAlign: 'center',
  },
  taskItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskSub: {
    fontSize: 12,
  },
  modalClearButton: {
    marginTop: 10,
    padding: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },

  /* ── Settings specific ── */
  topRightControls: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperVal: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  saveSettingsButton: {
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  soundOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },

  /* ── Stats Card ── */
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    width: '100%',
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(150,150,150,0.3)',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
