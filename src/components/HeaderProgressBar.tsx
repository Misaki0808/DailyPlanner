import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlansContext, useSettingsContext } from '../context/AppContext';
import { getToday } from '../utils/dateUtils';
import { Task } from '../types';

export const HeaderProgressBar = () => {
  const { plans } = usePlansContext();
  const { theme } = useSettingsContext();
  const today = getToday();
  const todayTasks = plans[today] || [];
  
  if (todayTasks.length === 0) return null;

  const completedCount = todayTasks.filter((t: Task) => t.done).length;
  const totalCount = todayTasks.length;
  
  // Yüzdelik hesaplama (priority'ye göre ağırlıklı)
  const totalWeight = todayTasks.reduce((sum: number, task: Task) => {
    const weight = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
    return sum + weight;
  }, 0);
  
  const completedWeight = todayTasks
    .filter((task: Task) => task.done)
    .reduce((sum: number, task: Task) => {
      const weight = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
      return sum + weight;
    }, 0);
    
  const progress = totalWeight === 0 ? 0 : completedWeight / totalWeight;

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={[styles.text, { color: theme.textSecondary }]}>İlerleme:</Text>
        <Text style={[styles.textValue, { color: theme.accent }]}>{Math.round(progress * 100)}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    marginRight: 10,
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '500',
  },
  textValue: {
    fontSize: 10,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
