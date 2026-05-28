import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import Slider from '@react-native-community/slider';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { AMBIENT_SOUNDS } from '../../hooks/usePomodoroTimer';

interface PomodoroModalsProps {
  isSettingsModalVisible: boolean;
  setIsSettingsModalVisible: (v: boolean) => void;
  isSoundModalVisible: boolean;
  setIsSoundModalVisible: (v: boolean) => void;
  isTaskModalVisible: boolean;
  setIsTaskModalVisible: (v: boolean) => void;
  
  tempFocus: number; setTempFocus: (v: number) => void;
  tempShortBreak: number; setTempShortBreak: (v: number) => void;
  tempLongBreak: number; setTempLongBreak: (v: number) => void;
  
  tempSoundEnabled: boolean; setTempSoundEnabled: (v: boolean) => void;
  selectedAmbient: string; setSelectedAmbient: (v: string) => void;
  ambientVolume: number; setAmbientVolume: (v: number) => void;
  
  savePomodoroSettings: () => void;
  saveSoundSettings: () => void;
  
  sortedTasks: Task[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
}

export function PomodoroModals({
  isSettingsModalVisible, setIsSettingsModalVisible,
  isSoundModalVisible, setIsSoundModalVisible,
  isTaskModalVisible, setIsTaskModalVisible,
  tempFocus, setTempFocus, tempShortBreak, setTempShortBreak, tempLongBreak, setTempLongBreak,
  tempSoundEnabled, setTempSoundEnabled, selectedAmbient, setSelectedAmbient, ambientVolume, setAmbientVolume,
  savePomodoroSettings, saveSoundSettings,
  sortedTasks, selectedTaskId, setSelectedTaskId
}: PomodoroModalsProps) {
  const { theme, settings } = useApp();
  const isDark = settings?.darkMode ?? true;

  return (
    <>
      {/* ── Settings Modal ── */}
      <Modal visible={isSettingsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsSettingsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Süre Ayarları (Dk)</Text>
              <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Odak</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setTempFocus(Math.max(5, tempFocus - 5))} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>-</Text></TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{tempFocus}</Text>
                <TouchableOpacity onPress={() => setTempFocus(tempFocus + 5)} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>+</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Kısa Mola</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setTempShortBreak(Math.max(1, tempShortBreak - 1))} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>-</Text></TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{tempShortBreak}</Text>
                <TouchableOpacity onPress={() => setTempShortBreak(tempShortBreak + 1)} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>+</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Uzun Mola</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setTempLongBreak(Math.max(5, tempLongBreak - 5))} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>-</Text></TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{tempLongBreak}</Text>
                <TouchableOpacity onPress={() => setTempLongBreak(tempLongBreak + 5)} style={[styles.stepperBtn, { borderColor: theme.border }]}><Text style={{ color: theme.text }}>+</Text></TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.saveSettingsButton, { backgroundColor: theme.accent }]} onPress={savePomodoroSettings}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Sound Settings Modal ── */}
      <Modal visible={isSoundModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsSoundModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Ses Ayarları</Text>
              <TouchableOpacity onPress={() => setIsSoundModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Süre Bitiş Zili (Ding)</Text>
              <TouchableOpacity
                style={[styles.toggleButton, { backgroundColor: tempSoundEnabled ? theme.accent : 'transparent', borderColor: tempSoundEnabled ? theme.accent : theme.border }]}
                onPress={() => setTempSoundEnabled(!tempSoundEnabled)}
              >
                <Text style={{ color: tempSoundEnabled ? '#fff' : theme.textSecondary, fontWeight: '600' }}>{tempSoundEnabled ? 'AÇIK' : 'KAPALI'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.settingLabel, { color: theme.text, marginTop: 10, marginBottom: 15 }]}>Arka Plan Sesi</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {AMBIENT_SOUNDS.map(s => (
                <TouchableOpacity key={s.id} style={[styles.soundOption, { borderColor: theme.border }, selectedAmbient === s.id && { borderColor: theme.accent, backgroundColor: theme.accent + '20' }]} onPress={() => setSelectedAmbient(s.id)}>
                  <Text style={{ color: theme.text, fontSize: 14 }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedAmbient !== 'none' && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: theme.textMuted, marginBottom: 10, fontSize: 13 }}>Ses Seviyesi</Text>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0} maximumValue={1}
                  value={ambientVolume} onValueChange={setAmbientVolume}
                  minimumTrackTintColor={theme.accent} maximumTrackTintColor={theme.border} thumbTintColor={theme.accent}
                />
              </View>
            )}

            <TouchableOpacity style={[styles.saveSettingsButton, { backgroundColor: theme.accent }]} onPress={saveSoundSettings}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Task Select Modal ── */}
      <Modal visible={isTaskModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsTaskModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Görev Seç</Text>
              <TouchableOpacity onPress={() => setIsTaskModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={{ color: theme.textMuted, fontSize: 16 }}>Kapat</Text>
              </TouchableOpacity>
            </View>
            
            {sortedTasks.length === 0 ? (
              <View style={styles.emptyTaskContainer}>
                <Text style={[styles.emptyTaskText, { color: theme.textMuted }]}>Bugün için tamamlanmamış görev bulunmuyor. 🎉</Text>
              </View>
            ) : (
              <FlatList
                data={sortedTasks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.taskItem, { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }, selectedTaskId === item.id && { borderColor: theme.accent, backgroundColor: theme.accent + '15' }]}
                    onPress={() => { setSelectedTaskId(item.id); setIsTaskModalVisible(false); }}
                  >
                    <View>
                      <Text style={[styles.taskTitle, { color: theme.text }]}>{item.title}</Text>
                      <Text style={[styles.taskSub, { color: theme.textMuted }]}>{item.category ? `📁 ${item.category}` : 'Genel'} • {item.pomodoroCount || 0} Pomodoro</Text>
                    </View>
                    {selectedTaskId === item.id && <Text style={{ color: theme.accent, fontWeight: '700' }}>Seçili</Text>}
                  </TouchableOpacity>
                )}
              />
            )}
            
            <TouchableOpacity style={[styles.modalClearButton, { borderColor: theme.border }]} onPress={() => { setSelectedTaskId(null); setIsTaskModalVisible(false); }}>
              <Text style={{ color: theme.textSecondary }}>Bağlantıyı Kaldır (Serbest Odak)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, maxHeight: '70%', padding: 24,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalCloseButton: { padding: 4 },
  emptyTaskContainer: { padding: 30, alignItems: 'center' },
  emptyTaskText: { fontSize: 14, textAlign: 'center' },
  taskItem: {
    padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  taskTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  taskSub: { fontSize: 12 },
  modalClearButton: {
    marginTop: 10, padding: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  stepperVal: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  saveSettingsButton: {
    marginTop: 10, padding: 16, borderRadius: 12, alignItems: 'center',
  },
  toggleButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  soundOption: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
  },
});
