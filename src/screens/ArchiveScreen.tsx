import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { usePlansContext, useTheme } from '../context/AppContext';
import { ArchiveDay, buildArchiveMonths, summarizeArchive } from '../utils/archive';
import { getCategoryEmoji } from '../utils/categories';

/**
 * Geçmiş planların salt-okuma görünümü.
 *
 * Otomatik temizlik varsayılan kapalı olduğu için geçmiş yıllarca birikebilir;
 * bu yüzden SectionList kullanılıyor (sanallaştırma). Aylar bölüm başlığı,
 * günler satır. Bir güne dokununca görev listesi YERİNDE açılıyor; düzenleme
 * için "Bu güne git" ile Planlarım ekranına atlanıyor.
 */
export default function ArchiveScreen() {
  const { plans } = usePlansContext();
  const theme = useTheme();
  const navigation = useNavigation();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const months = useMemo(() => buildArchiveMonths(plans), [plans]);
  const summary = useMemo(() => summarizeArchive(months), [months]);

  const sections = useMemo(
    () => months.map(month => ({ ...month, data: month.days })),
    [months]
  );

  const toggleDay = useCallback((date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  const goToDay = useCallback((date: string) => {
    navigation.navigate('MultiDayView', { date });
  }, [navigation]);

  const renderDay = useCallback(({ item }: { item: ArchiveDay }) => {
    const isExpanded = expandedDates.has(item.date);
    const isComplete = item.percentage >= 100;

    return (
      <View style={[styles.dayCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => toggleDay(item.date)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel={`${item.label}. ${item.completed} / ${item.total} görev tamamlandı, yüzde ${item.percentage}.`}
          accessibilityHint="Görev listesini açmak için dokunun"
        >
          <View style={styles.dayHeader}>
            <Text style={[styles.dayLabel, { color: theme.text }]} numberOfLines={1}>{item.label}</Text>
            <Text style={[styles.dayCount, { color: isComplete ? theme.success : theme.textSecondary }]}>
              {item.completed}/{item.total}
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.accentLight }]}>
            <LinearGradient
              colors={isComplete ? (theme.successGradient as [string, string]) : (theme.accentGradient as [string, string])}
              style={[styles.progressFill, { width: `${item.percentage}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.taskList}>
            {item.tasks.map(task => (
              <View key={task.id} style={styles.taskRow}>
                <Text style={styles.taskCheck}>{task.done ? '✅' : '⬜'}</Text>
                <Text
                  style={[
                    styles.taskTitle,
                    { color: theme.text },
                    task.done && { color: theme.textMuted, textDecorationLine: 'line-through' },
                  ]}
                  numberOfLines={2}
                >
                  {getCategoryEmoji(task.category)} {task.title}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => goToDay(item.date)}
              style={styles.goButton}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} gününü Planlarım ekranında aç`}
            >
              <LinearGradient
                colors={theme.accentGradient as [string, string]}
                style={styles.goButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.goButtonText}>📅 Bu güne git</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [expandedDates, theme, toggleDay, goToDay]);

  if (months.length === 0) {
    return (
      <LinearGradient colors={theme.primaryGradient} style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗂️</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Geçmiş henüz boş</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Geçmiş günlerde kayıtlı görevin olduğunda burada ay ay listelenecek.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.primaryGradient} style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.date}
        renderItem={renderDay}
        stickySectionHeadersEnabled
        // Yıllarca veri olabilir; sanallaştırma ayarları listeyi hafif tutar.
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View
            style={[styles.summaryCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            accessible
            accessibilityLabel={`Geçmiş özeti: ${summary.dayCount} gün, ${summary.monthCount} ay, ${summary.completed} / ${summary.total} görev tamamlandı.`}
          >
            <Text style={[styles.summaryTitle, { color: theme.text }]}>🗂️ Geçmiş</Text>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
              {summary.dayCount} gün · {summary.monthCount} ay · {summary.completed}/{summary.total} görev
              {summary.total > 0 ? ` · %${summary.percentage}` : ''}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.monthHeader, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.monthLabel, { color: theme.text }]}>{section.label}</Text>
            <Text style={[styles.monthMeta, { color: theme.textSecondary }]}>
              {section.days.length} gün · {section.completed}/{section.total} · %{section.percentage}
            </Text>
          </View>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  monthMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  dayCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  taskList: {
    marginTop: 14,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskCheck: {
    fontSize: 13,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 13,
    flex: 1,
  },
  goButton: {
    marginTop: 6,
  },
  goButtonGradient: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
