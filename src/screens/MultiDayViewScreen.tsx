import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { formatDateDisplay, getToday, addDays } from '../utils/dateUtils';
import { Task } from '../types';
import CopyPlanModal from '../components/CopyPlanModal';
import ConfirmModal from '../components/ConfirmModal';

export default function MultiDayViewScreen() {
  const { plans, updateTask, refreshPlans, savePlan, deletePlan, settings } = useApp();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [isEditMode, setIsEditMode] = useState(false); // Düzenleme modu
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false); // Kopyalama modal
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false); // Silme onay modal

  // Seçilen tarih değiştiğinde görevleri güncelle
  useEffect(() => {
    loadTasks();
  }, [selectedDate, plans]);

  // Görevleri yükle
  const loadTasks = () => {
    const tasks = plans[selectedDate] || [];
    setCurrentTasks(tasks);
  };

  // Görev durumunu değiştir (checkbox)
  const toggleTaskDone = async (taskId: string, currentDone: boolean) => {
    try {
      await updateTask(selectedDate, taskId, !currentDone);
      await refreshPlans();
    } catch (error) {
      console.error('Görev güncellenirken hata:', error);
    }
  };

  // Tarih değiştir
  const changeDate = (days: number) => {
    const newDate = addDays(selectedDate, days);
    setSelectedDate(newDate);
  };

  // Tamamlanma durumu
  const completedCount = currentTasks.filter(task => task.done).length;
  const totalCount = currentTasks.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  // Yüzdelik hesaplama (priority'ye göre ağırlıklı)
  const calculatePercentage = () => {
    if (totalCount === 0) return 0;
    
    const totalWeight = currentTasks.reduce((sum, task) => {
      const weight = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
      return sum + weight;
    }, 0);
    
    const completedWeight = currentTasks
      .filter(task => task.done)
      .reduce((sum, task) => {
        const weight = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
        return sum + weight;
      }, 0);
    
    return Math.round((completedWeight / totalWeight) * 100);
  };

  const percentage = calculatePercentage();

  // Görev sil (edit mode)
  const handleRemoveTask = async (taskId: string) => {
    const updatedTasks = currentTasks.filter(task => task.id !== taskId);
    await savePlan(selectedDate, updatedTasks);
    await refreshPlans();
  };

  // Priority değiştir (edit mode)
  const handleChangePriority = async (taskId: string) => {
    const updatedTasks = currentTasks.map(task => {
      if (task.id === taskId) {
        const nextPriority: 'low' | 'medium' | 'high' = 
          task.priority === 'low' ? 'medium' :
          task.priority === 'medium' ? 'high' :
          'low';
        return { ...task, priority: nextPriority };
      }
      return task;
    });
    await savePlan(selectedDate, updatedTasks);
    await refreshPlans();
  };

  // Tüm günü sil
  const handleDeleteDay = async () => {
    // Ayarlarda "daima sor" aktifse onay iste
    if (settings?.askBeforeDeleteAll) {
      // Web'de custom modal, native'de Alert kullan
      if (Platform.OS === 'web') {
        setIsDeleteConfirmVisible(true);
      } else {
        Alert.alert(
          'Tüm Planları Sil',
          `${formatDateDisplay(selectedDate)} tarihindeki tüm görevleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
          [
            { text: 'İptal', style: 'cancel' },
            { 
              text: 'Sil', 
              style: 'destructive', 
              onPress: confirmDelete
            }
          ]
        );
      }
    } else {
      // Ayar kapalıysa direkt sil
      await confirmDelete();
    }
  };

  // Silme onaylandıktan sonra
  const confirmDelete = async () => {
    await deletePlan(selectedDate);
    setCurrentTasks([]);
    setIsEditMode(false);
    setIsDeleteConfirmVisible(false);
  };

  // Planı kopyala
  const handleCopyPlan = async (targetDate: string, selectedTasks: Task[]) => {
    const existingTasks = plans[targetDate] || [];
    
    // Yeni görevlere benzersiz ID ver
    const newTasks = selectedTasks.map(task => ({
      ...task,
      id: Date.now().toString() + Math.random().toString(),
      done: false, // Kopyalanan görevler tamamlanmamış olarak başlasın
    }));

    // Mevcut görevlerle birleştir
    const allTasks = [...existingTasks, ...newTasks];
    await savePlan(targetDate, allTasks);
    await refreshPlans();
    
    Alert.alert(
      'Başarılı',
      `${selectedTasks.length} görev ${targetDate} tarihine kopyalandı.`,
      [{ text: 'Tamam' }]
    );
  };

  return (
    <LinearGradient
      colors={['#4facfe', '#00f2fe', '#43e97b']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.container}>
        {/* Tarih Navigasyonu */}
        <View style={styles.dateNavigation}>
          <View style={styles.glassCard}>
            <View style={styles.navigationContent}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => changeDate(-1)}
              >
                <Text style={styles.navButtonText}>←</Text>
              </TouchableOpacity>
              
              <View style={styles.currentDateContainer}>
                <Text style={styles.currentDate}>{formatDateDisplay(selectedDate)}</Text>
                {selectedDate === getToday() && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>BUGÜN</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => changeDate(1)}
              >
                <Text style={styles.navButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Buton Grubu */}
          {totalCount > 0 && (
            <View style={styles.buttonGroup}>
              {/* Düzenleme Butonu */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsEditMode(!isEditMode)}
              >
                <LinearGradient
                  colors={isEditMode ? ['#f093fb', '#f5576c'] : ['#667eea', '#764ba2']}
                  style={styles.actionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.actionButtonText}>
                    {isEditMode ? '✓ Bitti' : '⚙️ Düzenle'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Kopyalama Butonu */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsCopyModalVisible(true)}
              >
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={styles.actionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.actionButtonText}>📋 Kopyala</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Günü Sil Butonu (Edit Mode'da) */}
              {isEditMode && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteDay}
                >
                  <LinearGradient
                    colors={['#ff6b6b', '#ee5a6f']}
                    style={styles.deleteButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* İstatistik */}
        {totalCount > 0 && (
          <View style={styles.statsSection}>
            <View style={styles.glassCard}>
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
        )}

        {/* Görev Listesi */}
        <ScrollView style={styles.taskList}>
          {currentTasks.length === 0 ? (
            // Boş State
            <View style={styles.emptyState}>
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>📭</Text>
                <Text style={styles.emptyStateTitle}>Bu gün için plan yok</Text>
                <Text style={styles.emptyStateSubtitle}>
                  "Plan Oluştur" sekmesinden yeni plan ekleyebilirsiniz
                </Text>
              </View>
            </View>
          ) : (
            currentTasks.map((task, index) => {
                const priorityColor = 
                  task.priority === 'high' ? '#F44336' :
                task.priority === 'medium' ? '#FFC107' :
                '#4CAF50';
              
              return (
              <View key={task.id} style={styles.taskItemWrapper}>
                <View style={[styles.glassCard, { borderLeftWidth: 4, borderLeftColor: priorityColor }]}>
                  <TouchableOpacity
                    style={styles.taskItem}
                    onPress={() => !isEditMode && toggleTaskDone(task.id, task.done)}
                    activeOpacity={0.7}
                    disabled={isEditMode}
                  >
                    {/* Checkbox */}
                    {!isEditMode && (
                      <View style={[styles.checkbox, task.done && styles.checkboxChecked]}>
                        {task.done && (
                          <LinearGradient
                            colors={['#4facfe', '#00f2fe']}
                            style={styles.checkboxGradient}
                          >
                            <Text style={styles.checkmark}>✓</Text>
                          </LinearGradient>
                        )}
                      </View>
                    )}
                    
                    {/* Görev Numarası ve Başlığı */}
                    <View style={styles.taskContent}>
                      <TouchableOpacity
                        style={[styles.taskNumberBadge, { backgroundColor: priorityColor }]}
                        onPress={() => isEditMode && handleChangePriority(task.id)}
                        disabled={!isEditMode}
                      >
                        <Text style={styles.taskNumber}>{index + 1}</Text>
                      </TouchableOpacity>
                      <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
                        {task.title}
                      </Text>
                    </View>

                    {/* Silme Butonu (Edit Mode) */}
                    {isEditMode && (
                      <TouchableOpacity
                        onPress={() => handleRemoveTask(task.id)}
                        style={styles.removeButton}
                      >
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )})
          )}
        </ScrollView>

        {/* Kopyalama Modal */}
        <CopyPlanModal
          visible={isCopyModalVisible}
          onClose={() => setIsCopyModalVisible(false)}
          sourceTasks={currentTasks}
          sourceDate={formatDateDisplay(selectedDate)}
          onCopy={handleCopyPlan}
        />

        {/* Silme Onay Modal (Web için) */}
        <ConfirmModal
          visible={isDeleteConfirmVisible}
          title="Tüm Planları Sil"
          message={`${formatDateDisplay(selectedDate)} tarihindeki tüm görevleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
          confirmText="Sil"
          cancelText="İptal"
          destructive={true}
          onConfirm={confirmDelete}
          onCancel={() => setIsDeleteConfirmVisible(false)}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  dateNavigation: {
    padding: 16,
  },
  navigationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
  currentDateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  currentDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  todayBadge: {
    backgroundColor: 'rgba(67, 233, 123, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  deleteButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
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
  taskList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyStateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  emptyStateIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  taskItemWrapper: {
    marginBottom: 12,
  },
  taskItem: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  checkboxChecked: {
    borderColor: 'transparent',
  },
  checkboxGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(79, 172, 254, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 87, 108, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

