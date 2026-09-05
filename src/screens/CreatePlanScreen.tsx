import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlansContext, useSettingsContext, useUserContext } from '../context/AppContext';
import { formatDateDisplay, generateId } from '../utils/dateUtils';
import { findFirstEmptyDate } from '../utils/planUtils';
import { Task } from '../types';
import { convertParagraphToTasks } from '../utils/aiService';
import { extractTimesLocal } from '../utils/timeParser';
import { scheduleAlarmNotification, requestNotificationPermissions } from '../utils/notificationService';
import CalendarModal from '../components/CalendarModal';
import SuccessModal from '../components/SuccessModal';
import VoiceInputButton from '../components/VoiceInputButton';
import { createSharedStyles } from '../utils/sharedStyles';
import TaskEditModal from '../components/TaskEditModal';
import { getCategoryEmoji, getCategoryLabel, getCategoryColor } from '../utils/categories';

import { styles } from './styles/CreatePlanScreen.styles';

export default function CreatePlanScreen() {
  const { plans, savePlan } = usePlansContext();
  const { settings, theme } = useSettingsContext();
  const { aboutMe } = useUserContext();
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
  const [isSaving, setIsSaving] = useState(false);
  const voiceBaseTextRef = useRef(''); // Sesli giriş öncesi mevcut metin
  const defaultDatePickedRef = useRef(false);

  // Varsayılan tarih YALNIZ ilk açılışta belirlenir. Bu efekt daha önce her
  // `plans` değişiminde çalışıyordu; başka bir ekranda görev işaretlemek ya da
  // bir pomodoro bitmek bile kullanıcının seçtiği günü sessizce değiştirip
  // görevlerin yanlış güne kaydedilmesine yol açıyordu.
  useEffect(() => {
    if (defaultDatePickedRef.current) return;
    defaultDatePickedRef.current = true;
    setSelectedDate(findFirstEmptyDate(plans));
  }, [plans]);

  // Manuel görev ekle
  const handleAddTask = () => {
    if (taskInput.trim() === '') {
      Toast.show({ type: 'info', text1: 'Uyarı', text2: 'Lütfen bir görev yazın' });
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
      Toast.show({ type: 'info', text1: 'Uyarı', text2: 'En az bir görev eklemelisiniz' });
      return;
    }
    if (isSaving) return; // Çift dokunuşta görevler iki kez eklenmesin

    setIsSaving(true);
    try {
      // Seçilen günde zaten görev varsa üzerine YAZMA; ekle. Kullanıcı dolu bir
      // günü elle seçtiğinde eski görevleri sessizce siliyorduk.
      const existingTasks = plans[selectedDate] || [];
      await savePlan(selectedDate, [...existingTasks, ...tasks]);
      // Başarı modal'ını göster
      setSavedDate(selectedDate);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Plan kaydedilirken hata:', error);
      Toast.show({ type: 'error', text1: 'Hata', text2: 'Plan kaydedilemedi' });
    } finally {
      setIsSaving(false);
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
    // Kaydetmenin ardından bir sonraki boş güne geç
    setSelectedDate(findFirstEmptyDate(plans));
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
    const input = paragraphInput.trim();
    if (input === '') {
      Alert.alert('Uyarı', 'Lütfen bir paragraf yazın');
      return;
    }

    setIsAiLoading(true);

    try {
      const aiTasks = await convertParagraphToTasks(input, aboutMe || undefined);
      const usedFallback = Boolean(aiTasks.usedFallback);

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

      // Metinden saat referanslarını çıkar ve alarm kur
      try {
        const times = extractTimesLocal(input);
        if (times.length > 0) {
          const hasPermission = await requestNotificationPermissions();
          if (hasPermission) {
            const now = new Date();
            let alarmsSet = 0;
            for (const t of times) {
              const alarmDate = new Date();
              // Seçilen tarihe göre ayarla
              const [year, month, day] = selectedDate.split('-').map(Number);
              alarmDate.setFullYear(year, month - 1, day);
              alarmDate.setHours(t.hour, t.minute, 0, 0);
              if (alarmDate > now) {
                await scheduleAlarmNotification(`⏰ ${t.label}`, `Planlanan saat: ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`, alarmDate);
                alarmsSet++;
              }
            }
            if (alarmsSet > 0) {
              Toast.show({
                type: 'success',
                text1: usedFallback ? 'Basit ayrıştırma' : 'Başarılı',
                text2: usedFallback
                  ? `AI kullanılamadı, ${aiTasks.length} görev ve ${alarmsSet} alarm kuruldu.`
                  : `${aiTasks.length} görev ve ${alarmsSet} alarm kuruldu! ⏰`,
              });
            } else {
              Toast.show({
                type: 'success',
                text1: usedFallback ? 'Basit ayrıştırma' : 'Başarılı',
                text2: usedFallback
                  ? `AI kullanılamadı, ${aiTasks.length} görev basitçe ayrıştırıldı.`
                  : `${aiTasks.length} görev oluşturuldu! 🎉`,
              });
            }
          } else {
            Toast.show({
              type: 'success',
              text1: usedFallback ? 'Basit ayrıştırma' : 'Başarılı',
              text2: usedFallback
                ? `AI kullanılamadı, ${aiTasks.length} görev basitçe ayrıştırıldı.`
                : `${aiTasks.length} görev oluşturuldu! 🎉`,
            });
          }
        } else {
          Toast.show({
            type: 'success',
            text1: usedFallback ? 'Basit ayrıştırma' : 'Başarılı',
            text2: usedFallback
              ? `AI kullanılamadı, ${aiTasks.length} görev basitçe ayrıştırıldı.`
              : `${aiTasks.length} görev oluşturuldu! 🎉`,
          });
        }
      } catch (e) {
        // Alarm kurulamazsa sadece görev başarı mesajı göster
        console.warn('Alarm kurulamadı:', e);
        Toast.show({
          type: 'success',
          text1: usedFallback ? 'Basit ayrıştırma' : 'Başarılı',
          text2: usedFallback
            ? `AI kullanılamadı, ${aiTasks.length} görev basitçe ayrıştırıldı.`
            : `${aiTasks.length} görev oluşturuldu! 🎉`,
        });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'AI Hatası', text2: error.message || 'Görevler oluşturulamadı' });
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
            style={[styles.saveButton, (tasks.length === 0 || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSavePlan}
            disabled={tasks.length === 0 || isSaving}
            accessibilityRole="button"
            accessibilityState={{ disabled: tasks.length === 0 || isSaving }}
            accessibilityLabel={isSaving ? 'Plan kaydediliyor' : `Planı kaydet, ${tasks.length} görev`}
          >
            <LinearGradient
              colors={(tasks.length === 0 || isSaving) ? [theme.textMuted, theme.textMuted] : (theme.successGradient as [string, string])}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveButtonText}>{isSaving ? '💾 Kaydediliyor...' : '💾 Planı Kaydet'}</Text>
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

