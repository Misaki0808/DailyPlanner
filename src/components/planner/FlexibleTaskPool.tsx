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
import { useApp } from '../../context/AppContext';

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
  const { theme } = useApp();
  if (flexibleProgress.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>
        🏊‍♂️ ESNEK GÖREV HAVUZU (Bu Hafta)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {flexibleProgress.map(fp => {
          const target = fp.flexibleTarget || 0;
          const isDone = fp.currentCount >= target;
          return (
            <View key={fp.id} style={[
              styles.card,
              { backgroundColor: theme.cardBackground },
              fp.isAddedToday && { borderColor: theme.success, borderWidth: 1 }
            ]}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{fp.title}</Text>
                <View style={[styles.badge, { backgroundColor: theme.accentLight }]}>
                  <Text style={[styles.badgeText, { color: theme.text }]}>{fp.currentCount}/{target}</Text>
                </View>
              </View>
              {!fp.isAddedToday && !isDone && (
                <TouchableOpacity style={styles.addBtn} onPress={() => onAddFlexibleTask(fp.title, fp.priority)}>
                  <LinearGradient colors={theme.accentGradient} style={styles.addBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.addBtnText}>Bugüne Ekle</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {fp.isAddedToday && (
                <Text style={[styles.addedText, { color: theme.success }]}>✅ Bugüne eklendi</Text>
              )}
              {isDone && !fp.isAddedToday && (
                <Text style={[styles.addedText, { color: theme.success }]}>🎉 Hedef tamam!</Text>
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
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
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
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
