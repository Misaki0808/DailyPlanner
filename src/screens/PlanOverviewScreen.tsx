import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { getToday, formatDateDisplay } from '../utils/dateUtils';

export default function PlanOverviewScreen() {
  const { plans, settings, theme } = useApp();
  const { width, height } = useWindowDimensions();
  const [centerDate, setCenterDate] = useState(getToday());

  const surroundingDays = useMemo(() => {
    const allDates = Object.keys(plans).filter(date => date !== centerDate && plans[date].length > 0);
    const futureDates = allDates.filter(date => date > centerDate).sort();
    const pastDates = allDates.filter(date => date < centerDate).sort((a, b) => b.localeCompare(a));
    let selected = [...futureDates];
    if (selected.length < 4) {
      const needed = 4 - selected.length;
      selected = [...selected, ...pastDates.slice(0, needed)];
    }
    return selected.slice(0, 4).sort();
  }, [plans, centerDate]);

  const getPriorityWeight = (p?: string) => {
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    if (p === 'low') return 1;
    return 0;
  };

  const renderTaskPreview = (date: string, limit: number) => {
    const tasks = plans[date] || [];
    if (tasks.length === 0) return <Text style={[styles.emptyText, { color: theme.textMuted }]}>Plan yok</Text>;
    const sortedTasks = [...tasks].sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
    return (
      <View>
        {sortedTasks.slice(0, limit).map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={[
              styles.dot,
              { backgroundColor: task.priority === 'high' ? theme.priorityHigh : task.priority === 'medium' ? theme.priorityMedium : theme.priorityLow }
            ]} />
            <Text style={[styles.taskText, { color: theme.textSecondary }]} numberOfLines={1}>{task.title}</Text>
          </View>
        ))}
        {tasks.length > limit && (
          <Text style={[styles.moreText, { color: theme.textMuted }]}>+ {tasks.length - limit} daha...</Text>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={theme.primaryGradient}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {surroundingDays.map((date, index) => {
        const posStyle: ViewStyle = index === 0 ? { top: '8%', left: 10 } :
          index === 1 ? { top: '8%', right: 10 } :
            index === 2 ? { bottom: '8%', left: 10 } :
              { bottom: '8%', right: 10 };

        return (
          <TouchableOpacity
            key={date}
            style={[styles.surroundingNode, { width: Math.min(width * 0.38, 160), height: Math.min(height * 0.2, 160), borderColor: theme.border }, posStyle]}
            onPress={() => setCenterDate(date)}
            activeOpacity={0.8}
          >
            <View style={[styles.nodeGradient, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.nodeDate, { color: theme.text }]}>{formatDateDisplay(date)}</Text>
              <View style={[styles.nodeDivider, { backgroundColor: theme.border }]} />
              {renderTaskPreview(date, 2)}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.centerNodeContainer}>
        <View style={[styles.centerNode, { width: Math.min(width * 0.55, 260), height: Math.min(height * 0.35, 280), borderColor: theme.border }]}>
          <LinearGradient
            colors={theme.accentGradient}
            style={styles.centerGradient}
          >
            <Text style={styles.centerTitle}>
              {centerDate === getToday() ? 'Bugün' : formatDateDisplay(centerDate).split(' ')[0]}
            </Text>
            <Text style={styles.centerDate}>{formatDateDisplay(centerDate)}</Text>
            <View style={styles.divider} />
            <ScrollView style={styles.centerScroll} showsVerticalScrollIndicator={false}>
              {renderTaskPreview(centerDate, 10)}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerNodeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  centerNode: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    pointerEvents: 'auto',
  },
  centerGradient: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  centerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  centerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  centerScroll: {
    width: '100%',
  },
  surroundingNode: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1,
  },
  nodeGradient: {
    flex: 1,
    padding: 12,
  },
  nodeDate: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  nodeDivider: {
    width: '100%',
    height: 1,
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  taskText: {
    fontSize: 12,
    flex: 1,
  },
  moreText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});
