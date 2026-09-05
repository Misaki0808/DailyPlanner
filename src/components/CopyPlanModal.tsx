import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '../types';
import { clampDayToMonth, getDaysInMonth, toDateString } from '../utils/dateUtils';

interface CopyPlanModalProps {
  visible: boolean;
  onClose: () => void;
  sourceTasks: Task[];
  sourceDate: string;
  onCopy: (targetDate: string, selectedTasks: Task[]) => void;
}

export default function CopyPlanModal({
  visible,
  onClose,
  sourceTasks,
  sourceDate,
  onCopy,
}: CopyPlanModalProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>(
    sourceTasks.map(task => task.id)
  );
  
  // Modal açıldığında veya kaynak görevler değiştiğinde tüm görevleri seçili yap
  useEffect(() => {
    if (visible) {
      setSelectedTasks(sourceTasks.map(task => task.id));
    }
  }, [visible, sourceTasks]);

  const [targetYear, setTargetYear] = useState(() => new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState(() => new Date().getMonth() + 1);
  const [targetDay, setTargetDay] = useState(() => new Date().getDate());

  // Hedef tarih her açılışta bugüne alınır. State yalnız mount'ta kurulsaydı,
  // uygulama açık kalıp gece yarısı geçtiğinde hedef dün olarak kalırdı.
  useEffect(() => {
    if (!visible) return;
    const today = new Date();
    setTargetYear(today.getFullYear());
    setTargetMonth(today.getMonth() + 1);
    setTargetDay(today.getDate());
  }, [visible]);

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleCopy = () => {
    if (selectedTasks.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir görev seçin.');
      return;
    }

    // toDateString günü ayın uzunluğuna kırpar; "2026-02-31" gibi var olmayan
    // bir tarihe kopyalama yapılamaz.
    const targetDate = toDateString(targetYear, targetMonth, targetDay);
    const tasksTosCopy = sourceTasks.filter(task => selectedTasks.includes(task.id));
    onCopy(targetDate, tasksTosCopy);
    onClose();
  };

  const daysInMonth = getDaysInMonth(targetYear, targetMonth);

  /**
   * Ay veya yıl değiştiğinde gün ayın son gününü aşabilir (31 Ocak → Şubat).
   * Gün her zaman birlikte kırpılır, aksi halde geçersiz tarih üretilir.
   */
  const setTargetMonthAndYear = (month: number, year: number) => {
    setTargetMonth(month);
    setTargetYear(year);
    setTargetDay(prev => clampDayToMonth(year, month, prev));
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            style={styles.modalGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Plan Kopyala</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Kaynak Bilgi */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Kaynak Tarih:</Text>
              <Text style={styles.infoValue}>{sourceDate}</Text>
            </View>

            {/* Görev Seçimi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kopyalanacak Görevler</Text>
              <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
                {sourceTasks.map((task, index) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskItem,
                      selectedTasks.includes(task.id) && styles.taskItemSelected
                    ]}
                    onPress={() => toggleTask(task.id)}
                  >
                    <View style={styles.checkbox}>
                      {selectedTasks.includes(task.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.taskNumber}>{index + 1}.</Text>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Hedef Tarih Seçimi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hedef Tarih</Text>
              <View style={styles.datePickerContainer}>
                {/* Yıl */}
                <View style={styles.dateUnit}>
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => setTargetMonthAndYear(targetMonth, targetYear + 1)}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateValue}>{targetYear}</Text>
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => setTargetMonthAndYear(targetMonth, targetYear - 1)}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Ay */}
                <View style={styles.dateUnit}>
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      if (targetMonth === 12) {
                        setTargetMonthAndYear(1, targetYear + 1);
                      } else {
                        setTargetMonthAndYear(targetMonth + 1, targetYear);
                      }
                    }}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateValue}>{targetMonth}</Text>
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      if (targetMonth === 1) {
                        setTargetMonthAndYear(12, targetYear - 1);
                      } else {
                        setTargetMonthAndYear(targetMonth - 1, targetYear);
                      }
                    }}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Gün */}
                <View style={styles.dateUnit}>
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      if (targetDay >= daysInMonth) {
                        // Sonraki ayın ilk günü
                        const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
                        const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
                        setTargetMonth(nextMonth);
                        setTargetYear(nextYear);
                        setTargetDay(1);
                      } else {
                        setTargetDay(targetDay + 1);
                      }
                    }}
                  >
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateValue}>{targetDay}</Text>
                  <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => {
                      if (targetDay === 1) {
                        // Önceki ayın son günü
                        const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
                        const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
                        setTargetMonth(prevMonth);
                        setTargetYear(prevYear);
                        setTargetDay(getDaysInMonth(prevYear, prevMonth));
                      } else {
                        setTargetDay(targetDay - 1);
                      }
                    }}
                  >
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Butonlar */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  style={styles.copyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.copyButtonText}>
                    Kopyala ({selectedTasks.length})
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  taskList: {
    maxHeight: 150,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  dateUnit: {
    alignItems: 'center',
  },
  arrowButton: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  arrowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dateValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginVertical: 8,
    minWidth: 60,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  copyButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  copyButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
