import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plans } from '../../types';
import { createSharedStyles } from '../../utils/sharedStyles';
import WeeklyStatsChart from '../WeeklyStatsChart';
import { generateWeeklySummary, checkApiKey } from '../../utils/aiService';
import { getToday, addDays } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';

interface StatsSectionProps {
  plans: Plans;
  username: string | null;
}

export default function StatsSection({ plans, username }: StatsSectionProps) {
  const { theme } = useApp();
  const themed = createSharedStyles(theme);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const calculateStats = () => {
    const planDates = Object.keys(plans);
    const totalPlans = planDates.length;
    let totalTasks = 0;
    let completedTasks = 0;
    planDates.forEach(date => {
      const tasks = plans[date] || [];
      totalTasks += tasks.length;
      completedTasks += tasks.filter(task => task.done).length;
    });
    return { totalPlans, totalTasks, completedTasks };
  };

  const handleAnalyzeWeek = async () => {
    if (!checkApiKey()) {
      Alert.alert('Hata', 'Gemini API Anahtarı bulunamadı.');
      return;
    }
    setIsAiLoading(true);
    try {
      const weeklyData = [];
      const today = getToday();
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        weeklyData.push({ date: d, tasks: plans[d] || [] });
      }
      const summary = await generateWeeklySummary(username || 'Kullanıcı', weeklyData);
      setAiSummary(summary);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Analiz oluşturulurken hata oluştu.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const stats = calculateStats();

  return (
    <View style={styles.statsSection}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 İstatistikler</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCardWrapper}>
          <LinearGradient colors={theme.accentGradient} style={styles.statCardGradient}>
            <Text style={styles.statValue}>{stats.totalPlans}</Text>
            <Text style={styles.statLabel}>Toplam Plan</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCardWrapper}>
          <LinearGradient colors={theme.pinkGradient} style={styles.statCardGradient}>
            <Text style={styles.statValue}>{stats.totalTasks}</Text>
            <Text style={styles.statLabel}>Toplam Görev</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCardWrapper}>
          <LinearGradient colors={theme.blueGradient} style={styles.statCardGradient}>
            <Text style={styles.statValue}>{stats.completedTasks}</Text>
            <Text style={styles.statLabel}>Tamamlanan</Text>
          </LinearGradient>
        </View>

        {stats.totalTasks > 0 && (
          <View style={styles.statCardWrapper}>
            <LinearGradient colors={theme.successGradient} style={styles.statCardGradient}>
              <Text style={styles.statValue}>
                {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Başarı Oranı</Text>
            </LinearGradient>
          </View>
        )}
      </View>

      <WeeklyStatsChart plans={plans} />

      {/* AI Analiz */}
      <View style={{ marginTop: 24 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🤖 Haftalık Yapay Zeka Karnesi</Text>

        <View style={[themed.glassCardPadded]}>
          {!aiSummary && !isAiLoading ? (
            <View style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 15, fontSize: 13 }}>
                Yapay zeka asistanımız, son 7 gündeki tamamlanmış ve tamamlanmamış görevlerini inceleyip sana özel bir rapor çıkarır.
              </Text>
              <TouchableOpacity onPress={handleAnalyzeWeek}>
                <LinearGradient
                  colors={theme.pinkGradient}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>✨ Haftamı Analiz Et</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : isAiLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>Gemini verilerini inceliyor... ⏳</Text>
            </View>
          ) : (
            <View style={{ paddingVertical: 5 }}>
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 22, fontWeight: '500' }}>
                {aiSummary}
              </Text>
              <TouchableOpacity onPress={handleAnalyzeWeek} style={{ marginTop: 15, alignSelf: 'flex-start' }}>
                <Text style={{ color: theme.textMuted, fontSize: 12, textDecorationLine: 'underline' }}>
                  Tekrar Analiz Et
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCardWrapper: {
    width: '48%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 20,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
});
