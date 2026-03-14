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
import { formatDateDisplay, getToday, addDays } from '../utils/dateUtils';
import { Task } from '../types';
import { convertParagraphToTasks, checkApiKey } from '../utils/aiService';
import CalendarModal from '../components/CalendarModal';
import SuccessModal from '../components/SuccessModal';
import VoiceInputButton from '../components/VoiceInputButton';
import NoteEditModal from '../components/NoteEditModal';

export default function CreatePlanScreen() {
  const { plans, savePlan, settings } = useApp();

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
      id: Date.now().toString(),
      title: taskInput.trim(),
      done: false,
      priority: selectedPriority,
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
      const aiTasks = await convertParagraphToTasks(paragraphInput);

      // AI'dan gelen görevleri Task formatına çevir
      const newTasks: Task[] = aiTasks.map((title) => ({
        id: Date.now().toString() + Math.random().toString(),
        title,
        done: false,
        priority: 'low' as const,
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

  return (
    <LinearGradient
      colors={settings.darkMode ? ['#2a2d5a', '#1a1a2e', '#0f0f1e'] : ['#667eea', '#764ba2', '#f093fb']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Tarih Seçici */}
          <View style={styles.dateSection}>
            <Text style={styles.label}>📅 Tarih Seçin</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowCalendar(true)}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
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
              <Text style={styles.label}>✨ Planınızı Yazın</Text>
              <View style={[styles.glassCard, { borderWidth: 0 }]}>
                <TextInput
                  style={styles.paragraphInput}
                  placeholder="Örn: Sabah 7'de kalkıp kahvaltı yapacağım..."
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
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
                      colors={isAiLoading || paragraphInput.trim() === '' ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'] : ['#667eea', '#764ba2']}
                      style={styles.sendButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isAiLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.sendIcon}>➜</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          }

          {/* Manuel Görev Ekleme */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>✏️ Manuel Görev Ekle</Text>

            {/* Öncelik Seçici */}
            <View style={styles.prioritySelector}>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  selectedPriority === 'low' && styles.priorityButtonActive,
                  { backgroundColor: selectedPriority === 'low' ? '#4CAF50' : 'rgba(76, 175, 80, 0.3)' }
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
                  { backgroundColor: selectedPriority === 'medium' ? '#FFC107' : 'rgba(255, 193, 7, 0.3)' }
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
                  { backgroundColor: selectedPriority === 'high' ? '#F44336' : 'rgba(244, 67, 54, 0.3)' }
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
              <View style={[styles.glassCard, { flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Alışverişe git"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
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
                  colors={['#667eea', '#764ba2']}
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
              <Text style={styles.label}>📝 Görevler ({tasks.length})</Text>
              {tasks.map((task, index) => {
                const priorityColor =
                  task.priority === 'high' ? '#F44336' :
                    task.priority === 'medium' ? '#FFC107' :
                      '#4CAF50';

                return (
                  <View key={task.id} style={styles.taskItem}>
                    <View style={[styles.glassCard, { borderLeftWidth: 4, borderLeftColor: priorityColor }]}>
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
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          {task.note && <Text style={styles.taskNoteHint}>📝 {task.note}</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRemoveTask(task.id)}
                          style={styles.removeButton}
                        >
                          <Text style={styles.removeButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Not Düzenleme Modalı */}
          <NoteEditModal
            visible={editingNoteTaskId !== null}
            taskTitle={tasks.find(t => t.id === editingNoteTaskId)?.title || ''}
            currentNote={tasks.find(t => t.id === editingNoteTaskId)?.note || ''}
            onSave={(note) => {
              if (editingNoteTaskId) {
                setTasks(prev => prev.map(t => t.id === editingNoteTaskId ? { ...t, note } : t));
              }
            }}
            onDelete={() => {
              if (editingNoteTaskId) {
                setTasks(prev => prev.map(t => t.id === editingNoteTaskId ? { ...t, note: undefined } : t));
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
              colors={tasks.length === 0 ? ['#ccc', '#999'] : ['#4facfe', '#00f2fe']}
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
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  aiToggleButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiToggleGradient: {
    padding: 18,
    alignItems: 'center',
  },
  aiToggleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  aiSection: {
    marginBottom: 20,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  paragraphInput: {
    fontSize: 16,
    color: '#fff',
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
    color: '#fff',
    fontWeight: '700',
  },
  aiButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
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
    shadowOpacity: 0.3,
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
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    backgroundColor: 'rgba(102, 126, 234, 0.8)',
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
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    fontStyle: 'italic',
  },
});
