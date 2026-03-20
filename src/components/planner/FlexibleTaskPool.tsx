import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RecurringTask } from '../../types';

interface FlexibleTaskProgress extends RecurringTask {
  currentCount: number;
  isAddedToday: boolean;
}

interface FlexibleTaskPoolProps {
  flexibleProgress: FlexibleTaskProgress[];
  onAddFlexibleTask: (title: string, priority: 'low' | 'medium' | 'high') => void;
}

export default function FlexibleTaskPool({
  flexibleProgress,
  onAddFlexibleTask,
}: FlexibleTaskPoolProps) {
  if (flexibleProgress.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        🏊‍♂️ ESNEK GÖREV HAVUZU (Bu Hafta)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {flexibleProgress.map(fp => {
          const target = fp.flexibleTarget || 0;
          const isDone = fp.currentCount >= target;
          return (
            <View key={fp.id} style={[
              styles.card,
              fp.isAddedToday && { borderColor: '#43e97b', borderWidth: 1 }
            ]}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{fp.title}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{fp.currentCount}/{target}</Text>
                </View>
              </View>
              {!fp.isAddedToday && !isDone && (
                <TouchableOpacity style={styles.addBtn} onPress={() => onAddFlexibleTask(fp.title, fp.priority)}>
                  <LinearGradient colors={['#fa709a', '#fee140']} style={styles.addBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.addBtnText}>Bugüne Ekle</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {fp.isAddedToday && (
                <Text style={styles.addedText}>✅ Bugüne eklendi</Text>
              )}
              {isDone && !fp.isAddedToday && (
                <Text style={styles.addedText}>🎉 Hedef tamam!</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    paddingHorizontal: 5,
  },
  title: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 5,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    width: 200,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addBtn: {
    marginTop: 4,
  },
  addBtnGradient: {
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addedText: {
    color: '#43e97b',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
