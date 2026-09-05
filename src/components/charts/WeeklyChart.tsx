import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plans } from '../../types';
import { buildWeeklyStats } from '../../utils/weeklyStats';
import { useTheme } from '../../context/AppContext';

interface WeeklyChartProps {
  plans: Plans;
}

const MAX_BAR_HEIGHT = 120;

/**
 * Son 7 günün tamamlanma durumunu gösteren TEK haftalık grafik.
 *
 * Daha önce iki ayrı bileşen vardı: Ayarlar'da çubuk grafiği
 * (WeeklyStatsChart), Genel Bakış modalinde çizgi grafiği
 * (WeeklyProgressChart). Çubuk biçimi korundu çünkü aynı alanda hem
 * tamamlanan hem toplam görevi gösterebiliyor, uygulamanın gradient/kart
 * diline uyuyor ve ek grafik kütüphanesi gerektirmiyor. Çizgi grafiğinden
 * gelen katkılar: haftalık toplam özeti ve her çubuğun ayın kaçıncı gününe
 * denk geldiğini söyleyen ikincil etiket.
 *
 * Günler `buildWeeklyStats` üzerinden YEREL tarihe göre anahtarlanır;
 * planlar da öyle saklanıyor (UTC'ye kayarsa çubuklar komşu günün verisini
 * gösterir).
 */
export default function WeeklyChart({ plans }: WeeklyChartProps) {
  const theme = useTheme();

  const days = useMemo(() => buildWeeklyStats(plans), [plans]);

  const { completed, total } = useMemo(
    () => days.reduce(
      (sum, day) => ({ completed: sum.completed + day.completed, total: sum.total + day.total }),
      { completed: 0, total: 0 }
    ),
    [days]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>📊 Haftalık Performans</Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>
          {total > 0 ? `${completed}/${total} görev` : 'Son 7 gün'}
        </Text>
      </View>

      {total === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Son 7 günde kayıtlı görev yok.
        </Text>
      ) : (
        <View style={styles.chartArea}>
          {days.map(day => {
            const isComplete = day.total > 0 && day.percentage >= 100;
            const barHeight = Math.max(10, (day.percentage / 100) * MAX_BAR_HEIGHT);

            return (
              <View
                key={day.date}
                style={styles.barColumn}
                accessible
                accessibilityLabel={
                  day.total > 0
                    ? `${day.dayName}: ${day.completed} / ${day.total} görev tamamlandı`
                    : `${day.dayName}: görev yok`
                }
              >
                <Text style={[styles.metricsText, { color: theme.textSecondary }]}>
                  {day.completed}/{day.total}
                </Text>

                <View style={[styles.barTrack, { backgroundColor: theme.accentLight }]}>
                  <LinearGradient
                    colors={isComplete ? (theme.successGradient as [string, string]) : (theme.accentGradient as [string, string])}
                    style={[styles.barFill, { height: barHeight }]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                  />
                </View>

                <Text
                  style={[
                    styles.dayLabel,
                    { color: theme.textMuted },
                    day.isToday && { color: theme.text, fontWeight: '800' },
                  ]}
                >
                  {day.dayName}
                </Text>
                {/* Hangi güne denk geldiğini ayın günüyle netleştirir */}
                <Text style={[styles.dateLabel, { color: theme.textMuted }]}>
                  {day.date.substring(8, 10)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginVertical: 15,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  summary: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 175,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  metricsText: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 8,
    height: 14,
  },
  barTrack: {
    width: 14,
    height: MAX_BAR_HEIGHT,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  dayLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  dateLabel: {
    marginTop: 2,
    fontSize: 10,
  },
});
