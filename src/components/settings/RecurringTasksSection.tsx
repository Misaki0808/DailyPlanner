import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RecurringTask } from '../../types';
import VoiceInputButton from '../VoiceInputButton';
import { useApp } from '../../context/AppContext';
import { createSharedStyles } from '../../utils/sharedStyles';

interface RecurringTasksSectionProps {
  recurringTasks: RecurringTask[];
  onAddRecurringTask: (task: Omit<RecurringTask, 'id' | 'createdAt'>) => Promise<void>;
  onRemoveRecurringTask: (id: string) => Promise<void>;
  onToggleRecurringTask: (id: string) => Promise<void>;
}

const weekDayNames = ['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const frequencyLabels: Record<string, string> = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', flexible: 'Esnek' };

export default function RecurringTasksSection({
  recurringTasks,
  onAddRecurringTask,
  onRemoveRecurringTask,
  onToggleRecurringTask,
}: RecurringTasksSectionProps) {
  const { theme } = useApp();
  const themed = createSharedStyles(theme);

  const [showModal, setShowModal] = useState(false);
  const [rtTitle, setRtTitle] = useState('');
  const [rtPriority, setRtPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [rtFrequency, setRtFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'flexible'>('daily');
  const [rtWeekDays, setRtWeekDays] = useState<number[]>([1]);
  const [rtMonthDay, setRtMonthDay] = useState(1);
  const [rtFlexibleTarget, setRtFlexibleTarget] = useState(2);

  const handleAdd = async () => {
    if (!rtTitle.trim()) {
      Alert.alert('Uyarı', 'Görev adı boş olamaz');
      return;
    }
    await onAddRecurringTask({
      title: rtTitle.trim(),
      priority: rtPriority,
      frequency: rtFrequency,
      weekDays: rtFrequency === 'weekly' ? rtWeekDays : undefined,
      monthDay: rtFrequency === 'monthly' ? rtMonthDay : undefined,
      flexibleTarget: rtFrequency === 'flexible' ? rtFlexibleTarget : undefined,
      isActive: true,
    });
    setRtTitle('');
    setRtPriority('medium');
    setRtFrequency('daily');
    setShowModal(false);
  };

  const renderWeekDaysText = (rt: RecurringTask) => {
    if (rt.weekDays && rt.weekDays.length > 0) {
      const sortedDays = [...rt.weekDays].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
      return ` · ${sortedDays.map(d => weekDayNames[d]).join(', ')}`;
    }
    if (rt.weekDay !== undefined) return ` · ${weekDayNames[rt.weekDay]}`;
    return '';
  };

  return (
    <View style={styles.recurringSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🔁 Tekrarlayan Görevler</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.7}>
          <LinearGradient
            colors={theme.accentGradient}
            style={styles.addBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.addBtnText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {recurringTasks.length === 0 ? (
        <View style={[themed.glassCard]}>
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Henüz tekrarlayan görev yok.{'\n'}Yukarıdaki + butonuyla ekleyebilirsin.
            </Text>
          </View>
        </View>
      ) : (
        recurringTasks.map((rt) => (
          <View key={rt.id} style={[themed.glassCard, styles.cardSpacing]}>
            <View style={styles.recurringItem}>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{rt.title}</Text>
                <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                  {frequencyLabels[rt.frequency]}
                  {rt.frequency === 'weekly' ? renderWeekDaysText(rt) : ''}
                  {rt.frequency === 'monthly' && rt.monthDay ? ` · Her ayın ${rt.monthDay}. günü` : ''}
                  {rt.frequency === 'flexible' && rt.flexibleTarget ? ` · Haftada ${rt.flexibleTarget} defa` : ''}
                  {' · '}
                  {rt.priority === 'high' ? '🔴' : rt.priority === 'medium' ? '🟡' : '🟢'}
                </Text>
              </View>
              <Switch
                value={rt.isActive}
                onValueChange={() => onToggleRecurringTask(rt.id)}
                trackColor={{ false: theme.switchTrackOff, true: theme.switchTrackOn }}
                thumbColor={rt.isActive ? theme.switchThumbOn : theme.switchThumbOff}
              />
              <TouchableOpacity
                onPress={() => onRemoveRecurringTask(rt.id)}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Tekrarlayan Görev Ekleme Modalı */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.modalBackground, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Tekrarlayan Görev Ekle</Text>

            <View style={[styles.modalInputRow, { backgroundColor: theme.accentLight }]}>
              <TextInput
                style={[styles.modalInput, { color: theme.text }]}
                placeholder="Görev adı..."
                placeholderTextColor={theme.textMuted}
                value={rtTitle}
                onChangeText={setRtTitle}
              />
              <VoiceInputButton mode="task" onTranscript={(text) => setRtTitle(text)} />
            </View>

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Sıklık</Text>
            <View style={[styles.freqRow, { flexWrap: 'wrap', gap: 8 }]}>
              {(['daily', 'weekly', 'monthly', 'flexible'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setRtFrequency(f)}
                  style={[
                    styles.freqButton,
                    { backgroundColor: theme.accentLight },
                    rtFrequency === f && { backgroundColor: `${theme.accent}30`, borderColor: theme.accent },
                    { marginBottom: 8 }
                  ]}
                >
                  <Text style={[styles.freqButtonText, { color: theme.textSecondary }, rtFrequency === f && { color: theme.text }]}>
                    {frequencyLabels[f]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {rtFrequency === 'weekly' && (
              <View style={[styles.weekDayRow, { flexWrap: 'wrap', gap: 6 }]}>
                {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                  const name = weekDayNames[dayIndex];
                  const isSelected = rtWeekDays.includes(dayIndex);
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      onPress={() => {
                        if (isSelected) {
                          if (rtWeekDays.length > 1) setRtWeekDays(rtWeekDays.filter(d => d !== dayIndex));
                        } else {
                          setRtWeekDays([...rtWeekDays, dayIndex]);
                        }
                      }}
                      style={[
                        styles.weekDayButton,
                        { backgroundColor: theme.accentLight, marginBottom: 6 },
                        isSelected && { backgroundColor: `${theme.accent}40` }
                      ]}
                    >
                      <Text style={[styles.weekDayText, { color: theme.textSecondary }, isSelected && { color: theme.text }]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {rtFrequency === 'monthly' && (
              <View style={[styles.monthDayRow, { alignItems: 'center' }]}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Her ayın</Text>
                <View style={[styles.stepperContainer, { marginHorizontal: 12, backgroundColor: theme.accentLight, borderColor: theme.border }]}>
                  <TouchableOpacity onPress={() => setRtMonthDay(Math.max(1, rtMonthDay - 1))} style={styles.stepperButton}>
                    <Text style={[styles.stepperButtonText, { color: theme.text }]}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.stepperValueContainer}>
                    <Text style={[styles.stepperValue, { color: theme.text }]}>{rtMonthDay}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setRtMonthDay(Math.min(31, rtMonthDay + 1))} style={styles.stepperButton}>
                    <Text style={[styles.stepperButtonText, { color: theme.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>. günü</Text>
              </View>
            )}

            {rtFrequency === 'flexible' && (
              <View style={[styles.monthDayRow, { alignItems: 'center' }]}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Haftalık Hedef:</Text>
                <View style={[styles.stepperContainer, { marginHorizontal: 12, backgroundColor: theme.accentLight, borderColor: theme.border }]}>
                  <TouchableOpacity onPress={() => setRtFlexibleTarget(Math.max(1, rtFlexibleTarget - 1))} style={styles.stepperButton}>
                    <Text style={[styles.stepperButtonText, { color: theme.text }]}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.stepperValueContainer}>
                    <Text style={[styles.stepperValue, { color: theme.text }]}>{rtFlexibleTarget}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setRtFlexibleTarget(Math.min(6, rtFlexibleTarget + 1))} style={styles.stepperButton}>
                    <Text style={[styles.stepperButtonText, { color: theme.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>gün</Text>
              </View>
            )}

            <Text style={[styles.modalLabel, styles.priorityLabel, { color: theme.textSecondary }]}>Öncelik</Text>
            <View style={styles.freqRow}>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setRtPriority(p)}
                  style={[
                    styles.freqButton,
                    { backgroundColor: theme.accentLight },
                    rtPriority === p && { backgroundColor: `${theme.accent}30`, borderColor: p === 'high' ? theme.priorityHigh : p === 'medium' ? theme.priorityMedium : theme.priorityLow },
                  ]}
                >
                  <Text style={[styles.freqButtonText, { color: theme.textSecondary }]}>
                    {p === 'high' ? '🔴 Yüksek' : p === 'medium' ? '🟡 Orta' : '🟢 Düşük'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalButtonFlex} onPress={() => setShowModal(false)}>
                <View style={[styles.modalCancelBtn, { backgroundColor: theme.accentLight }]}>
                  <Text style={[styles.modalBtnText, { color: theme.text }]}>İptal</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonFlex} onPress={handleAdd}>
                <LinearGradient
                  colors={theme.accentGradient}
                  style={styles.modalSaveBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.modalBtnTextBold}>Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  recurringSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  addBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  cardSpacing: {
    marginBottom: 10,
  },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteBtn: {
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  modalInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  freqButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekDayRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  weekDayButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  priorityLabel: {
    marginTop: 15,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  stepperButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '400',
  },
  stepperValueContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButtonFlex: {
    flex: 1,
  },
  modalCancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalSaveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalBtnText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBtnTextBold: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
});
