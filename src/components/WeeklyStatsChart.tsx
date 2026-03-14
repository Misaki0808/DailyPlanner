import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '../types';

interface WeeklyStatsChartProps {
    plans: Record<string, Task[]>;
}

export default function WeeklyStatsChart({ plans }: WeeklyStatsChartProps) {
    const chartData = useMemo(() => {
        const today = new Date();
        const data = [];

        // Son 7 gün için veri hazırla
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const dayName = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(date);

            const dayTasks = plans[dateString] || [];
            const total = dayTasks.length;
            const completed = dayTasks.filter(t => t.done).length;
            const percentage = total > 0 ? (completed / total) * 100 : 0;

            data.push({
                dayName,
                total,
                completed,
                percentage,
                isToday: i === 0,
            });
        }

        return data;
    }, [plans]);

    // Maksimum bar yüksekliği
    const MAX_HEIGHT = 120;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📊 Haftalık Performans</Text>

            <View style={styles.chartArea}>
                {chartData.map((d, index) => {
                    const barHeight = Math.max(10, (d.percentage / 100) * MAX_HEIGHT);

                    return (
                        <View key={index} style={styles.barColumn}>
                            <View style={styles.metricsLabel}>
                                <Text style={styles.metricsText}>{d.completed}/{d.total}</Text>
                            </View>

                            <View style={styles.barTrack}>
                                <LinearGradient
                                    colors={d.percentage >= 100 && d.total > 0 ? ['#00b09b', '#96c93d'] : ['#667eea', '#764ba2']}
                                    style={[styles.barFill, { height: barHeight }]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 0, y: 0 }}
                                />
                            </View>

                            <Text style={[styles.dayLabel, d.isToday && styles.todayLabel]}>
                                {d.dayName}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 20,
        marginVertical: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 20,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    chartArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 160, // Track height + labels + top metrics
        paddingTop: 20, // Metrics için boşluk
    },
    barColumn: {
        alignItems: 'center',
        width: 35,
    },
    metricsLabel: {
        marginBottom: 8,
        height: 14,
    },
    metricsText: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    barTrack: {
        width: 14,
        height: 120,
        backgroundColor: 'rgba(0,0,0,0.2)',
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
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
    todayLabel: {
        color: '#fff',
        fontWeight: '800',
    },
});
