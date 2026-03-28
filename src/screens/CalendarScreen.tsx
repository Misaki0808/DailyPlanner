import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { getCategoryColor, getCategoryEmoji, getCategoryLabel } from '../utils/categories';
import { Task } from '../types';
import TaskEditModal from '../components/TaskEditModal';
import { formatDateDisplay } from '../utils/dateUtils';
import { createSharedStyles } from '../utils/sharedStyles';

// Takvim Türkçe Dil Ayarları
LocaleConfig.locales['tr'] = {
  monthNames: [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

export default function CalendarScreen() {
  const { plans, theme, updateTask } = useApp();
  const themed = createSharedStyles(theme);
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingTask, setEditingTask] = useState<{ date: string; task: Task } | null>(null);

  // Takvimde gösterilecek renkli noktaları (dots) plans objesinden hesapla
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    Object.entries(plans).forEach(([date, tasks]) => {
      if (!tasks || tasks.length === 0) return;

      const dots = tasks.map((task, index) => ({
        key: `${task.id}-${index}`,
        color: getCategoryColor(task.category || 'diger')
      })).slice(0, 3); // Görüntü kirliliği olmaması için max 3 nokta gösterelim

      marks[date] = { dots };
    });

    // Seçili günü belirginleştir
    if (marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: theme.accent, selectedTextColor: '#fff' };
    } else {
      marks[selectedDate] = { selected: true, selectedColor: theme.accent, selectedTextColor: '#fff' };
    }

    return marks;
  }, [plans, selectedDate, theme.accent]);

  const selectedTasks = plans[selectedDate] || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Takvim Componenti */}
        <View style={styles.calendarWrapper}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markingType={'multi-dot'}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.background,
              calendarBackground: theme.cardBackground,
              textSectionTitleColor: theme.textSecondary,
              selectedDayBackgroundColor: theme.accent,
              selectedDayTextColor: '#ffffff',
              todayTextColor: theme.accent,
              dayTextColor: theme.text,
              textDisabledColor: theme.textMuted,
              dotColor: theme.accent,
              monthTextColor: theme.text,
              arrowColor: theme.accent,
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
            }}
            style={[styles.calendar, { borderColor: theme.border }]}
          />
        </View>

        {/* Seçili Günün Görevleri */}
        <View style={styles.tasksSection}>
          <Text style={[themed.sectionTitle, { color: theme.text, marginBottom: 16 }]}>
            📅 {formatDateDisplay(selectedDate)} Görevleri
          </Text>

          {selectedTasks.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={styles.emptyEmoji}>💤</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Bu gün için planlı bir görev yok.</Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {selectedTasks.map(task => (
                <View key={task.id} style={[themed.taskCard, { borderLeftColor: getCategoryColor(task.category || 'diger') }]}>
                  <TouchableOpacity
                    style={styles.taskCheckbox}
                    onPress={() => updateTask(selectedDate, task.id, { done: !task.done })}
                  >
                    <View style={[
                      styles.checkboxInner,
                      { borderColor: theme.border },
                      task.done && { backgroundColor: theme.success, borderColor: theme.success }
                    ]}>
                      {task.done && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.taskContent}>
                    <Text style={[
                      styles.taskTitle,
                      { color: theme.text },
                      task.done && { color: theme.textMuted, textDecorationLine: 'line-through' }
                    ]}>
                      {task.title}
                    </Text>
                    
                    <View style={styles.taskMetaRow}>
                      <View style={[styles.taskCategoryBadge, { backgroundColor: getCategoryColor(task.category || 'diger') + '20' }]}>
                        <Text style={styles.taskCategoryEmoji}>{getCategoryEmoji(task.category || 'diger')}</Text>
                        <Text style={[styles.taskCategoryLabel, { color: getCategoryColor(task.category || 'diger') }]}>
                          {getCategoryLabel(task.category || 'diger')}
                        </Text>
                      </View>
                      {task.note && <Text style={[styles.taskNoteIcon, { color: theme.textSecondary }]}>📝 Notlu</Text>}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: theme.accentLight }]}
                    onPress={() => setEditingTask({ date: selectedDate, task })}
                  >
                    <Text style={[styles.editButtonText, { color: theme.accent }]}>✎</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Görev Düzenleme Modalı */}
      {editingTask && (
        <TaskEditModal
          visible={!!editingTask}
          task={editingTask.task}
          onClose={() => setEditingTask(null)}
          onSave={async (updates) => {
            await updateTask(editingTask.date, editingTask.task.id, updates);
            setEditingTask(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarWrapper: {
    padding: 16,
    paddingTop: 8,
  },
  calendar: {
    borderRadius: 20,
    borderWidth: 1,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  tasksSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tasksList: {
    gap: 12,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskCheckbox: {
    padding: 12,
    paddingLeft: 16,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
    paddingVertical: 14,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  taskCategoryEmoji: {
    fontSize: 12,
  },
  taskCategoryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  taskNoteIcon: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  editButton: {
    padding: 12,
    marginRight: 8,
    borderRadius: 12,
    alignSelf: 'center',
  },
  editButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
