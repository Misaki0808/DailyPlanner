import React, { useState, useRef } from 'react';
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
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getCategoryLabel, TASK_CATEGORIES, getCategoryColor, getCategoryEmoji } from '../../utils/categories';

interface StatsSectionProps {
  plans: Plans;
  username: string | null;
}

export default function StatsSection({ plans, username }: StatsSectionProps) {
  const { theme } = useApp();
  const themed = createSharedStyles(theme);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const dashboardRef = useRef<View>(null);

  const calculateStats = () => {
    const planDates = Object.keys(plans);
    const totalPlans = planDates.length;
    let totalTasks = 0;
    let completedTasks = 0;
    const categoryCounts: Record<string, { total: number; completed: number }> = {};

    planDates.forEach(date => {
      const tasks = plans[date] || [];
      tasks.forEach(task => {
        totalTasks++;
        if (task.done) completedTasks++;

        // Kategori dağılımını hesaplama
        const cat = task.category || 'diger';
        if (!categoryCounts[cat]) {
          categoryCounts[cat] = { total: 0, completed: 0 };
        }
        categoryCounts[cat].total++;
        if (task.done) categoryCounts[cat].completed++;
      });
    });
    return { totalPlans, totalTasks, completedTasks, categoryCounts };
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

  const handleShareDashboard = async () => {
    try {
      if (dashboardRef.current) {
        const uri = await captureRef(dashboardRef, {
          format: 'png',
          quality: 0.9,
        });
        await Sharing.shareAsync(uri, { dialogTitle: 'DailyPlanner İstatistiklerim' });
      }
    } catch (error) {
      Alert.alert('Hata', 'Dashboard resmi oluşturulurken bir hata oluştu');
    }
  };

  const handleExportCSV = async () => {
    try {
      // CSV Header
      let csvString = 'Tarih,Gorev Basligi,Oncelik,Kategori,Durum,Not\n';
      
      const dates = Object.keys(plans).sort((a, b) => b.localeCompare(a));
      
      dates.forEach(date => {
        const tasks = plans[date];
        tasks.forEach(task => {
          // Virgülden kaynaklanacak sorunları çözmek için başlığı vb tırnak içine alıyoruz
          const safeTitle = `"${(task.title || '').replace(/"/g, '""')}"`;
          const priority = task.priority || 'low';
          const category = getCategoryLabel(task.category || 'diger');
          const isDone = task.done ? 'Tamamlandi' : 'Bekliyor';
          const safeNote = `"${(task.note || '').replace(/"/g, '""')}"`;
          
          csvString += `${date},${safeTitle},${priority},${category},${isDone},${safeNote}\n`;
        });
      });

      const fileName = `DailyPlanner_DisaAktarim_${getToday()}.csv`;
      const FS = FileSystem as any; // TS hata çözüm için type cast
      const fileUri = `${FS.cacheDirectory || FS.documentDirectory}${fileName}`;
      await FS.writeAsStringAsync(fileUri, csvString, { encoding: FS.EncodingType.UTF8 });
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Planları Excel (CSV) Olarak Aktar',
        UTI: 'public.comma-separated-values-text'
      });
    } catch (error) {
      Alert.alert('Hata', 'Excel (CSV) dosyası oluşturulurken hata meydan geldi');
    }
  };

  const stats = calculateStats();

  return (
    <View style={styles.statsSection}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 İstatistikler</Text>

      <View collapsable={false} ref={dashboardRef} style={{ backgroundColor: theme.background, paddingVertical: 10, borderRadius: 16 }}>
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

        {/* Kategorilere Göre Dağılım */}
        {stats.totalTasks > 0 && Object.keys(stats.categoryCounts).length > 0 && (
          <View style={[styles.categoryDistributionContainer, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.categoryDistributionTitle, { color: theme.text }]}>🏷️ Kategori Dağılımı</Text>
            <View style={styles.categoryList}>
              {Object.entries(stats.categoryCounts)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([catId, counts]) => {
                  const catDef = TASK_CATEGORIES.find(c => c.id === catId);
                  if (!catDef) return null;
                  const percent = Math.round((counts.completed / counts.total) * 100) || 0;
                  return (
                    <View key={catId} style={styles.categoryItem}>
                      <View style={styles.categoryItemHeader}>
                        <Text style={[styles.categoryItemLabel, { color: theme.text }]}>
                          {catDef.emoji} {catDef.label} <Text style={{ color: theme.textSecondary, fontSize: 12 }}>({counts.total})</Text>
                        </Text>
                        <Text style={[styles.categoryItemPercent, { color: catDef.color }]}>{percent}% <Text style={{ color: theme.textSecondary, fontSize: 11 }}>tamamlandı</Text></Text>
                      </View>
                      <View style={[styles.progressBarBg, { backgroundColor: catDef.color + '20' }]}>
                        <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: catDef.color }]} />
                      </View>
                    </View>
                  );
                })
              }
            </View>
          </View>
        )}

        <WeeklyStatsChart plans={plans} />
      </View>

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

      {/* Dışa Aktarım Butonları */}
      <View style={styles.exportSection}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>📤 Veriyi Dışa Aktar</Text>
        <View style={styles.exportRow}>
          <TouchableOpacity onPress={handleShareDashboard} style={styles.exportButtonContainer}>
            <LinearGradient
              colors={theme.blueGradient}
              style={styles.exportButtonGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={styles.exportButtonIcon}>📸</Text>
              <Text style={styles.exportButtonText}>Dashboard'u Paylaş</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleExportCSV} style={styles.exportButtonContainer}>
            <LinearGradient
              colors={theme.successGradient}
              style={styles.exportButtonGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={styles.exportButtonIcon}>📊</Text>
              <Text style={styles.exportButtonText}>Excel Olarak İndir</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  exportSection: {
    marginTop: 10,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButtonContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  exportButtonGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  exportButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryDistributionContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryDistributionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    width: '100%',
  },
  categoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryItemLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryItemPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
