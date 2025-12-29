import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { getToday, formatDateDisplay } from '../utils/dateUtils';

const { width, height } = Dimensions.get('window');

export default function PlanOverviewScreen() {
  const { plans } = useApp();
  const [centerDate, setCenterDate] = useState(getToday());

  // Görüntülenecek 4 günü seç
  const surroundingDays = useMemo(() => {
    const allDates = Object.keys(plans).filter(date => date !== centerDate && plans[date].length > 0);
    
    const futureDates = allDates
      .filter(date => date > centerDate)
      .sort(); // Artan sıralama (en yakın gelecek)
      
    const pastDates = allDates
      .filter(date => date < centerDate)
      .sort((a, b) => b.localeCompare(a)); // Azalan sıralama (en yakın geçmiş)
      
    let selected = [...futureDates];
    
    // Eğer gelecek planlar 4'ten azsa, geçmişten tamamla
    if (selected.length < 4) {
      const needed = 4 - selected.length;
      selected = [...selected, ...pastDates.slice(0, needed)];
    }
    
    // Sadece ilk 4'ünü al
    return selected.slice(0, 4);
  }, [plans, centerDate]);

  const getPriorityWeight = (p?: string) => {
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    if (p === 'low') return 1;
    return 0;
  };

  const renderTaskPreview = (date: string, limit: number) => {
    const tasks = plans[date] || [];
    if (tasks.length === 0) return <Text style={styles.emptyText}>Plan yok</Text>;

    // Önceliğe göre sırala
    const sortedTasks = [...tasks].sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));

    return (
      <View>
        {sortedTasks.slice(0, limit).map((task, index) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={[
              styles.dot, 
              { backgroundColor: task.priority === 'high' ? '#ff6b6b' : task.priority === 'medium' ? '#feca57' : '#4CAF50' }
            ]} />
            <Text style={styles.taskText} numberOfLines={1}>{task.title}</Text>
          </View>
        ))}
        {tasks.length > limit && (
          <Text style={styles.moreText}>+ {tasks.length - limit} daha...</Text>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Çevresel Nodlar (Arka planda) */}
      {surroundingDays.map((date, index) => {
        const posStyle: ViewStyle = index === 0 ? { top: '12%', left: 20 } :
                        index === 1 ? { top: '12%', right: 20 } :
                        index === 2 ? { bottom: '12%', left: 20 } :
                        { bottom: '12%', right: 20 };

        return (
          <TouchableOpacity 
            key={date} 
            style={[styles.surroundingNode, posStyle]}
            onPress={() => setCenterDate(date)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
              style={styles.nodeGradient}
            >
              <Text style={styles.nodeDate}>{formatDateDisplay(date)}</Text>
              <View style={styles.nodeDivider} />
              {renderTaskPreview(date, 3)}
            </LinearGradient>
          </TouchableOpacity>
        );
      })}

      {/* Merkez (Seçili Gün) - En üstte */}
      <View style={styles.centerNodeContainer}>
        <View style={styles.centerNode}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
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
    width: width * 0.5,
    height: height * 0.32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
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
    width: width * 0.4,
    height: height * 0.2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  nodeDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    flex: 1,
  },
  moreText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});
