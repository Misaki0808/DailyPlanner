import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { usePomodoroTimer, TimerMode, MODES } from '../hooks/usePomodoroTimer';
import { PomodoroModals } from '../components/pomodoro/PomodoroModals';

// ─── SVG Icon Components ────────────────────────────────────────
const PlayIcon = ({ size = 28, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M8 5.14v13.72c0 .8.87 1.3 1.54.88l10.52-6.86a1 1 0 000-1.76L9.54 4.26C8.87 3.84 8 4.34 8 5.14z" fill={color} />
  </Svg>
);

const PauseIcon = ({ size = 28, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill={color} />
  </Svg>
);

const ResetIcon = ({ size = 22, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill={color} />
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
  const { theme, settings, updateSettings } = useApp();
  const isDark = settings?.darkMode ?? true;

  const timer = usePomodoroTimer();

  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isSoundModalVisible, setIsSoundModalVisible] = useState(false);

  const savePomodoroSettings = async () => {
    await updateSettings({
      pomodoroFocusTime: timer.tempFocus,
      pomodoroShortBreak: timer.tempShortBreak,
      pomodoroLongBreak: timer.tempLongBreak,
    });
    setIsSettingsModalVisible(false);
  };
  
  const saveSoundSettings = async () => {
    await updateSettings({ pomodoroSoundEnabled: timer.tempSoundEnabled });
    setIsSoundModalVisible(false);
  };

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

  const [buttonLayouts, setButtonLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(80)).current;

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
    switch (timer.mode) {
      case 'focus': return theme.accent;
      case 'shortBreak': return theme.success;
      case 'longBreak': return theme.info;
    }
  };

  const getModeGradient = (): readonly [string, string, ...string[]] => {
    switch (timer.mode) {
      case 'focus': return theme.accentGradient;
      case 'shortBreak': return theme.successGradient;
      case 'longBreak': return theme.blueGradient;
    }
  };

  const getRingColor = (): string => {
    if (timer.mode === 'focus' && timer.isRunning) {
      if (timer.timeLeft <= 10) return theme.error;
      if (timer.timeLeft <= 30) return theme.warning;
    }
    return getModeColor();
  };

  const activeColor = getModeColor();
  const ringColor = getRingColor();
  const currentSessionInCycle = timer.completedSessionsCount % 4;

  // ─── Glow pulse ───────────────────
  useEffect(() => {
    if (timer.isRunning) {
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [timer.isRunning]);

  // ─── Session dot heartbeat ───
  useEffect(() => {
    if (timer.isRunning && timer.mode === 'focus') {
      const beat = Animated.loop(Animated.sequence([
        Animated.timing(sessionDotPulse, { toValue: 1.4, duration: 500, useNativeDriver: true }),
        Animated.timing(sessionDotPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]));
      beat.start();
      return () => beat.stop();
    } else {
      sessionDotPulse.setValue(1);
    }
  }, [timer.isRunning, timer.mode]);

  // ─── Background gradient crossfade ─────────────
  useEffect(() => {
    const map = { focus: focusBgOpacity, shortBreak: shortBreakBgOpacity, longBreak: longBreakBgOpacity };
    Animated.parallel((Object.keys(map) as TimerMode[]).map((m) =>
      Animated.timing(map[m], { toValue: m === timer.mode ? 1 : 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    )).start();
  }, [timer.mode]);

  // ─── Sliding indicator ──────────────
  useEffect(() => {
    const layout = buttonLayouts[timer.mode];
    if (layout && layout.width > 0) {
      Animated.parallel([
        Animated.spring(indicatorLeft, { toValue: layout.x, useNativeDriver: false, friction: 8, tension: 80 }),
        Animated.spring(indicatorWidth, { toValue: layout.width, useNativeDriver: false, friction: 8, tension: 80 }),
      ]).start();
    }
  }, [timer.mode, buttonLayouts]);

  // ─── Animations for active elements ──────────────────────────────
  useEffect(() => {
    const activePulse = Animated.loop(Animated.sequence([
      Animated.timing(activeModePulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
      Animated.timing(activeModePulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]));
    activePulse.start();
    return () => activePulse.stop();
  }, []);

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

  const sortedTasks = [...timer.todayTasks.filter(t => !t.done)].sort((a, b) => {
    const aIsPriority = a.category === 'is' || a.category === 'proje' || a.category?.includes('iş');
    const bIsPriority = b.category === 'is' || b.category === 'proje' || b.category?.includes('iş');
    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    return 0;
  });

  return (
    <View style={styles.container}>
      {/* ── Top right settings & sound buttons ── */}
      <View style={styles.topRightControls}>
        <TouchableOpacity style={styles.headerButton} onPress={() => setIsSoundModalVisible(true)}>
          <Text style={{ fontSize: 22 }}>{timer.selectedAmbient !== 'none' ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={() => setIsSettingsModalVisible(true)}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ── Animated background gradients ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: focusBgOpacity }]} pointerEvents="none">
        <LinearGradient colors={bgGradients.focus} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shortBreakBgOpacity }]} pointerEvents="none">
        <LinearGradient colors={bgGradients.shortBreak} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: longBreakBgOpacity }]} pointerEvents="none">
        <LinearGradient colors={bgGradients.longBreak} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      </Animated.View>

      {/* ── Mode selector ── */}
      <View style={styles.modeSelector}>
        <Animated.View style={[styles.modeIndicator, { backgroundColor: activeColor + '20', borderColor: activeColor, left: indicatorLeft, width: indicatorWidth }]} />
        {(Object.keys(MODES) as TimerMode[]).map((m) => (
          <TouchableOpacity key={m} style={styles.modeButton} onPress={() => timer.switchMode(m)} onLayout={(e) => handleModeLayout(m, e)} activeOpacity={0.7}>
            <Text style={styles.modeEmoji}>{MODES[m].emoji}</Text>
            <Animated.Text style={[styles.modeLabel, { color: theme.textSecondary }, timer.mode === m && { color: activeColor, fontWeight: '700' }, timer.mode === m && { transform: [{ scale: activeModePulse }] }]}>
              {MODES[m].label}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Task Linking Chip ── */}
      <TouchableOpacity style={[styles.taskChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.border }]} onPress={() => setIsTaskModalVisible(true)} activeOpacity={0.7}>
        <Text style={[styles.taskChipText, { color: theme.textSecondary }]}>{timer.selectedTask ? `🎯 ${timer.selectedTask.title}` : '🎯 Serbest Odak'}</Text>
        {timer.selectedTask && (
          <TouchableOpacity style={styles.taskChipClear} onPress={(e) => { e.stopPropagation(); timer.setSelectedTaskId(null); }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>❌</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* ── Timer ring ── */}
      <View style={styles.timerContainer}>
        <Animated.View style={[styles.glowCircle, { width: CIRCLE_SIZE + 40, height: CIRCLE_SIZE + 40, borderRadius: (CIRCLE_SIZE + 40) / 2, backgroundColor: ringColor + '10', opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }), transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }] }]} />
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} stroke={theme.border} strokeWidth={STROKE_WIDTH} fill="none" />
          <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} stroke={ringColor} strokeWidth={STROKE_WIDTH + 1} fill="none" strokeDasharray={`${CIRCUMFERENCE}`} strokeDashoffset={CIRCUMFERENCE * (1 - timer.progress)} strokeLinecap="round" transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`} />
        </Svg>
        <View style={styles.timerTextContainer}>
          <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(timer.timeLeft)}</Text>
          <Text style={[styles.timerSubtext, { color: theme.textMuted }]}>{MODES[timer.mode].label}</Text>
        </View>
      </View>

      {/* ── Session dots ── */}
      <View style={styles.sessionDots}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < currentSessionInCycle;
          const active = i === currentSessionInCycle && timer.isRunning && timer.mode === 'focus';
          return (
            <Animated.View key={i} style={[styles.sessionDot, { backgroundColor: filled ? activeColor : 'transparent', borderColor: filled || active ? activeColor : theme.border }, active && { backgroundColor: activeColor + '50', transform: [{ scale: sessionDotPulse }] }]} />
          );
        })}
        <Text style={[styles.sessionCountText, { color: theme.textMuted }]}>{timer.completedSessionsCount} oturum</Text>
        <TouchableOpacity onPress={timer.addManualSession} style={[styles.addSessionButton, { borderColor: theme.border }]}><Text style={[styles.addSessionText, { color: theme.textSecondary }]}>+</Text></TouchableOpacity>
      </View>

      {/* ── 4th Session Success Banner ── */}
      {timer.completedSessionsCount > 0 && currentSessionInCycle === 0 && timer.mode !== 'focus' && (
        <Animated.View style={styles.successBanner}>
          <Text style={styles.successBannerText}>🌿 Uzun bir mola hak ettin!</Text>
        </Animated.View>
      )}

      {/* ── Control buttons ── */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => bounceAndRun(resetScaleAnim, timer.handleReset)} activeOpacity={1}>
          <Animated.View style={[styles.controlButton, { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', transform: [{ scale: resetScaleAnim }] }]}><ResetIcon size={20} color={theme.textSecondary} /></Animated.View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => bounceAndRun(playScaleAnim, timer.toggleTimer)} activeOpacity={1}>
          <Animated.View style={{ transform: [{ scale: playScaleAnim }] }}>
            <LinearGradient colors={getModeGradient()} style={styles.playButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {timer.isRunning ? <PauseIcon size={30} color="#fff" /> : <PlayIcon size={30} color="#fff" />}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => bounceAndRun(skipScaleAnim, timer.handleSkip)} activeOpacity={1}>
          <Animated.View style={[styles.controlButton, { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', transform: [{ scale: skipScaleAnim }] }]}><SkipIcon size={20} color={theme.textSecondary} /></Animated.View>
        </TouchableOpacity>
      </View>

      {/* ── Tip card ── */}
      <View style={[styles.tipCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
        <Text style={[styles.tipText, { color: theme.textMuted }]}>💡 Her 4 odak oturumundan sonra uzun mola önerilir.</Text>
      </View>

      {/* ── Stats Card ── */}
      <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: theme.border }]}>
        <View style={styles.statsItem}>
          <Text style={[styles.statsValue, { color: theme.text }]}>🔥 {timer.streak}</Text>
          <Text style={[styles.statsLabel, { color: theme.textMuted }]}>Günlük Seri</Text>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsItem}>
          <Text style={[styles.statsValue, { color: theme.text }]}>🍅 {timer.completedSessionsCount}</Text>
          <Text style={[styles.statsLabel, { color: theme.textMuted }]}>Bugün</Text>
        </View>
      </View>

      <PomodoroModals
        isSettingsModalVisible={isSettingsModalVisible} setIsSettingsModalVisible={setIsSettingsModalVisible}
        isSoundModalVisible={isSoundModalVisible} setIsSoundModalVisible={setIsSoundModalVisible}
        isTaskModalVisible={isTaskModalVisible} setIsTaskModalVisible={setIsTaskModalVisible}
        tempFocus={timer.tempFocus} setTempFocus={timer.setTempFocus} tempShortBreak={timer.tempShortBreak} setTempShortBreak={timer.setTempShortBreak} tempLongBreak={timer.tempLongBreak} setTempLongBreak={timer.setTempLongBreak}
        tempSoundEnabled={timer.tempSoundEnabled} setTempSoundEnabled={timer.setTempSoundEnabled} selectedAmbient={timer.selectedAmbient} setSelectedAmbient={timer.setSelectedAmbient} ambientVolume={timer.ambientVolume} setAmbientVolume={timer.setAmbientVolume}
        savePomodoroSettings={savePomodoroSettings} saveSoundSettings={saveSoundSettings}
        sortedTasks={sortedTasks} selectedTaskId={timer.selectedTaskId} setSelectedTaskId={timer.setSelectedTaskId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20, alignItems: 'center' },
  modeSelector: { flexDirection: 'row', gap: 8, marginBottom: 40, position: 'relative' },
  modeIndicator: { position: 'absolute', top: 0, bottom: 0, borderRadius: 20, borderWidth: 1.5 },
  modeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6 },
  modeEmoji: { fontSize: 16 },
  modeLabel: { fontSize: 13, fontWeight: '600' },
  timerContainer: { width: 260, height: 260, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  glowCircle: { position: 'absolute' },
  timerTextContainer: { position: 'absolute', alignItems: 'center' },
  timerText: { fontSize: 56, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: 2 },
  timerSubtext: { fontSize: 13, marginTop: 4, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  sessionDots: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  sessionDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  sessionCountText: { fontSize: 12, marginLeft: 8, fontWeight: '500' },
  addSessionButton: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  addSessionText: { fontSize: 14, fontWeight: '700', lineHeight: 16 },
  successBanner: { paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#0a3622', borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#198754' },
  successBannerText: { color: '#d1e7dd', fontSize: 13, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 36 },
  controlButton: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  tipCard: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  tipText: { fontSize: 13, textAlign: 'center' },
  taskChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, marginBottom: 20, minWidth: 160, justifyContent: 'center' },
  taskChipText: { fontSize: 14, fontWeight: '600', marginRight: 4 },
  taskChipClear: { padding: 2, marginLeft: 6 },
  topRightControls: { position: 'absolute', top: 10, right: 20, zIndex: 10, flexDirection: 'row', gap: 16 },
  headerButton: { padding: 5 },
  statsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 16, borderRadius: 16, borderWidth: 1, marginTop: 16, width: '100%' },
  statsItem: { alignItems: 'center', flex: 1 },
  statsDivider: { width: 1, height: 30, backgroundColor: 'rgba(150,150,150,0.3)' },
  statsValue: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  statsLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
});
