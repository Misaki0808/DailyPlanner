import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { formatDateDisplay, getToday, addDays, generateId } from '../utils/dateUtils';
import { Task } from '../types';
import { convertParagraphToTasks, checkApiKey } from '../utils/aiService';
import CalendarModal from '../components/CalendarModal';
import SuccessModal from '../components/SuccessModal';
import VoiceInputButton from '../components/VoiceInputButton';
import { createSharedStyles } from '../utils/sharedStyles';
import TaskEditModal from '../components/TaskEditModal';
import { getCategoryEmoji, getCategoryLabel, getCategoryColor } from '../utils/categories';

export default function CreatePlanScreen() {
  const { plans, savePlan, settings, theme, recurringTasks, aboutMe } = useApp();
  const themed = createSharedStyles(theme);

  // State'ler
  const [selectedDate, setSelectedDate] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [paragraphInput, setParagraphInput] = useState(''); // AI için paragraf
  const [isAiLoading, setIsAiLoading] = useState(false); // AI yükleniyor mu?
  const [showCalendar, setShowCalendar] = useState(false); // Takvim modal
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Başarı modal
  const [savedDate, setSavedDate] = useState('');
  const [editingNoteTaskId, setEditingNoteTaskId] = useState<string | null>(null);
  const voiceBaseTextRef = useRef(''); // Sesli giriş öncesi mevcut metin

  // İlk açılışta default tarihi belirle - boş gün bulana kadar ilerle
  useEffect(() => {
    const findFirstEmptyDate = () => {
      let currentDate = getToday();
      let daysChecked = 0;
      const maxDays = 365; // Maksimum 1 yıl ileri bak

      // Boş gün bulana kadar ilerle
      while (daysChecked < maxDays) {
        if (!plans[currentDate] || plans[currentDate].length === 0) {
          return currentDate; // Boş gün bulundu
        }
        // Bir sonraki güne geç
        currentDate = addDays(currentDate, 1);
        daysChecked++;
      }

      // Hiç boş gün bulunamadıysa bugünü döndür
      return getToday();
    };

    setSelectedDate(findFirstEmptyDate());
  }, [plans]);

  // Manuel görev ekle
  const handleAddTask = () => {
    if (taskInput.trim() === '') {
      Alert.alert('Uyarı', 'Lütfen bir görev yazın');
      return;
    }

    const newTask: Task = {
      id: generateId(),
      title: taskInput.trim(),
      done: false,
      priority: selectedPriority,
      category: 'diger',
    };

    setTasks([...tasks, newTask]);
    setTaskInput('');
    setSelectedPriority('low');
  };

  // Görev sil
  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  // Görev priority değiştir (döngüsel: low -> medium -> high -> low)
  const handleChangePriority = (taskId: string) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        const nextPriority =
          task.priority === 'low' ? 'medium' :
            task.priority === 'medium' ? 'high' :
              'low';
        return { ...task, priority: nextPriority };
      }
      return task;
    }));
  };

  // Planı kaydet
  const handleSavePlan = async () => {
    if (tasks.length === 0) {
      Alert.alert('Uyarı', 'En az bir görev eklemelisiniz');
      return;
    }

    try {
      await savePlan(selectedDate, tasks);
      // Başarı modal'ını göster
      setSavedDate(selectedDate);
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Hata', 'Plan kaydedilemedi');
    }
  };

  // Success modal kapatıldığında formu temizle
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Formu temizle
    setTasks([]);
    setTaskInput('');
    setParagraphInput('');
    setSelectedPriority('low');
    // Yeni boş gün bul
    const findFirstEmptyDate = () => {
      let currentDate = addDays(getToday(), 0);
      let daysChecked = 0;
      const maxDays = 365;

      while (daysChecked < maxDays) {
        if (!plans[currentDate] || plans[currentDate].length === 0) {
          return currentDate;
        }
        currentDate = addDays(currentDate, 1);
        daysChecked++;
      }
      return getToday();
    };
    setSelectedDate(findFirstEmptyDate());
  };

  // Takvim modaldan tarih seç
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  // Dolu günleri al (plan var)
  const getOccupiedDates = (): string[] => {
    return Object.keys(plans).filter(date => plans[date].length > 0);
  };

  // AI ile görev oluştur
  const handleAiGenerate = async () => {
    if (paragraphInput.trim() === '') {
      Alert.alert('Uyarı', 'Lütfen bir paragraf yazın');
      return;
    }

    if (!checkApiKey()) {
      Alert.alert('Hata', 'API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.');
      return;
    }

    setIsAiLoading(true);

    try {
      const aiTasks = await convertParagraphToTasks(paragraphInput, aboutMe || undefined);

      // AI'dan gelen görevleri Task formatına çevir (kategori atamalı)
      const newTasks: Task[] = aiTasks.map((item) => ({
        id: generateId(),
        title: item.title,
        done: false,
        priority: 'low' as const,
        category: item.category,
      }));

      setTasks([...tasks, ...newTasks]);
      setParagraphInput(''); // Paragrafı temizle

      Alert.alert('Başarılı', `${aiTasks.length} görev oluşturuldu! 🎉`);
    } catch (error: any) {
      Alert.alert('AI Hatası', error.message || 'Görevler oluşturulamadı');
    } finally {
      setIsAiLoading(false);
    }
  };

  const priorityColors = {
    low: theme.priorityLow,
    medium: theme.priorityMedium,
    high: theme.priorityHigh,
  };

  return (
    <LinearGradient
      colors={theme.primaryGradient}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Tarih Seçici */}
          <View style={styles.dateSection}>
            <Text style={[styles.label, { color: theme.text }]}>📅 Tarih Seçin</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowCalendar(true)}>
              <LinearGradient
                colors={theme.accentGradient}
                style={styles.dateGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
                <View style={styles.changeDateBadge}>
                  <Text style={styles.changeDateText}>Değiştir</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* AI Paragraf Input */}
          {
            <View style={styles.aiSection}>
              <Text style={[styles.label, { color: theme.text }]}>✨ Planınızı Yazın</Text>
              <View style={[themed.glassCardNoBorder, { borderWidth: 0 }]}>
                <TextInput
                  style={[styles.paragraphInput, { color: theme.text }]}
                  placeholder="Örn: Sabah 7'de kalkıp kahvaltı yapacağım..."
                  placeholderTextColor={theme.textMuted}
                  value={paragraphInput}
                  onChangeText={(text) => {
                    setParagraphInput(text);
                    voiceBaseTextRef.current = text;
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  underlineColorAndroid="transparent"
                />
                {/* Alt kısım: Mikrofon + Gönder butonları */}
                <View style={styles.inputActions}>
                  <VoiceInputButton
                    onTranscript={(transcript, isFinal) => {
                      const base = voiceBaseTextRef.current;
                      const separator = base.length > 0 && !base.endsWith(' ') ? ' ' : '';
                      const newText = base + separator + transcript;
                      setParagraphInput(newText);
                      if (isFinal) {
                        voiceBaseTextRef.current = newText;
                      }
                    }}
                    disabled={isAiLoading}
                  />
                  <TouchableOpacity
                    onPress={handleAiGenerate}
                    disabled={isAiLoading || paragraphInput.trim() === ''}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={isAiLoading || paragraphInput.trim() === '' ? [theme.accentLight, theme.accentLight] : (theme.accentGradient as [string, string])}
                      style={styles.sendButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isAiLoading ? (
                        <ActivityIndicator size="small" color={theme.textOnGradient} />
                      ) : (
                        <Text style={[styles.sendIcon, { color: theme.textOnGradient }]}>➜</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          }

          {/* Manuel Görev Ekleme */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.text }]}>✏️ Manuel Görev Ekle</Text>

            {/* Öncelik Seçici */}
            <View style={styles.prioritySelector}>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  selectedPriority === 'low' && styles.priorityButtonActive,
                  { backgroundColor: selectedPriority === 'low' ? theme.priorityLow : `${theme.priorityLow}40` }
                ]}
                onPress={() => setSelectedPriority('low')}
              >
                <View style={styles.priorityButtonContent}>
                  <Text style={styles.priorityEmoji}>🟢</Text>
                  <Text style={[styles.priorityText, { color: '#ffffff' }]}>Düşük</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  selectedPriority === 'medium' && styles.priorityButtonActive,
                  { backgroundColor: selectedPriority === 'medium' ? theme.priorityMedium : `${theme.priorityMedium}40` }
                ]}
                onPress={() => setSelectedPriority('medium')}
              >
                <View style={styles.priorityButtonContent}>
                  <Text style={styles.priorityEmoji}>🟡</Text>
                  <Text style={[styles.priorityText, { color: '#ffffff' }]}>Orta</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  selectedPriority === 'high' && styles.priorityButtonActive,
                  { backgroundColor: selectedPriority === 'high' ? theme.priorityHigh : `${theme.priorityHigh}40` }
                ]}
                onPress={() => setSelectedPriority('high')}
              >
                <View style={styles.priorityButtonContent}>
                  <Text style={styles.priorityEmoji}>🔴</Text>
                  <Text style={[styles.priorityText, { color: '#ffffff' }]}>Yüksek</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <View style={[themed.glassCardNoBorder, { flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Örn: Alışverişe git"
                  placeholderTextColor={theme.textMuted}
                  value={taskInput}
                  onChangeText={setTaskInput}
                  onSubmitEditing={handleAddTask}
                  returnKeyType="done"
                />
                <VoiceInputButton
                  mode="task"
                  onTranscript={(text) => setTaskInput(text)}
                />
              </View>
              <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
                <LinearGradient
                  colors={theme.accentGradient}
                  style={styles.addButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.addButtonText}>+</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Görev Listesi */}
          {tasks.length > 0 && (
            <View style={styles.taskListSection}>
              <Text style={[styles.label, { color: theme.text }]}>📝 Görevler ({tasks.length})</Text>
              {tasks.map((task, index) => {
                const priorityColor = priorityColors[task.priority || 'low'];

                return (
                  <View key={task.id} style={styles.taskItem}>
                    <View style={[themed.glassCardNoBorder, { borderLeftWidth: 4, borderLeftColor: priorityColor }]}>
                      <View style={styles.taskContent}>
                        <TouchableOpacity
                          style={[styles.taskNumberBadge, { backgroundColor: priorityColor }]}
                          onPress={() => handleChangePriority(task.id)}
                        >
                          <Text style={styles.taskNumber}>{index + 1}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => setEditingNoteTaskId(task.id)}
                        >
                          <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title}</Text>
                          {task.category && (
                            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(task.category) + '25' }]}>
                              <Text style={[styles.categoryBadgeText, { color: getCategoryColor(task.category) }]}>
                                {getCategoryEmoji(task.category)} {getCategoryLabel(task.category)}
                              </Text>
                            </View>
                          )}
                          {task.note && <Text style={[styles.taskNoteHint, { color: theme.textMuted }]}>📝 {task.note}</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRemoveTask(task.id)}
                          style={[styles.removeButton, { backgroundColor: `${theme.error}20` }]}
                        >
                          <Text style={[styles.removeButtonText, { color: theme.error }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Görev Düzenleme Modalı */}
          <TaskEditModal
            visible={editingNoteTaskId !== null}
            task={tasks.find(t => t.id === editingNoteTaskId) || { id: '', title: '', done: false }}
            onSave={(updates) => {
              if (editingNoteTaskId) {
                setTasks(prev => prev.map(t => {
                  if (t.id !== editingNoteTaskId) return t;
                  const updated = { ...t };
                  if (updates.title) updated.title = updates.title;
                  if (updates.note !== undefined) updated.note = updates.note;
                  if (updates.category) updated.category = updates.category;
                  return updated;
                }));
              }
            }}
            onClose={() => setEditingNoteTaskId(null)}
          />

          {/* Kaydet Butonu */}
          <TouchableOpacity
            style={[styles.saveButton, tasks.length === 0 && styles.saveButtonDisabled]}
            onPress={handleSavePlan}
            disabled={tasks.length === 0}
          >
            <LinearGradient
              colors={tasks.length === 0 ? [theme.textMuted, theme.textMuted] : (theme.successGradient as [string, string])}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveButtonText}>💾 Planı Kaydet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Takvim Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        onSelectDate={handleDateSelect}
        occupiedDates={getOccupiedDates()}
      />

      {/* Başarı Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        date={formatDateDisplay(savedDate)}
        taskCount={tasks.length}
        settings={settings}
      />
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  dateSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  dateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dateGradient: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  changeDateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  aiSection: {
    marginBottom: 20,
  },
  paragraphInput: {
    fontSize: 16,
    minHeight: 100,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputSection: {
    marginBottom: 20,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  priorityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityEmoji: {
    fontSize: 14,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    fontSize: 16,
    flex: 1,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '600',
  },
  taskListSection: {
    marginBottom: 20,
  },
  taskItem: {
    marginBottom: 12,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontWeight: '500',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonGradient: {
    padding: 20,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  taskNoteHint: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
