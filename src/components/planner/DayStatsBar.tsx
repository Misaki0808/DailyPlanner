import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sharedStyles } from '../../utils/sharedStyles';

interface DayStatsBarProps {
  completedCount: number;
  totalCount: number;
  percentage: number;
  allCompleted: boolean;
}

export default function DayStatsBar({
  completedCount,
  totalCount,
  percentage,
  allCompleted,
}: DayStatsBarProps) {
  if (totalCount === 0) return null;

  return (
    <View style={styles.statsSection}>
      <View style={sharedStyles.glassCard}>
        <LinearGradient
          colors={allCompleted ? ['#4facfe', '#00f2fe'] : ['#f093fb', '#f5576c']}
          style={styles.statsGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statsContent}>
            <Text style={styles.statsText}>
              {completedCount} / {totalCount} görev tamamlandı
            </Text>
            <Text style={styles.percentageText}>%{percentage}</Text>
            {allCompleted && <Text style={styles.celebrationText}>🎉</Text>}
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  statsGradient: {
    padding: 12,
    borderRadius: 16,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  percentageText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  celebrationText: {
    fontSize: 20,
  },
});
