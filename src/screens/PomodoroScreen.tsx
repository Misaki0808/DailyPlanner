import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../context/AppContext';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const MODES: Record<TimerMode, { label: string; emoji: string; duration: number }> = {
  focus: { label: 'Odak', emoji: '🎯', duration: 25 * 60 },
  shortBreak: { label: 'Kısa Mola', emoji: '☕', duration: 5 * 60 },
  longBreak: { label: 'Uzun Mola', emoji: '🌿', duration: 15 * 60 },
};

export default function PomodoroScreen() {
  const { theme } = useApp();
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = MODES[mode].duration;
  const progress = timeLeft / totalDuration;

  // Dairesel progress bar parametreleri
  const CIRCLE_SIZE = 240;
  const STROKE_WIDTH = 10;
  const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 400, 200, 400]);
    }

    if (mode === 'focus') {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      const nextMode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak';
      Alert.alert(
        '🎉 Tebrikler!',
        `Odak süren bitti! ${newCount}. oturum tamamlandı.\n${nextMode === 'longBreak' ? 'Uzun bir mola hak ettin!' : 'Kısa bir mola ver.'}`,
        [
          { text: 'Molaya Geç', onPress: () => switchMode(nextMode) },
          { text: 'Kapat', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        '⏰ Mola Bitti!',
        'Tekrar odaklanmaya hazır mısın?',
        [
          { text: 'Odaklan', onPress: () => switchMode('focus') },
          { text: 'Kapat', style: 'cancel' },
        ]
      );
    }
  }, [mode, completedSessions]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleTimerEnd();
    }
  }, [timeLeft, isRunning, handleTimerEnd]);

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
  };

  const toggleTimer = () => {
    setIsRunning(prev => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(MODES[mode].duration);
  };

  const getModeColor = (): string => {
    switch (mode) {
      case 'focus': return theme.accent;
      case 'shortBreak': return theme.success;
      case 'longBreak': return theme.info;
    }
  };

  const getModeGradient = (): readonly [string, string, ...string[]] => {
    switch (mode) {
      case 'focus': return theme.accentGradient;
      case 'shortBreak': return theme.successGradient;
      case 'longBreak': return theme.blueGradient;
    }
  };

  const activeColor = getModeColor();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Mod Seçici */}
      <View style={styles.modeSelector}>
        {(Object.keys(MODES) as TimerMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.modeButton,
              { borderColor: theme.border },
              mode === m && { backgroundColor: activeColor + '20', borderColor: activeColor },
            ]}
            onPress={() => switchMode(m)}
          >
            <Text style={styles.modeEmoji}>{MODES[m].emoji}</Text>
            <Text style={[
              styles.modeLabel,
              { color: theme.textSecondary },
              mode === m && { color: activeColor, fontWeight: '700' },
            ]}>
              {MODES[m].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dairesel Sayaç */}
      <View style={styles.timerContainer}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svgContainer}>
          {/* Arka plan dairesi */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={theme.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* İlerleme dairesi */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={activeColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            strokeLinecap="round"
            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.timerTextContainer}>
          <Text style={[styles.timerText, { color: theme.text }]}>
            {formatTime(timeLeft)}
          </Text>
          <Text style={[styles.timerSubtext, { color: theme.textMuted }]}>
            {MODES[mode].emoji} {MODES[mode].label}
          </Text>
        </View>
      </View>

      {/* Kontrol Butonları */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, { borderColor: theme.border }]} onPress={resetTimer}>
          <Text style={styles.controlIcon}>🔄</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleTimer} activeOpacity={0.8}>
          <LinearGradient
            colors={getModeGradient()}
            style={styles.playButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.playIcon}>{isRunning ? '⏸️' : '▶️'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { borderColor: theme.border }]}
          onPress={() => {
            const nextMode: TimerMode = mode === 'focus' ? 'shortBreak' : mode === 'shortBreak' ? 'longBreak' : 'focus';
            switchMode(nextMode);
          }}
        >
          <Text style={styles.controlIcon}>⏭️</Text>
        </TouchableOpacity>
      </View>

      {/* Oturum Sayacı */}
      <View style={[styles.sessionCounter, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
        <Text style={[styles.sessionText, { color: theme.textSecondary }]}>
          🎯 Bugün tamamlanan: <Text style={{ fontWeight: '800', color: activeColor }}>{completedSessions}</Text> oturum
        </Text>
      </View>

      {/* İpuçları */}
      <View style={[styles.tipCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.tipText, { color: theme.textMuted }]}>
          💡 Her 4 odak oturumundan sonra uzun mola önerilir.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 40,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  modeEmoji: {
    fontSize: 16,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  timerContainer: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  svgContainer: {
    position: 'absolute',
  },
  timerTextContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 52,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 40,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 22,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 30,
  },
  sessionCounter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sessionText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
});
