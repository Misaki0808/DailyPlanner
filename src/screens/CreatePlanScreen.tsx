import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatDateDisplay, getToday, getTomorrow } from '../utils/dateUtils';
import { Task } from '../types';
import { convertParagraphToTasks, checkApiKey } from '../utils/aiService';

export default function CreatePlanScreen() {
  const { plans, savePlan } = useApp();
  
  // State'ler
  const [selectedDate, setSelectedDate] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [paragraphInput, setParagraphInput] = useState(''); // AI için paragraf
  const [isAiLoading, setIsAiLoading] = useState(false); // AI yükleniyor mu?
  const [showAiSection, setShowAiSection] = useState(false); // AI bölümü göster/gizle
  
  // İlk açılışta default tarihi belirle
  useEffect(() => {
    const today = getToday();
    const tomorrow = getTomorrow();
    
    // Eğer bugün için plan yoksa bugün, varsa yarın
    if (plans[today] && plans[today].length > 0) {
      setSelectedDate(tomorrow);
    } else {
      setSelectedDate(today);
    }
  }, [plans]);
  
  // Manuel görev ekle
  const handleAddTask = () => {
    if (taskInput.trim() === '') {
      Alert.alert('Uyarı', 'Lütfen bir görev yazın');
      return;
    }
    
    const newTask: Task = {
      id: Date.now().toString(), // Basit ID üretimi
      title: taskInput.trim(),
      done: false,
    };
    
    setTasks([...tasks, newTask]);
    setTaskInput(''); // Input'u temizle
  };
  
  // Görev sil
  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };
  
  // Planı kaydet
  const handleSavePlan = async () => {
    if (tasks.length === 0) {
      Alert.alert('Uyarı', 'En az bir görev eklemelisiniz');
      return;
    }
    
    try {
      await savePlan(selectedDate, tasks);
      Alert.alert('Başarılı', 'Plan kaydedildi!', [
        {
          text: 'Tamam',
          onPress: () => {
            // Formu temizle
            setTasks([]);
            setTaskInput('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Plan kaydedilemedi');
    }
  };
  
  // Tarihi değiştir (bugün/yarın)
  const toggleDate = () => {
    const today = getToday();
    const tomorrow = getTomorrow();
    setSelectedDate(selectedDate === today ? tomorrow : today);
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
      }));

      setTasks([...tasks, ...newTasks]);
      setParagraphInput(''); // Paragrafı temizle
      setShowAiSection(false); // AI bölümünü kapat
      
      Alert.alert('Başarılı', `${aiTasks.length} görev oluşturuldu! 🎉`);
    } catch (error: any) {
      Alert.alert('AI Hatası', error.message || 'Görevler oluşturulamadı');
    } finally {
      setIsAiLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Tarih Seçici */}
        <View style={styles.dateSection}>
          <Text style={styles.label}>Tarih:</Text>
          <TouchableOpacity style={styles.dateButton} onPress={toggleDate}>
            <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
            <Text style={styles.changeDateText}>Değiştir</Text>
          </TouchableOpacity>
        </View>
        
        {/* AI Bölümü Toggle */}
        <TouchableOpacity
          style={styles.aiToggleButton}
          onPress={() => setShowAiSection(!showAiSection)}
        >
          <Text style={styles.aiToggleText}>
            {showAiSection ? '❌ AI Bölümünü Kapat' : '🤖 AI ile Görev Oluştur'}
          </Text>
        </TouchableOpacity>

        {/* AI Paragraf Input */}
        {showAiSection && (
          <View style={styles.aiSection}>
            <Text style={styles.label}>Planınızı yazın:</Text>
            <TextInput
              style={styles.paragraphInput}
              placeholder="Örn: Sabah 7'de kalkıp kahvaltı yapacağım, sonra spor salonuna gidip 1 saat egzersiz yapacağım..."
              value={paragraphInput}
              onChangeText={setParagraphInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.aiButton, isAiLoading && styles.aiButtonDisabled]}
              onPress={handleAiGenerate}
              disabled={isAiLoading}
            >
              {isAiLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.aiButtonText}>✨ AI ile Görev Oluştur</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Manuel Görev Ekleme */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Manuel Görev Ekle:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Örn: Alışverişe git"
              value={taskInput}
              onChangeText={setTaskInput}
              onSubmitEditing={handleAddTask}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Görev Listesi */}
        {tasks.length > 0 && (
          <View style={styles.taskListSection}>
            <Text style={styles.label}>Görevler ({tasks.length}):</Text>
            {tasks.map((task, index) => (
              <View key={task.id} style={styles.taskItem}>
                <Text style={styles.taskNumber}>{index + 1}.</Text>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveTask(task.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[styles.saveButton, tasks.length === 0 && styles.saveButtonDisabled]}
          onPress={handleSavePlan}
          disabled={tasks.length === 0}
        >
          <Text style={styles.saveButtonText}>💾 Planı Kaydet</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  dateSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  changeDateText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
  },
  taskListSection: {
    marginBottom: 24,
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  aiToggleButton: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiToggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  aiSection: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  paragraphInput: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiButton: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
