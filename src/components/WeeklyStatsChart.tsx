import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '../types';
import { buildWeeklyStats } from '../utils/weeklyStats';
import { useTheme } from '../context/AppContext';

interface WeeklyStatsChartProps {
    plans: Record<string, Task[]>;
}

export default function WeeklyStatsChart({ plans }: WeeklyStatsChartProps) {
    const theme = useTheme();

    const chartData = useMemo(() => buildWeeklyStats(plans), [plans]);

    const MAX_HEIGHT = 120;

    return (
        <View style={[styles.container, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>📊 Haftalık Performans</Text>

            <View style={styles.chartArea}>
                {chartData.map((d, index) => {
                    const barHeight = Math.max(10, (d.percentage / 100) * MAX_HEIGHT);

                    return (
                        <View key={index} style={styles.barColumn}>
                            <View style={styles.metricsLabel}>
                                <Text style={[styles.metricsText, { color: theme.textSecondary }]}>{d.completed}/{d.total}</Text>
                            </View>

                            <View style={[styles.barTrack, { backgroundColor: theme.accentLight }]}>
                                <LinearGradient
                                    colors={d.percentage >= 100 && d.total > 0 ? (theme.successGradient as [string, string]) : (theme.accentGradient as [string, string])}
                                    style={[styles.barFill, { height: barHeight }]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 0, y: 0 }}
                                />
                            </View>

                            <Text style={[styles.dayLabel, { color: theme.textMuted }, d.isToday && { color: theme.text, fontWeight: '800' }]}>
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
        borderRadius: 20,
        padding: 20,
        marginVertical: 15,
        borderWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
    },
    chartArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 160,
        paddingTop: 20,
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
        fontWeight: '600',
    },
    barTrack: {
        width: 14,
        height: 120,
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
});
