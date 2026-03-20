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
import { sharedStyles } from '../../utils/sharedStyles';
import WeeklyStatsChart from '../WeeklyStatsChart';
import { generateWeeklySummary, checkApiKey } from '../../utils/aiService';
import { getToday, addDays } from '../../utils/dateUtils';

interface StatsSectionProps {
  plans: Plans;
  username: string | null;
}

export default function StatsSection({ plans, username }: StatsSectionProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // İstatistikler hesapla
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

  // Haftamı Analiz Et (AI)
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
      <Text style={sharedStyles.sectionTitle}>📊 İstatistikler</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCardWrapper}>
          <View style={sharedStyles.glassCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.statCardGradient}
            >
              <Text style={styles.statValue}>{stats.totalPlans}</Text>
              <Text style={styles.statLabel}>Toplam Plan</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.statCardWrapper}>
          <View style={sharedStyles.glassCard}>
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.statCardGradient}
            >
              <Text style={styles.statValue}>{stats.totalTasks}</Text>
              <Text style={styles.statLabel}>Toplam Görev</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.statCardWrapper}>
          <View style={sharedStyles.glassCard}>
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              style={styles.statCardGradient}
            >
              <Text style={styles.statValue}>{stats.completedTasks}</Text>
              <Text style={styles.statLabel}>Tamamlanan</Text>
            </LinearGradient>
          </View>
        </View>

        {stats.totalTasks > 0 && (
          <View style={styles.statCardWrapper}>
            <View style={sharedStyles.glassCard}>
              <LinearGradient
                colors={['#43e97b', '#38f9d7']}
                style={styles.statCardGradient}
              >
                <Text style={styles.statValue}>
                  {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
                </Text>
                <Text style={styles.statLabel}>Başarı Oranı</Text>
              </LinearGradient>
            </View>
          </View>
        )}
      </View>

      {/* Haftalık Performans Grafiği */}
      <WeeklyStatsChart plans={plans} />

      {/* Yapay Zeka (Gemini) Analizi */}
      <View style={{ marginTop: 24 }}>
        <View style={styles.aiSectionHeader}>
          <Text style={sharedStyles.sectionTitle}>🤖 Haftalık Yapay Zeka Karnesi</Text>
        </View>

        <View style={sharedStyles.glassCardPadded}>
          {!aiSummary && !isAiLoading ? (
            <View style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 15, fontSize: 13 }}>
                Yapay zeka asistanımız, son 7 gündeki tamamlanmış ve tamamlanmamış görevlerini inceleyip sana özel bir rapor çıkarır.
              </Text>
              <TouchableOpacity onPress={handleAnalyzeWeek}>
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>✨ Haftamı Analiz Et</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : isAiLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Gemini verilerini inceliyor... ⏳</Text>
            </View>
          ) : (
            <View style={{ paddingVertical: 5 }}>
              <Text style={{ color: '#fff', fontSize: 14, lineHeight: 22, fontWeight: '500' }}>
                {aiSummary}
              </Text>
              <TouchableOpacity onPress={handleAnalyzeWeek} style={{ marginTop: 15, alignSelf: 'flex-start' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textDecorationLine: 'underline' }}>
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

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCardWrapper: {
    width: '48%',
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
  aiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});
